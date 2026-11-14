import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makeStubDocker, runScript, tempDir } from './publish-test-kit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
// The override variables exist only so the mutation checks can point the tests at mutant copies.
const planScript = process.env.PUBLISH_PLAN_SCRIPT ?? join(here, 'publish-plan.sh');
const mergeScript = process.env.PUBLISH_MERGE_SCRIPT ?? join(here, 'publish-merge.sh');
const guardPath = process.env.RELEASE_GUARD_PATH ?? join(here, 'release-guard.mjs');

const SHA = '0123456789abcdef0123456789abcdef01234567';
const SHORT = '0123456';
const BUILT = '2026-11-14T10:00:00Z';
const REGISTRY = 'docker.io/bbartolome/scriba';
const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);
const MANIFEST_OK = {
  manifests: [
    { platform: { os: 'linux', architecture: 'amd64' } },
    { platform: { os: 'linux', architecture: 'arm64' } },
  ],
};
const AMD64 = { platform: { os: 'linux', architecture: 'amd64' } };
const ARM64 = { platform: { os: 'linux', architecture: 'arm64' } };

// ---- publish-plan.sh (P1 to P5) ----

function runPlan(fileContent, env) {
  const dir = tempDir();
  const file = join(dir, 'next-version');
  if (fileContent !== null) writeFileSync(file, fileContent);
  return runScript(planScript, [file], env, tempDir());
}

function planLines(release, version, pin) {
  return [
    `release=${release}`,
    `version=${version}`,
    `pin=${pin}`,
    `short=${SHORT}`,
    `built_at=${BUILT}`,
  ].join('\n') + '\n';
}

test('P1 with no output file: release=false, version 0.0.0-dev, pin and short from GITHUB_SHA', () => {
  const r = runPlan(null, { GITHUB_SHA: SHA, BUILT_AT: BUILT });
  assert.equal(r.status, 0, 'P1: exit 0');
  assert.equal(r.stdout, planLines('false', '0.0.0-dev', `sha-${SHORT}`), 'P1: stdout is the five lines for no release');
});

test('P2 with an output file holding 1.2.3: release=true, version and pin 1.2.3', () => {
  const r = runPlan('1.2.3\n', { GITHUB_SHA: SHA, BUILT_AT: BUILT });
  assert.equal(r.status, 0, 'P2: exit 0');
  assert.equal(r.stdout, planLines('true', '1.2.3', '1.2.3'), 'P2: stdout is the five lines for release 1.2.3');
});

test('P3 invalid version files and invalid GITHUB_SHA values exit 1 with nothing on stdout', () => {
  for (const content of ['v1.2.3\n', '1.2\n', '1.2.3+b5\n', '', '1.2.3\n1.2.4\n']) {
    const r = runPlan(content, { GITHUB_SHA: SHA, BUILT_AT: BUILT });
    assert.equal(r.status, 1, `P3: the file ${JSON.stringify(content)} exits 1`);
    assert.equal(r.stdout, '', `P3: the file ${JSON.stringify(content)} prints nothing on stdout`);
  }
  for (const sha of ['abc123', '0123456789ABCDEF0123456789abcdef01234567']) {
    const r = runPlan(null, { GITHUB_SHA: sha, BUILT_AT: BUILT });
    assert.equal(r.status, 1, `P3: GITHUB_SHA ${sha} exits 1`);
    assert.equal(r.stdout, '', `P3: GITHUB_SHA ${sha} prints nothing on stdout`);
  }
});

test('P4 a valid BUILT_AT is printed as given, an invalid one exits 1', () => {
  const ok = runPlan(null, { GITHUB_SHA: SHA, BUILT_AT: '2026-01-02T03:04:05Z' });
  assert.equal(ok.status, 0, 'P4: a valid BUILT_AT exits 0');
  assert.ok(ok.stdout.includes('built_at=2026-01-02T03:04:05Z\n'), 'P4: built_at is the given value');
  const bad = runPlan(null, { GITHUB_SHA: SHA, BUILT_AT: '2026-01-02 03:04:05' });
  assert.equal(bad.status, 1, 'P4: an invalid BUILT_AT exits 1');
  assert.equal(bad.stdout, '', 'P4: an invalid BUILT_AT prints nothing on stdout');
});

