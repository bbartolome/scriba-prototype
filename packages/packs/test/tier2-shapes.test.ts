import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { contentChecks, lintPacks } from './checks';

// AC 1 of GNP-21: the three tools pass the validation suite, ship disabled, and have the output kinds of the unit.
const REAL_PACKS = resolve(__dirname, '..');
const SHAPES: Record<string, string> = {
  named_concept: 'entity',
  comparison_set: 'draft',
  objection_handler: 'draft',
};

describe('Tier 2 shapes', () => {
  it('AC 1: the three Tier 2 tools pass the suite on the real packs, ship with enabled false, and have their output kinds', () => {
    const errors = lintPacks(REAL_PACKS).filter(
      (finding) => finding.severity === 'error',
    );
    expect(errors).toEqual([]);
    expect(contentChecks(REAL_PACKS)).toEqual([]);
    for (const [name, output] of Object.entries(SHAPES)) {
      const spec = parse(
        readFileSync(
          resolve(REAL_PACKS, 'nonfiction', 'tools', `${name}.yaml`),
          'utf8',
        ),
      ) as { enabled: unknown; output: unknown };
      expect(spec.enabled, name).toBe(false);
      expect(spec.output, name).toBe(output);
    }
  });
});
