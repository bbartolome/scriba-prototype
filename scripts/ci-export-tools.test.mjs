import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

// Criterion 4 (the CI half): the install step for Pandoc 3.13 and Typst 0.15.1, the flag on the Test step, and the
// pins, which must equal the Dockerfile's amd64 pins. These tests read files only; no tool is run.
const here = dirname(fileURLToPath(import.meta.url));
const workflowPath = join(here, '..', '.github', 'workflows', 'ci.yml');
const dockerfilePath = join(here, '..', 'Dockerfile');

const PANDOC_URL =
  'https://github.com/jgm/pandoc/releases/download/3.13/pandoc-3.13-1-amd64.deb';
const TYPST_URL =
  'https://github.com/typst/typst/releases/download/v0.15.1/typst-x86_64-unknown-linux-musl.tar.xz';

function loadSteps() {
  const workflow = parse(readFileSync(workflowPath, 'utf8'));
  const names = Object.keys(workflow.jobs ?? {});
  assert.equal(names.length, 1, 'the workflow has exactly one job');
  return workflow.jobs[names[0]].steps;
}

// The amd64 branch of the Dockerfile's TARGETARCH case: its Pandoc and Typst SHA256 pins (lines 10 and 12).
function dockerfileAmd64Pins() {
  const text = readFileSync(dockerfilePath, 'utf8');
  const branch = text.match(/amd64\)([\s\S]*?)arm64\)/);
  assert.ok(branch, 'the Dockerfile has an amd64 branch');
  const pandoc = branch[1].match(/PANDOC_SHA256=([0-9a-f]{64})/);
  const typst = branch[1].match(/TYPST_SHA256=([0-9a-f]{64})/);
  assert.ok(pandoc && typst, 'the amd64 branch has both pins');
  return { pandoc: pandoc[1], typst: typst[1] };
}

// The index of the Test step, and the install steps before it.
function stepsBeforeTest(steps) {
  const testIndex = steps.findIndex((step) => step.name === 'Test');
  assert.ok(testIndex >= 0, 'a Test step exists');
  return steps.slice(0, testIndex);
}

test('criterion 4: a Pandoc 3.13 install step runs before Test, checks its SHA256 and its version', () => {
  const pins = dockerfileAmd64Pins();
  const step = stepsBeforeTest(loadSteps()).find(
    (candidate) =>
      typeof candidate.run === 'string' && candidate.run.includes(PANDOC_URL),
  );
  assert.ok(step, 'a step before Test downloads the amd64 Pandoc 3.13 .deb');
  assert.ok(
    step.run.includes(pins.pandoc),
    'the step checks the Pandoc SHA256',
  );
  assert.ok(
    step.run.includes(`"pandoc 3.13"`),
    'the step checks the pandoc 3.13 version line',
  );
});

test('criterion 4: a Typst 0.15.1 install step runs before Test, checks its SHA256 and its version', () => {
  const pins = dockerfileAmd64Pins();
  const step = stepsBeforeTest(loadSteps()).find(
    (candidate) =>
      typeof candidate.run === 'string' && candidate.run.includes(TYPST_URL),
  );
  assert.ok(
    step,
    'a step before Test downloads the amd64 Typst 0.15.1 tarball',
  );
  assert.ok(step.run.includes(pins.typst), 'the step checks the Typst SHA256');
  assert.ok(
    step.run.includes(`"0.15.1"`),
    'the step checks the 0.15.1 version',
  );
});

test('criterion 4: the Test step sets SCRIBA_REQUIRE_EXPORT_TOOLS to 1', () => {
  const steps = loadSteps();
  const testStep = steps.find((step) => step.name === 'Test');
  assert.ok(testStep, 'a Test step exists');
  assert.equal(testStep.env?.SCRIBA_REQUIRE_EXPORT_TOOLS, '1');
});

test("criterion 4: the CI pins equal the Dockerfile's amd64 pins", () => {
  const pins = dockerfileAmd64Pins();
  const runs = loadSteps()
    .map((step) => (typeof step.run === 'string' ? step.run : ''))
    .join('\n');
  assert.ok(
    runs.includes(`${pins.pandoc}  /tmp/pandoc.deb`),
    'ci.yml checks the .deb against the Dockerfile Pandoc pin',
  );
  assert.ok(
    runs.includes(`${pins.typst}  /tmp/typst.tar.xz`),
    'ci.yml checks the tarball against the Dockerfile Typst pin',
  );
});
