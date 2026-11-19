import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// The character-builder and world-builder cases in the Agent loop's eval data. This test reads the case files; it runs no model.
const CASES = join(
  dirname(fileURLToPath(import.meta.url)),
  'eval-agent',
  'cases',
);

function readCase(file) {
  return JSON.parse(readFileSync(join(CASES, file), 'utf8'));
}

test('AC 3: the character-builder and world-builder eval cases are in the eval data and use the documented keys and values', () => {
  const cases = [
    ['character-builder.json', ['character_builder']],
    ['world-builder.json', ['world_builder']],
  ];
  for (const [file, tools] of cases) {
    const data = readCase(file);
    assert.deepEqual(
      Object.keys(data).sort(),
      ['expect', 'intent', 'sample'],
      file,
    );
    assert.deepEqual(
      Object.keys(data.expect).sort(),
      ['reason', 'tools'],
      file,
    );
    assert.equal(data.sample, 'fiction', file);
    assert.equal(typeof data.intent, 'string', file);
    assert.notEqual(data.intent.trim(), '', file);
    assert.deepEqual(data.expect.tools, tools, file);
    assert.equal(data.expect.reason, 'completed', file);
  }
});
