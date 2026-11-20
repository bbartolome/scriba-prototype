import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// The remix eval case in the Agent loop's eval data (GNP-23, criterion 3). This test reads the case file; it runs no model.
const CASES = join(
  dirname(fileURLToPath(import.meta.url)),
  'eval-agent',
  'cases',
);

test('AC 3: the remix eval case is in the eval data and uses the documented keys and values', () => {
  const data = JSON.parse(readFileSync(join(CASES, 'remix.json'), 'utf8'));
  assert.deepEqual(Object.keys(data).sort(), ['expect', 'intent', 'sample']);
  assert.equal(data.sample, 'nonfiction');
  assert.equal(typeof data.intent, 'string');
  assert.notEqual(data.intent.trim(), '');
  assert.deepEqual(data.expect.tools, ['remix']);
  assert.equal(data.expect.reason, 'completed');
  assert.equal(data.expect.citations, 'present');
});
