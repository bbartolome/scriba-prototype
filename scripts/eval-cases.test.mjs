import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// The case files of the Agent loop's eval script (scripts/eval-agent/README.md). This test reads them; it runs no model.
const CASES = join(
  dirname(fileURLToPath(import.meta.url)),
  'eval-agent',
  'cases',
);
const CASE_ID = /^[a-z0-9][a-z0-9-]*$/;
const CASE_KEYS = ['sample', 'intent', 'expect'];
const EXPECT_KEYS = ['reason', 'tools', 'citations'];
const RUN_END_REASONS = [
  'completed',
  'stopped',
  'capped',
  'error',
  'project-switched',
];
const CITATION_MODES = ['present', 'absent', 'any'];

function loadCases() {
  return readdirSync(CASES)
    .filter((name) => name.endsWith('.json'))
    .map((name) => ({
      id: name.slice(0, -'.json'.length),
      data: JSON.parse(readFileSync(join(CASES, name), 'utf8')),
    }));
}

test('AC 3: the cold-open eval case is in the eval data and uses the documented keys and values', () => {
  const cases = loadCases();
  for (const { id, data } of cases) {
    assert.match(id, CASE_ID, `case id ${id}`);
    for (const key of Object.keys(data)) {
      assert.ok(CASE_KEYS.includes(key), `${id}: unknown key ${key}`);
    }
    for (const key of Object.keys(data.expect ?? {})) {
      assert.ok(EXPECT_KEYS.includes(key), `${id}: unknown expect key ${key}`);
    }
    if (data.expect?.reason !== undefined) {
      assert.ok(RUN_END_REASONS.includes(data.expect.reason), `${id}: reason`);
    }
    if (data.expect?.citations !== undefined) {
      assert.ok(
        CITATION_MODES.includes(data.expect.citations),
        `${id}: citations`,
      );
    }
  }

  const cold = cases.find(({ id }) => id === 'cold-open');
  assert.ok(cold, 'the case file cold-open.json exists');
  assert.equal(typeof cold.data.intent, 'string');
  assert.ok(cold.data.intent.length > 0, 'intent is not empty');
  assert.equal(cold.data.sample, 'nonfiction');
  assert.deepEqual(cold.data.expect.tools, ['cold_open']);
  assert.equal(cold.data.expect.reason, 'completed');
  assert.equal(cold.data.expect.citations, 'present');
});

test('AC 3: the mystery-question eval case is in the eval data and uses the documented keys and values', () => {
  const mystery = loadCases().find(({ id }) => id === 'mystery-question');
  assert.ok(mystery, 'the case file mystery-question.json exists');
  for (const key of Object.keys(mystery.data)) {
    assert.ok(CASE_KEYS.includes(key), `unknown key ${key}`);
  }
  for (const key of Object.keys(mystery.data.expect ?? {})) {
    assert.ok(EXPECT_KEYS.includes(key), `unknown expect key ${key}`);
  }
  assert.ok(RUN_END_REASONS.includes(mystery.data.expect.reason), 'reason');
  assert.ok(
    CITATION_MODES.includes(mystery.data.expect.citations),
    'citations',
  );
  assert.equal(mystery.data.sample, 'nonfiction');
  assert.equal(typeof mystery.data.intent, 'string');
  assert.ok(mystery.data.intent.length > 0, 'intent is not empty');
  assert.deepEqual(mystery.data.expect.tools, ['mystery_question']);
  assert.equal(mystery.data.expect.reason, 'completed');
  assert.equal(mystery.data.expect.citations, 'present');
});
