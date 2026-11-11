import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
// CI_WORKFLOW_PATH exists only so the mutation checks can point the tests at mutant files.
const workflowPath =
  process.env.CI_WORKFLOW_PATH ??
  join(here, '..', '.github', 'workflows', 'ci.yml');

const ORDERED_RUNS = ['npm ci', 'npm run lint', 'npm test', 'npm run build'];

function loadWorkflow() {
  return parse(readFileSync(workflowPath, 'utf8'));
}

function singleJob(workflow) {
  const names = Object.keys(workflow.jobs ?? {});
  assert.equal(names.length, 1, 'the workflow has exactly one job');
  return workflow.jobs[names[0]];
}

function assertRunsInOrder(workflow) {
  const runs = singleJob(workflow).steps.map((step) => step.run);
  const indexes = ORDERED_RUNS.map((command) => {
    const found = runs.flatMap((run, index) =>
      run === command ? [index] : [],
    );
    assert.equal(found.length, 1, `"${command}" appears exactly once`);
    return found[0];
  });
  assert.deepEqual(
    indexes,
    [...indexes].sort((a, b) => a - b),
    'the steps run in the order npm ci, lint, test, build',
  );
}

test('criterion 1: runs on pull_request and push to main with no paths filter', () => {
  const workflow = loadWorkflow();
  assert.deepEqual(Object.keys(workflow.on).sort(), ['pull_request', 'push']);
  assert.deepEqual(workflow.on.push.branches, ['main']);
  for (const event of ['pull_request', 'push']) {
    const config = workflow.on[event] ?? {};
    assert.ok(!('paths' in config), `${event} has no paths filter`);
    assert.ok(
      !('paths-ignore' in config),
      `${event} has no paths-ignore filter`,
    );
  }
});

test('criterion 2: npm ci, lint, test and build run in order in a single job', () => {
  assertRunsInOrder(loadWorkflow());
});

test('criterion 4 PROXY: the file parses as YAML, has one job, and orders the steps (not the green-on-PR check)', () => {
  const workflow = loadWorkflow();
  assert.ok(
    workflow && typeof workflow === 'object',
    'the file parses as a YAML mapping',
  );
  assertRunsInOrder(workflow);
});

test('decision: setup-node reads .nvmrc and caches npm keyed on package-lock.json', () => {
  const steps = singleJob(loadWorkflow()).steps;
  const setup = steps.find(
    (step) =>
      typeof step.uses === 'string' &&
      step.uses.startsWith('actions/setup-node@'),
  );
  assert.ok(setup, 'a setup-node step exists');
  const withInputs = setup.with ?? {};
  assert.equal(withInputs['node-version-file'], '.nvmrc');
  assert.ok(!('node-version' in withInputs), 'no node-version key');
  assert.equal(withInputs.cache, 'npm');
  assert.equal(withInputs['cache-dependency-path'], 'package-lock.json');
});

test('decision: the title step runs on pull_request, passes the title through env, and never reads github.event in run', () => {
  const steps = singleJob(loadWorkflow()).steps;
  const titleStep = steps.find((step) => step.name === 'Check PR title');
  assert.ok(titleStep, 'a title step exists');
  assert.match(titleStep.if, /pull_request/);
  assert.equal(
    titleStep.env.PR_TITLE,
    '${{ github.event.pull_request.title }}',
  );
  assert.ok(
    !titleStep.run.includes('github.event'),
    'run does not interpolate github.event',
  );
});
