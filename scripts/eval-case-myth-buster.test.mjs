import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// The myth-buster case in the Agent loop's eval data. This test reads the case file; it runs no model.
const CASE = join(
  dirname(fileURLToPath(import.meta.url)),
  'eval-agent',
  'cases',
  'myth-buster.json',
);

test('AC 4: the myth-buster eval case is in the eval data and uses the documented keys and values', () => {
  const data = JSON.parse(readFileSync(CASE, 'utf8'));
  assert.deepEqual(Object.keys(data).sort(), ['expect', 'intent', 'sample']);
  assert.deepEqual(Object.keys(data.expect).sort(), [
    'citations',
    'reason',
    'tools',
  ]);
  assert.equal(data.sample, 'nonfiction');
  assert.equal(typeof data.intent, 'string');
  assert.notEqual(data.intent.trim(), '');
  assert.deepEqual(data.expect.tools, ['myth_buster']);
  assert.equal(data.expect.reason, 'completed');
  assert.equal(data.expect.citations, 'present');
});
