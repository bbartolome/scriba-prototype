import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { makeStubDocker, runScript, tempDir } from './publish-test-kit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const publishPath = join(repo, '.github', 'workflows', 'publish.yml');
const exportScript = join(here, 'export-smoke.sh');

const IMAGE = `bbartolome/scriba@sha256:${'a'.repeat(64)}`;
const STEP = 'Export the nonfiction sample to four formats';

// Runs the wrapper with a stub docker. rules answer the docker calls; the stub records every call.
function runWrapper(args, rules) {
  const stub = tempDir();
  makeStubDocker(stub, rules);
  return runScript(exportScript, args, {}, stub);
}

// The container name of the run call, read from the recorded calls (scriba-export-<pid>).
function nameOf(calls) {
  const run = calls.find((call) =>
    call.startsWith('run -d --name scriba-export-'),
  );
  assert.ok(run, `no run call in ${JSON.stringify(calls)}`);
  return run.split(' ')[3];
}

// Client output rules: a run that starts, and an exec whose output and exit status are given.
function clientRules({ stdout = '', exit = 0 } = {}) {
  return [
    { match: '*run -d*', stdout: 'c0ffee\n' },
    { match: '*exec -i*', stdout, exit },
  ];
}

test('T3a: the export step is the last step of the smoke job, after Image smoke checks, with the wrapper and no if or continue-on-error', () => {
  const workflow = parse(readFileSync(publishPath, 'utf8'));
  const steps = workflow.jobs.smoke.steps;
  const names = steps.map((step) => step.name);
  const imageAt = names.indexOf('Image smoke checks');
  const exportAt = names.indexOf(STEP);
  assert.notEqual(imageAt, -1, 'Image smoke checks is a step of the smoke job');
  assert.notEqual(exportAt, -1, `${STEP} is a step of the smoke job`);
  assert.ok(
    exportAt > imageAt,
    'the export step comes after Image smoke checks',
  );
  assert.equal(
    exportAt,
    steps.length - 1,
    'the export step is the last step of the smoke job',
  );
  const step = steps[exportAt];
  assert.equal(step.run, 'bash scripts/export-smoke.sh "$SMOKE_IMAGE"');
  assert.equal(step.if, undefined, 'the step has no if');
  assert.equal(
    step['continue-on-error'],
    undefined,
    'the step has no continue-on-error',
  );
  assert.equal(step.env, undefined, 'the step has no env');
});

test('T3b: no argument exits 2 with no docker call', () => {
  const result = runWrapper([], []);
  assert.equal(result.status, 2);
  assert.deepEqual(result.calls, []);
});

test('T3b: a client that prints only PASS lines and exits 0 exits 0, with the run, exec and rm calls by name', () => {
  const result = runWrapper(
    [IMAGE],
    clientRules({
      stdout:
        'PASS md: a-20261119-1200.md 10 bytes\nPASS pdf: a-20261119-1200.pdf 99 bytes\n',
    }),
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^PASS md: /m);
  const name = nameOf(result.calls);
  assert.ok(
    result.calls.includes(
      `run -d --name ${name} --tmpfs /books:rw,mode=1777 ${IMAGE}`,
    ),
    `run call with tmpfs in ${JSON.stringify(result.calls)}`,
  );
  assert.ok(
    result.calls.includes(`exec -i ${name} node -`),
    `exec call in ${JSON.stringify(result.calls)}`,
  );
  assert.ok(
    result.calls.includes(`rm -f ${name}`),
    `rm call in ${JSON.stringify(result.calls)}`,
  );
  assert.ok(
    !result.calls.some((call) => call.startsWith('logs ')),
    'no logs call on success',
  );
});

test('T3b: a FAIL line with a client exit of 0 exits 1 and calls logs --tail 40', () => {
  const result = runWrapper(
    [IMAGE],
    clientRules({
      stdout:
        'PASS md: a-20261119-1200.md 10 bytes\nFAIL docx: the zip has no word/document.xml\n',
    }),
  );
  assert.equal(result.status, 1);
  assert.match(result.stdout, /^FAIL docx: /m);
  const name = nameOf(result.calls);
  assert.ok(
    result.calls.includes(`logs --tail 40 ${name}`),
    `logs call in ${JSON.stringify(result.calls)}`,
  );
});

test('T3b: a client exit of 1 with only PASS lines exits 1 and calls logs --tail 40', () => {
  const result = runWrapper(
    [IMAGE],
    clientRules({ stdout: 'PASS md: a-20261119-1200.md 10 bytes\n', exit: 1 }),
  );
  assert.equal(result.status, 1);
  const name = nameOf(result.calls);
  assert.ok(
    result.calls.includes(`logs --tail 40 ${name}`),
    `logs call in ${JSON.stringify(result.calls)}`,
  );
});

test('T3b: a failing docker run exits 1 with the start line and no exec call', () => {
  const result = runWrapper(
    [IMAGE],
    [{ match: '*run -d*', stderr: 'boom\n', exit: 1 }],
  );
  assert.equal(result.status, 1);
  assert.match(result.stdout, /^FAIL start: docker run -d exited non-zero$/m);
  assert.ok(
    !result.calls.some((call) => call.startsWith('exec ')),
    'no exec call',
  );
});
