import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// AC 3 of GNP-10: the numbers-to-people case is in the Agent loop's eval data. It reads the case file and runs no model.
const CASE_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  'eval-agent',
  'cases',
  'numbers-to-people.json',
);

test('AC 3: the numbers-to-people eval case is in the eval data and uses the documented keys and values', () => {
  const data = JSON.parse(readFileSync(CASE_FILE, 'utf8'));
  assert.deepEqual(Object.keys(data).sort(), ['expect', 'intent', 'sample']);
  assert.deepEqual(Object.keys(data.expect).sort(), [
    'citations',
    'reason',
    'tools',
  ]);
  assert.equal(data.sample, 'nonfiction');
  assert.equal(typeof data.intent, 'string');
  assert.ok(data.intent.length > 0, 'intent is not empty');
  assert.deepEqual(data.expect.tools, ['numbers_to_people']);
  assert.equal(data.expect.reason, 'completed');
  assert.equal(data.expect.citations, 'present');
});
