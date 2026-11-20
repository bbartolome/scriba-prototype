import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// AC 3 of GNP-21: the three Tier 2 cases are in the Agent loop's eval data. The test reads the case files and runs no model.
const CASES = join(
  dirname(fileURLToPath(import.meta.url)),
  'eval-agent',
  'cases',
);
// Each case names its tool. An entity output has no citations key (the GNP-14 precedent).
const EXPECTED = {
  'named-concept': { tool: 'named_concept', citations: undefined },
  'comparison-set': { tool: 'comparison_set', citations: 'present' },
  'objection-handler': { tool: 'objection_handler', citations: 'present' },
};

test('AC 3: the three Tier 2 eval cases are in the eval data and use the documented keys and values', () => {
  for (const [id, want] of Object.entries(EXPECTED)) {
    const data = JSON.parse(readFileSync(join(CASES, `${id}.json`), 'utf8'));
    assert.deepEqual(Object.keys(data).sort(), ['expect', 'intent', 'sample']);
    assert.equal(data.sample, 'nonfiction');
    assert.equal(typeof data.intent, 'string');
    assert.ok(data.intent.length > 0, `${id}: intent is not empty`);
    assert.deepEqual(data.expect.tools, [want.tool]);
    assert.equal(data.expect.reason, 'completed');
    if (want.citations === undefined) {
      assert.equal(
        'citations' in data.expect,
        false,
        `${id}: no citations key`,
      );
    } else {
      assert.equal(data.expect.citations, want.citations, `${id}: citations`);
    }
  }
});
