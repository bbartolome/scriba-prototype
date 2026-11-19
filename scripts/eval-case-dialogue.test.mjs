import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// The dialogue case in the Agent loop's eval data. This test reads the case file; it runs no model.
const CASES = join(
  dirname(fileURLToPath(import.meta.url)),
  'eval-agent',
  'cases',
);

function readCase(file) {
  return JSON.parse(readFileSync(join(CASES, file), 'utf8'));
}

test('AC 4: the dialogue eval case is in the eval data and uses the documented keys and values', () => {
  const data = readCase('dialogue.json');
  assert.deepEqual(Object.keys(data).sort(), ['expect', 'intent', 'sample']);
  assert.deepEqual(Object.keys(data.expect).sort(), ['reason', 'tools']);
  assert.equal(data.sample, 'fiction');
  assert.equal(typeof data.intent, 'string');
  assert.notEqual(data.intent.trim(), '');
  assert.deepEqual(data.expect.tools, ['dialogue']);
  assert.equal(data.expect.reason, 'completed');
});