test('P5 stdout is exactly five key=value lines in the order of section 2', () => {
  const r = runPlan('1.2.3\n', { GITHUB_SHA: SHA, BUILT_AT: BUILT });
  assert.equal(r.status, 0, 'P5: exit 0');
  assert.ok(r.stdout.endsWith('\n'), 'P5: stdout ends with a newline');
  const lines = r.stdout.slice(0, -1).split('\n');
  assert.equal(lines.length, 5, 'P5: stdout has five lines');
  assert.deepEqual(
    lines.map((line) => line.split('=')[0]),
    ['release', 'version', 'pin', 'short', 'built_at'],
    'P5: the keys are in the order release, version, pin, short, built_at',
  );
});

// ---- publish-merge.sh (M1 to M7) ----

function digestDir(names = [DIGEST_A, DIGEST_B]) {
  const dir = tempDir();
  for (const name of names) writeFileSync(join(dir, name), '');
  return dir;
}

// Runs publish-merge.sh with a stub docker. manifest is the JSON the dry run prints.
function runMerge({ dir, env = {}, manifest = MANIFEST_OK, dryExit = 0, rules } = {}) {
  const stub = tempDir();
  makeStubDocker(
    stub,
    rules ?? [
      {
        match: '*imagetools create --dry-run*',
        stdout: JSON.stringify(manifest),
        exit: dryExit,
      },
    ],
  );
  const merged = { REGISTRY_IMAGE: REGISTRY, SHORT: 'abc1234', RELEASE: 'false', VERSION: undefined, ...env };
  return runScript(mergeScript, [dir ?? digestDir()], merged, stub);
}

function realCreates(calls) {
  return calls.filter((c) => c.includes('imagetools create') && !c.includes('--dry-run'));
}

function tokensOf(call) {
  return call.split(' ');
}

test('M1 with RELEASE=false: one create call, two -t tags, and both digests as sources', () => {
  const r = runMerge({});
  assert.equal(r.status, 0, 'M1: exit 0');
  const creates = realCreates(r.calls);
  assert.equal(creates.length, 1, 'M1: exactly one create call without --dry-run');
  const tokens = tokensOf(creates[0]);
  assert.equal(tokens.filter((t) => t === '-t').length, 2, 'M1: exactly two -t arguments');
  assert.ok(tokens.includes(`${REGISTRY}:latest`), 'M1: a tag is <registry>:latest');
  assert.ok(tokens.includes(`${REGISTRY}:sha-abc1234`), 'M1: a tag is <registry>:sha-<SHORT>');
  assert.ok(tokens.includes(`${REGISTRY}@sha256:${DIGEST_A}`), 'M1: the first source is a digest reference');
  assert.ok(tokens.includes(`${REGISTRY}@sha256:${DIGEST_B}`), 'M1: the second source is a digest reference');
});

test('M2 with RELEASE=true: a third tag with the version; a bad VERSION exits 1 before any docker call', () => {
  const r = runMerge({ env: { RELEASE: 'true', VERSION: '1.2.3' } });
  assert.equal(r.status, 0, 'M2: exit 0');
  const creates = realCreates(r.calls);
  assert.equal(creates.length, 1, 'M2: exactly one create call without --dry-run');
  const tokens = tokensOf(creates[0]);
  const tagValues = tokens.filter((t, i) => tokens[i - 1] === '-t');
  assert.equal(tagValues.length, 3, 'M2: three -t arguments');
  assert.equal(tagValues[2], `${REGISTRY}:1.2.3`, 'M2: the third tag is <registry>:1.2.3');
  for (const bad of ['v1.2.3', '1.2', '1.2.3+b5', '']) {
    const b = runMerge({ env: { RELEASE: 'true', VERSION: bad } });
    assert.equal(b.status, 1, `M2: VERSION "${bad}" exits 1`);
    assert.deepEqual(b.calls, [], `M2: VERSION "${bad}" makes no docker call`);
  }
});

test('M3 a digest folder with one entry, with three, or with a name that is not a digest exits 1 with no create call', () => {
  const folders = [[DIGEST_A], [DIGEST_A, DIGEST_B, 'c'.repeat(64)], [DIGEST_A, 'not-a-digest']];
  for (const names of folders) {
    const r = runMerge({ dir: digestDir(names) });
    assert.equal(r.status, 1, `M3: the folder ${names.join(', ')} exits 1`);
    assert.equal(r.calls.filter((c) => c.includes('imagetools create')).length, 0, `M3: the folder ${names.join(', ')} makes no create call`);
  }
});

test('M4 a dry-run manifest without linux/arm64, or with two linux/amd64 entries, exits 1 before any tag is pushed', () => {
  const manifests = [{ manifests: [AMD64] }, { manifests: [AMD64, AMD64] }];
  for (const manifest of manifests) {
    const r = runMerge({ manifest });
    assert.equal(r.status, 1, 'M4: the manifest is refused');
    assert.ok(r.calls.some((c) => c.includes('--dry-run')), 'M4: the --dry-run call was made');
    assert.equal(realCreates(r.calls).length, 0, 'M4: no create call without --dry-run');
  }
});

