import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// The tier 2-3 eval cases in the Agent loop's eval data. This test reads the case files; it runs no model.
const CASES = join(
  dirname(fileURLToPath(import.meta.url)),
  'eval-agent',
  'cases',
);

// Each case id (kebab case) with its tool name.
const CASE_TOOLS = [
  ['contrast', 'contrast'],
  ['profile', 'profile'],
  ['zoom', 'zoom'],
  ['reader-challenge', 'reader_challenge'],
  ['framework-builder', 'framework_builder'],
  ['method-first', 'method_first'],
  ['timeline', 'timeline'],
  ['flashback', 'flashback'],
  ['stockdale-tension', 'stockdale_tension'],
];

test('AC 4: the nine tier 2-3 eval cases are in the eval data and use the documented keys and values', () => {
  for (const [id, tool] of CASE_TOOLS) {
    const data = JSON.parse(readFileSync(join(CASES, `${id}.json`), 'utf8'));
    assert.deepEqual(
      Object.keys(data).sort(),
      ['expect', 'intent', 'sample'],
      id,
    );
    assert.equal(data.sample, 'nonfiction', id);
    assert.equal(typeof data.intent, 'string', id);
    assert.notEqual(data.intent.trim(), '', id);
    assert.deepEqual(data.expect.tools, [tool], id);
    assert.equal(data.expect.reason, 'completed', id);
    assert.equal(data.expect.citations, 'present', id);
  }
});
