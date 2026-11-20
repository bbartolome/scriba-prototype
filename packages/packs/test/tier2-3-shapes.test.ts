import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { contentChecks, lintPacks } from './checks';

// The real packs root, as in real-packs.test.ts.
const REAL_PACKS = resolve(__dirname, '..');

const TIER_2_3_TOOLS = [
  'contrast',
  'profile',
  'zoom',
  'reader_challenge',
  'framework_builder',
  'method_first',
  'timeline',
  'flashback',
  'stockdale_tension',
];

describe('tier 2-3 draft tools', () => {
  it('AC 1: the nine tier 2-3 tools pass the suite on the real packs, ship with enabled false, and have output draft', () => {
    const errors = lintPacks(REAL_PACKS).filter(
      (finding) => finding.severity === 'error',
    );
    expect(errors).toEqual([]);
    expect(contentChecks(REAL_PACKS)).toEqual([]);

    for (const name of TIER_2_3_TOOLS) {
      const spec = parse(
        readFileSync(
          join(REAL_PACKS, 'nonfiction', 'tools', `${name}.yaml`),
          'utf8',
        ),
      ) as { enabled: unknown; output: unknown };
      expect(spec.enabled, name).toBe(false);
      expect(spec.output, name).toBe('draft');
    }
  });
});