test('M5 a failing dry-run call exits 1 with no create call without --dry-run', () => {
  const r = runMerge({ dryExit: 1 });
  assert.equal(r.status, 1, 'M5: exit 1');
  assert.equal(realCreates(r.calls).length, 0, 'M5: no create call without --dry-run');
});

test('M6 a dry-run manifest with both platforms and an unknown/unknown attestation entry passes', () => {
  const manifest = { manifests: [AMD64, ARM64, { platform: { os: 'unknown', architecture: 'unknown' } }] };
  const r = runMerge({ manifest });
  assert.equal(r.status, 0, 'M6: exit 0');
  assert.equal(realCreates(r.calls).length, 1, 'M6: the create call is made');
});

test('M7 an invalid REGISTRY_IMAGE, SHORT or RELEASE exits 1 with no docker call', () => {
  const bad = [
    { REGISTRY_IMAGE: 'Bad Image' },
    { SHORT: 'ABC1234' },
    { SHORT: 'abc12' },
    { RELEASE: 'yes' },
  ];
  for (const env of bad) {
    const r = runMerge({ env });
    assert.equal(r.status, 1, `M7: ${JSON.stringify(env)} exits 1`);
    assert.deepEqual(r.calls, [], `M7: ${JSON.stringify(env)} makes no docker call`);
  }
});

// ---- release-guard.mjs (G1 to G4) ----

// Sets environment variables (undefined removes one) while fn runs, then restores them.
async function withEnv(vars, fn) {
  const saved = {};
  for (const key of Object.keys(vars)) {
    saved[key] = process.env[key];
    if (vars[key] === undefined) delete process.env[key];
    else process.env[key] = vars[key];
  }
  try {
    return await fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

test('G1 verifyRelease writes the version and a newline to SCRIBA_PLAN_OUT, and writes nothing when it is unset', async () => {
  const { verifyRelease } = await import(pathToFileURL(guardPath).href);
  const dir = tempDir();
  const out = join(dir, 'next-version');
  const context = { nextRelease: { version: '1.1.0' } };
  await withEnv({ SCRIBA_PLAN_OUT: out, SCRIBA_EXPECT_VERSION: undefined }, () => verifyRelease({}, context));
  assert.equal(readFileSync(out, 'utf8'), '1.1.0\n', 'G1: the file holds <version> and a newline');
  const unset = tempDir();
  await withEnv({ SCRIBA_PLAN_OUT: undefined, SCRIBA_EXPECT_VERSION: undefined }, () => verifyRelease({}, context));
  assert.deepEqual(readdirSync(unset), [], 'G1: no file is written when SCRIBA_PLAN_OUT is unset');
});

test('G2 with SCRIBA_EXPECT_VERSION equal to the next version, verifyRelease resolves', async () => {
  const { verifyRelease } = await import(pathToFileURL(guardPath).href);
  await assert.doesNotReject(
    withEnv({ SCRIBA_EXPECT_VERSION: '1.2.3', SCRIBA_PLAN_OUT: undefined }, () =>
      verifyRelease({}, { nextRelease: { version: '1.2.3' } }),
    ),
    'G2: a matching version resolves',
  );
});

test('G3 with a different next version, verifyRelease throws and writes no file', async () => {
  const { verifyRelease } = await import(pathToFileURL(guardPath).href);
  const out = join(tempDir(), 'next-version');
  await assert.rejects(
    withEnv({ SCRIBA_EXPECT_VERSION: '1.2.3', SCRIBA_PLAN_OUT: out }, () =>
      verifyRelease({}, { nextRelease: { version: '1.3.0' } }),
    ),
    'G3: a different version throws',
  );
  assert.equal(existsSync(out), false, 'G3: no file is written on a mismatch');
});

test('G4 with neither variable set, verifyRelease resolves and writes nothing', async () => {
  const { verifyRelease } = await import(pathToFileURL(guardPath).href);
  const dir = tempDir();
  await assert.doesNotReject(
    withEnv({ SCRIBA_PLAN_OUT: undefined, SCRIBA_EXPECT_VERSION: undefined }, () =>
      verifyRelease({}, { nextRelease: { version: '1.0.0' } }),
    ),
    'G4: resolves with neither variable set',
  );
  assert.deepEqual(readdirSync(dir), [], 'G4: nothing is written');
});
