import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
// The override variables exist only so the mutation checks can point the tests at mutant copies.
const publishPath =
  process.env.PUBLISH_WORKFLOW_PATH ??
  join(repo, '.github', 'workflows', 'publish.yml');
const workflowsDir =
  process.env.WORKFLOWS_DIR ?? join(repo, '.github', 'workflows');
const releasercPath =
  process.env.RELEASERC_PATH ?? join(repo, '.releaserc.json');
const releasingPath =
  process.env.RELEASING_PATH ?? join(repo, 'docs', 'RELEASING.md');
const planScript =
  process.env.PUBLISH_PLAN_SCRIPT ?? join(repo, 'scripts', 'publish-plan.sh');
const smokeScript =
  process.env.SMOKE_SCRIPT ?? join(repo, 'scripts', 'smoke-image.sh');
// The runbook has no override: the link check always reads the repository copy.
const runbookPath = join(here, '..', 'deploy', 'RUNBOOK.md');

const PAIR_BUILD = 'docker/build-push-action@';

function loadPublish() {
  return parse(readFileSync(publishPath, 'utf8'));
}

// Glob to regular expression: ** is any text, * is any text except /, the match is anchored.
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      re += '.*';
      i++;
    } else if (c === '*') {
      re += '[^/]*';
    } else {
      re += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

// On the parsed key `on`: a string or an array of names becomes an object with those keys.
function normaliseOn(on) {
  if (typeof on === 'string') return { [on]: null };
  if (Array.isArray(on))
    return Object.fromEntries(on.map((name) => [name, null]));
  return on ?? {};
}

function stepsOf(job) {
  return job.steps ?? [];
}

function needsOf(job) {
  return job.needs === undefined ? [] : [].concat(job.needs);
}

function isBuildPush(step) {
  return String(step.uses ?? '').startsWith(PAIR_BUILD);
}

test('W1 triggers are push to main and workflow_dispatch, with the paths-ignore list', () => {
  const on = normaliseOn(loadPublish().on);
  assert.deepEqual(
    Object.keys(on).sort(),
    ['push', 'workflow_dispatch'],
    'W1: on has exactly push and workflow_dispatch',
  );
  assert.deepEqual(on.push.branches, ['main'], 'W1: push.branches is main');
  assert.ok(
    !('tags' in on.push) && !('tags-ignore' in on.push),
    'W1: push has no tags or tags-ignore key',
  );
  for (const bad of ['release', 'workflow_run', 'workflow_call']) {
    assert.ok(!(bad in on), `W1: there is no ${bad} trigger`);
  }
  const ignored = [
    'README.md',
    'LICENSE',
    '.gitignore',
    'docs/**',
    'modules/**',
    'plans/**',
    'units/**',
  ];
  assert.deepEqual(
    on.push['paths-ignore'],
    ignored,
    'W1: push.paths-ignore is the D18 list',
  );
  const samples = [
    'deploy/RUNBOOK.md',
    'Dockerfile',
    'scripts/entrypoint.sh',
    'packages/packs/src/x.md',
    'apps/api/src/modules/platform/x.ts',
    '.github/workflows/publish.yml',
  ];
  for (const path of samples) {
    const matched = ignored.some((glob) => globToRegExp(glob).test(path));
    assert.equal(matched, false, `W1: ${path} must not match paths-ignore`);
  }
});

test('W2 the five jobs, their needs chain, and the two native build and smoke matrices', () => {
  const jobs = loadPublish().jobs;
  for (const name of ['plan', 'build', 'smoke', 'merge', 'release']) {
    assert.ok(jobs[name], `W2: job ${name} exists`);
  }
  assert.deepEqual(needsOf(jobs.plan), [], 'W2: plan has no needs');
  assert.ok(needsOf(jobs.build).includes('plan'), 'W2: build needs plan');
  assert.ok(needsOf(jobs.smoke).includes('build'), 'W2: smoke needs build');
  assert.ok(needsOf(jobs.merge).includes('smoke'), 'W2: merge needs smoke');
  assert.ok(needsOf(jobs.release).includes('merge'), 'W2: release needs merge');
  for (const name of ['build', 'smoke']) {
    const pairs = (jobs[name].strategy?.matrix?.include ?? [])
      .map((e) => `${e.platform} ${e.runner} ${e.node_arch}`)
      .sort();
    assert.deepEqual(
      pairs,
      ['linux/amd64 ubuntu-24.04 x64', 'linux/arm64 ubuntu-24.04-arm arm64'],
      `W2: the ${name} matrix has the two native pairs`,
    );
    assert.equal(
      jobs[name].strategy['fail-fast'],
      false,
      `W2: the ${name} matrix has fail-fast false`,
    );
  }
});

test('W3 the if conditions of merge, release and the gated jobs, and the concurrency block', () => {
  const wf = loadPublish();
  const jobs = wf.jobs;
  const mainRef = "github.ref == 'refs/heads/main'";
  assert.ok(
    String(jobs.merge.if).includes(mainRef),
    'W3: merge.if requires refs/heads/main',
  );
  assert.ok(
    String(jobs.release.if).includes(mainRef),
    'W3: release.if requires refs/heads/main',
  );
  assert.ok(
    String(jobs.release.if).includes("needs.plan.outputs.release == 'true'"),
    "W3: release.if requires needs.plan.outputs.release == 'true'",
  );
  assert.ok(
    !String(jobs.merge.if).includes('needs.plan.outputs.release'),
    'W3: merge has no condition on release',
  );
  assert.ok(
    String(wf.concurrency.group).includes('github.ref'),
    'W3: concurrency.group contains github.ref',
  );
  assert.equal(
    wf.concurrency['cancel-in-progress'],
    false,
    'W3: concurrency.cancel-in-progress is false',
  );
  for (const name of ['smoke', 'merge', 'release']) {
    const cond = String(jobs[name].if ?? '');
    for (const fn of ['always()', 'failure()', 'cancelled()']) {
      assert.ok(!cond.includes(fn), `W3: ${name}.if does not contain ${fn}`);
    }
  }
});

test('W4 the build step is untagged and only merge calls publish-merge.sh', () => {
  const jobs = loadPublish().jobs;
  const push = stepsOf(jobs.build).find(isBuildPush);
  assert.ok(push, 'W4: build has a docker/build-push-action step');
  assert.ok(
    String(push.with?.outputs ?? '').includes('push-by-digest=true'),
    'W4: its outputs contain push-by-digest=true',
  );
  assert.equal(
    push.with?.tags,
    undefined,
    'W4: the build step has no tags key',
  );
  const forbidden = [
    'imagetools create',
    'docker push',
    'docker tag',
    'publish-merge.sh',
  ];
  for (const name of ['plan', 'build', 'smoke', 'release']) {
    for (const step of stepsOf(jobs[name])) {
      for (const text of forbidden) {
        assert.ok(
          !String(step.run ?? '').includes(text),
          `W4: a run step of ${name} does not contain ${text}`,
        );
      }
    }
  }
  const mergeCalls = stepsOf(jobs.merge).filter((s) =>
    String(s.run ?? '').includes('publish-merge.sh'),
  );
  assert.equal(
    mergeCalls.length,
    1,
    'W4: merge has exactly one publish-merge.sh call',
  );
  const text =
    readFileSync(planScript, 'utf8') + readFileSync(smokeScript, 'utf8');
  for (const item of ['imagetools create', 'docker push', 'docker tag']) {
    assert.ok(
      !text.includes(item),
      `W4: publish-plan.sh and smoke-image.sh do not contain ${item}`,
    );
  }
});

test('W5 the build args, the per-arch GHA cache, and provenance false', () => {
  const push = stepsOf(loadPublish().jobs.build).find(isBuildPush);
  const lines = String(push.with['build-args'])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  assert.ok(
    lines.includes('VERSION=${{ needs.plan.outputs.version }}'),
    'W5: build-args sets VERSION from plan',
  );
  assert.ok(
    lines.includes('REVISION=${{ needs.plan.outputs.short }}'),
    'W5: build-args sets REVISION from plan',
  );
  assert.ok(
    lines.includes('BUILT_AT=${{ needs.plan.outputs.built_at }}'),
    'W5: build-args sets BUILT_AT from plan',
  );
  for (const key of ['cache-from', 'cache-to']) {
    const value = String(push.with[key]);
    assert.ok(value.includes('type=gha'), `W5: ${key} is a GHA cache`);
    assert.ok(
      value.includes('scope=${{ env.PLATFORM_PAIR }}'),
      `W5: ${key} has the per-arch scope`,
    );
  }
  assert.equal(push.with.provenance, false, 'W5: provenance is false');
});

test('W6 semantic-release is a dry run everywhere except release, which tags after merge', () => {
  const jobs = loadPublish().jobs;
  const calls = [];
  for (const [name, job] of Object.entries(jobs)) {
    for (const step of stepsOf(job)) {
      const run = String(step.run ?? '');
      if (run.includes('semantic-release'))
        calls.push({ name, run, env: step.env ?? {} });
    }
  }
  const real = calls.filter((c) => !c.run.includes('--dry-run'));
  assert.ok(
    real.length >= 1,
    'W6: a semantic-release call without --dry-run exists',
  );
  assert.ok(
    real.every((c) => c.name === 'release'),
    'W6: the only call without --dry-run is in release',
  );
  assert.ok(
    calls
      .filter((c) => c.name !== 'release')
      .every((c) => c.run.includes('--dry-run')),
    'W6: every semantic-release call outside release is a dry run',
  );
  assert.ok(
    calls.some((c) => c.name === 'plan' && c.run.includes('--dry-run')),
    'W6: the plan job calls semantic-release with --dry-run',
  );
  for (const [name, job] of Object.entries(jobs)) {
    if (name === 'release') continue;
    for (const step of stepsOf(job)) {
      assert.ok(
        !String(step.run ?? '').includes('git tag'),
        `W6: no ${name} step creates a git tag`,
      );
    }
  }
  const steps = stepsOf(jobs.release);
  const callIdx = steps.findIndex(
    (s) =>
      String(s.run ?? '').includes('semantic-release') &&
      !String(s.run).includes('--dry-run'),
  );
  assert.ok(callIdx >= 0, 'W6: release has the real semantic-release step');
  assert.equal(
    steps[callIdx].env?.SCRIBA_EXPECT_VERSION,
    '${{ needs.plan.outputs.version }}',
    'W6: the release step sets SCRIBA_EXPECT_VERSION from plan',
  );
  const tagIdx = steps.findIndex((s) =>
    String(s.run ?? '').includes('git/ref/tags/v$VERSION'),
  );
  const viewIdx = steps.findIndex((s) =>
    String(s.run ?? '').includes('gh release view'),
  );
  assert.ok(tagIdx > callIdx, 'W6: a later release step reads the git tag');
  assert.ok(viewIdx > callIdx, 'W6: a later release step runs gh release view');
});

test('W7 no workflow starts on a tag, and publish.yml uses only the allowed secrets and permissions', () => {
  for (const file of readdirSync(workflowsDir).filter((f) =>
    /\.ya?ml$/.test(f),
  )) {
    const wf = parse(readFileSync(join(workflowsDir, file), 'utf8'));
    const on = normaliseOn(wf.on);
    for (const bad of ['create', 'release', 'workflow_run']) {
      assert.ok(!(bad in on), `W7 (a): ${file} has no ${bad} trigger`);
    }
    if ('push' in on) {
      const push = on.push ?? {};
      assert.ok(
        Array.isArray(push.branches) && push.branches.length > 0,
        `W7 (a): ${file} push has a non-empty branches list`,
      );
      assert.ok(
        !('tags' in push) && !('tags-ignore' in push),
        `W7 (a): ${file} push has no tags or tags-ignore`,
      );
    }
  }
  const text = readFileSync(publishPath, 'utf8');
  const wf = parse(text);
  const allowed = new Set([
    'GITHUB_TOKEN',
    'DOCKERHUB_USERNAME',
    'DOCKERHUB_TOKEN',
  ]);
  for (const m of text.matchAll(/secrets\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
    assert.ok(
      allowed.has(m[1]),
      `W7 (b): publish.yml uses secrets.${m[1]}, which is not an allowed secret`,
    );
  }
  for (const re of [
    /\bPAT\b/,
    /app-id/,
    /private-key/,
    /create-github-app-token/,
  ]) {
    assert.ok(!re.test(text), `W7 (b): publish.yml text does not match ${re}`);
  }
  assert.deepEqual(
    wf.permissions,
    { contents: 'read' },
    'W7 (b): workflow permissions are exactly contents: read',
  );
  for (const [name, job] of Object.entries(wf.jobs)) {
    if (name === 'plan' || name === 'release') {
      assert.deepEqual(
        job.permissions,
        { contents: 'write' },
        `W7 (b): ${name} permissions are exactly contents: write`,
      );
    } else {
      assert.equal(
        job.permissions,
        undefined,
        `W7 (b): ${name} has no permissions key`,
      );
    }
  }
});

test('W8 the release config has the branch, the tag format, and exactly the four plugins', () => {
  const rc = JSON.parse(readFileSync(releasercPath, 'utf8'));
  assert.deepEqual(rc.branches, ['main'], 'W8: branches is main');
  assert.equal(rc.tagFormat, 'v${version}', 'W8: tagFormat is v${version}');
  const names = rc.plugins.map((p) => (Array.isArray(p) ? p[0] : p));
  assert.deepEqual(
    names,
    [
      '@semantic-release/commit-analyzer',
      '@semantic-release/release-notes-generator',
      './scripts/release-guard.mjs',
      '@semantic-release/github',
    ],
    'W8: the plugins are the four of D3 in order',
  );
  assert.ok(
    !names.some((n) => /\/(git|npm|changelog|exec)$/.test(n)),
    'W8: no git, npm, changelog or exec plugin',
  );
  assert.deepEqual(
    rc.plugins[3][1],
    {
      successComment: false,
      failComment: false,
      failTitle: false,
      releasedLabels: false,
    },
    'W8: the github plugin has the four false options',
  );
});

test('W9 the smoke job resolves SMOKE_IMAGE and runs smoke-image.sh per arch with the plan values', () => {
  const smoke = loadPublish().jobs.smoke;
  const pairs = (smoke.strategy?.matrix?.include ?? [])
    .map((e) => `${e.runner} ${e.platform}`)
    .sort();
  assert.deepEqual(
    pairs,
    ['ubuntu-24.04 linux/amd64', 'ubuntu-24.04-arm linux/arm64'],
    'W9: the smoke matrix has the two native pairs',
  );
  const steps = stepsOf(smoke);
  const resolveIdx = steps.findIndex(
    (s) =>
      String(s.run ?? '').includes('SMOKE_IMAGE=$REGISTRY_IMAGE@sha256:') &&
      String(s.run).includes('GITHUB_ENV'),
  );
  const runIdx = steps.findIndex((s) =>
    String(s.run ?? '').includes('scripts/smoke-image.sh "$SMOKE_IMAGE"'),
  );
  assert.ok(
    resolveIdx >= 0,
    'W9: a step sets SMOKE_IMAGE from $REGISTRY_IMAGE@sha256: and the digest',
  );
  assert.ok(
    runIdx >= 0,
    'W9: a step runs scripts/smoke-image.sh "$SMOKE_IMAGE"',
  );
  assert.ok(
    resolveIdx < runIdx,
    'W9: SMOKE_IMAGE is set by a step before the smoke run',
  );
  const env = steps[runIdx].env ?? {};
  assert.equal(
    env.EXPECTED_VERSION,
    '${{ needs.plan.outputs.version }}',
    'W9: EXPECTED_VERSION from plan',
  );
  assert.equal(
    env.EXPECTED_PIN,
    '${{ needs.plan.outputs.pin }}',
    'W9: EXPECTED_PIN from plan',
  );
  assert.equal(
    env.EXPECTED_ARCH,
    '${{ matrix.node_arch }}',
    'W9: EXPECTED_ARCH from the matrix',
  );
});

test('W10 publish.yml hygiene: no event text in run steps, uses pinned to a major, Docker Hub credentials from the two secrets', () => {
  const jobs = loadPublish().jobs;
  for (const [name, job] of Object.entries(jobs)) {
    for (const step of stepsOf(job)) {
      const run = String(step.run ?? '');
      assert.ok(
        !run.includes('${{ github.event'),
        `W10: a run step of ${name} does not use github.event`,
      );
      assert.ok(
        !run.includes('${{ github.head_ref'),
        `W10: a run step of ${name} does not use github.head_ref`,
      );
      if (step.uses) {
        assert.match(
          String(step.uses),
          /@v\d+$/,
          `W10: ${step.uses} is pinned to a major tag`,
        );
      }
      if (String(step.uses ?? '').startsWith('docker/login-action@')) {
        assert.equal(
          step.with?.username,
          '${{ secrets.DOCKERHUB_USERNAME }}',
          `W10: ${name} login takes the username from the secret`,
        );
        assert.equal(
          step.with?.password,
          '${{ secrets.DOCKERHUB_TOKEN }}',
          `W10: ${name} login takes the password from the secret`,
        );
      }
    }
  }
});

test('W11 docs/RELEASING.md links the runbook checklist and states the release rules', () => {
  const doc = readFileSync(releasingPath, 'utf8');
  const runbook = readFileSync(runbookPath, 'utf8');
  assert.ok(
    doc.includes('../deploy/RUNBOOK.md#pre-release-checklist'),
    'W11: the doc links ../deploy/RUNBOOK.md#pre-release-checklist',
  );
  assert.ok(
    runbook.split('\n').includes('## Pre-release checklist'),
    'W11: deploy/RUNBOOK.md has the heading ## Pre-release checklist',
  );
  assert.ok(
    doc.includes('DOCKERHUB_USERNAME') && doc.includes('DOCKERHUB_TOKEN'),
    'W11: the doc names both secrets',
  );
  assert.ok(
    doc.includes('1.0.0'),
    'W11: the doc states the first version 1.0.0 (O2)',
  );
  assert.ok(
    doc.includes('BREAKING CHANGE:'),
    'W11: the doc contains BREAKING CHANGE: (O3)',
  );
  const lines = doc.split('\n');
  const head = lines.findIndex((l) => /^#+ .*Known limit/.test(l));
  assert.ok(head >= 0, 'W11: the doc has a heading that contains Known limit');
  assert.ok(
    lines.slice(head).join('\n').includes('pending'),
    'W11: the Known limit section names the pending run (D10)',
  );
});

test('W12 the wiring between jobs: plan outputs, the plan file, merge and release inputs, the digest hand-off, and PLATFORM_PAIR', () => {
  const text = readFileSync(publishPath, 'utf8');
  const jobs = parse(text).jobs;
  const keys = ['release', 'version', 'pin', 'short', 'built_at'];
  // (i)
  assert.deepEqual(
    Object.keys(jobs.plan.outputs ?? {}).sort(),
    [...keys].sort(),
    'W12 (i): plan.outputs has exactly the five keys',
  );
  for (const key of keys) {
    assert.equal(
      jobs.plan.outputs[key],
      `\${{ steps.plan.outputs.${key} }}`,
      `W12 (i): plan.outputs.${key} reads the plan step`,
    );
  }
  // (ii)
  const planStep = stepsOf(jobs.plan).find((s) => s.id === 'plan');
  assert.ok(
    planStep &&
      String(planStep.run).includes('scripts/publish-plan.sh') &&
      String(planStep.run).includes('>> "$GITHUB_OUTPUT"'),
    'W12 (ii): the plan step with id plan runs publish-plan.sh and appends to $GITHUB_OUTPUT',
  );
  // (iii)
  const dryRun = stepsOf(jobs.plan).find(
    (s) => s.env?.SCRIBA_PLAN_OUT !== undefined,
  );
  const match = /^\$\{\{ runner\.temp \}\}\/(.+)$/.exec(
    String(dryRun?.env?.SCRIBA_PLAN_OUT ?? ''),
  );
  assert.ok(match, 'W12 (iii): SCRIBA_PLAN_OUT is ${{ runner.temp }}/<name>');
  assert.ok(
    String(planStep?.run).includes(`"$RUNNER_TEMP/${match[1]}"`),
    'W12 (iii): publish-plan.sh is given the file that SCRIBA_PLAN_OUT names',
  );
  // (iv)
  const mergeCall = stepsOf(jobs.merge).find((s) =>
    String(s.run ?? '').includes('publish-merge.sh'),
  );
  assert.equal(
    mergeCall?.env?.SHORT,
    '${{ needs.plan.outputs.short }}',
    'W12 (iv): merge SHORT reads plan short',
  );
  assert.equal(
    mergeCall?.env?.RELEASE,
    '${{ needs.plan.outputs.release }}',
    'W12 (iv): merge RELEASE reads plan release',
  );
  assert.equal(
    mergeCall?.env?.VERSION,
    '${{ needs.plan.outputs.version }}',
    'W12 (iv): merge VERSION reads plan version',
  );
  // (v)
  const releaseSteps = stepsOf(jobs.release);
  assert.ok(
    releaseSteps.some(
      (s) =>
        s.env?.SCRIBA_EXPECT_VERSION === '${{ needs.plan.outputs.version }}',
    ),
    'W12 (v): a release step sets SCRIBA_EXPECT_VERSION from plan version',
  );
  assert.ok(
    releaseSteps.some(
      (s) => s.env?.VERSION === '${{ needs.plan.outputs.version }}',
    ),
    'W12 (v): a release step sets VERSION from plan version',
  );
  // (vi)
  const upload = stepsOf(jobs.build).find((s) =>
    String(s.uses ?? '').startsWith('actions/upload-artifact@'),
  );
  assert.equal(
    upload?.with?.name,
    'digests-${{ env.PLATFORM_PAIR }}',
    'W12 (vi): build uploads digests-${{ env.PLATFORM_PAIR }}',
  );
  assert.equal(
    upload?.with?.path,
    '/tmp/digests/*',
    'W12 (vi): build uploads /tmp/digests/*',
  );
  const smokeDownload = stepsOf(jobs.smoke).find((s) =>
    String(s.uses ?? '').startsWith('actions/download-artifact@'),
  );
  assert.equal(
    smokeDownload?.with?.name,
    'digests-${{ env.PLATFORM_PAIR }}',
    'W12 (vi): smoke downloads its own digests artifact',
  );
  assert.equal(
    smokeDownload?.with?.path,
    '/tmp/digests',
    'W12 (vi): smoke downloads into /tmp/digests',
  );
  const mergeDownload = stepsOf(jobs.merge).find((s) =>
    String(s.uses ?? '').startsWith('actions/download-artifact@'),
  );
  assert.equal(
    mergeDownload?.with?.pattern,
    'digests-*',
    'W12 (vi): merge downloads with pattern digests-*',
  );
  assert.equal(
    mergeDownload?.with?.['merge-multiple'],
    true,
    'W12 (vi): merge sets merge-multiple',
  );
  assert.equal(
    mergeDownload?.with?.path,
    '/tmp/digests',
    'W12 (vi): merge downloads into /tmp/digests',
  );
  assert.ok(
    String(mergeCall?.run).includes('publish-merge.sh /tmp/digests'),
    'W12 (vi): merge passes /tmp/digests to publish-merge.sh',
  );
  // (vii)
  const buildSteps = stepsOf(jobs.build);
  const push = buildSteps.find(isBuildPush);
  const pushIdx = buildSteps.indexOf(push);
  const exportIdx = buildSteps.findIndex((s) =>
    String(s.run ?? '').includes('touch "/tmp/digests/${DIGEST#sha256:}"'),
  );
  assert.ok(push?.id, 'W12 (vii): the build-push step has an id');
  assert.ok(
    exportIdx >= 0 && exportIdx > pushIdx,
    'W12 (vii): the digest export step comes after the build-push step',
  );
  assert.equal(
    buildSteps[exportIdx]?.env?.DIGEST,
    `\${{ steps.${push?.id}.outputs.digest }}`,
    'W12 (vii): the export step reads the digest of the build-push step',
  );
  // (viii)
  for (const name of ['build', 'smoke']) {
    const steps = stepsOf(jobs[name]);
    const prep = steps.findIndex(
      (s) =>
        s.env?.PLATFORM === '${{ matrix.platform }}' &&
        String(s.run ?? '').includes('PLATFORM_PAIR=${PLATFORM//\\//-}') &&
        String(s.run ?? '').includes('>> "$GITHUB_ENV"'),
    );
    assert.ok(
      prep >= 0,
      `W12 (viii): ${name} has a step that sets PLATFORM_PAIR`,
    );
    steps.forEach((s, i) => {
      if (JSON.stringify(s.with ?? {}).includes('${{ env.PLATFORM_PAIR }}')) {
        assert.ok(
          prep < i,
          `W12 (viii): step ${i} of ${name} uses PLATFORM_PAIR after it is set`,
        );
      }
    });
  }
  for (const m of text.matchAll(/needs\.plan\.outputs\.([A-Za-z_]+)/g)) {
    assert.ok(
      keys.includes(m[1]),
      `W12 (i): needs.plan.outputs.${m[1]} names a key of plan`,
    );
  }
});
