import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// The plot-manager case in the Agent loop's eval data. This test reads the case file; it runs no model.
const CASE = join(
  dirname(fileURLToPath(import.meta.url)),
  'eval-agent',
  'cases',
  'plot-manager.json',
);

test('AC 2: the plot-manager eval case is in the eval data and uses the documented keys and values', () => {
  const data = JSON.parse(readFileSync(CASE, 'utf8'));
  assert.deepEqual(Object.keys(data).sort(), ['expect', 'intent', 'sample']);
  assert.deepEqual(Object.keys(data.expect).sort(), ['reason', 'tools']);
  assert.equal(data.sample, 'fiction');
  assert.equal(typeof data.intent, 'string');
  assert.notEqual(data.intent.trim(), '');
  assert.deepEqual(data.expect.tools, ['plot_manager']);
  assert.equal(data.expect.reason, 'completed');
});
