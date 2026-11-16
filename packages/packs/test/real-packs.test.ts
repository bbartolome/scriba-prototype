import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contentChecks, lintPacks } from './checks';

// Acceptance criterion 2: the suite passes on the real packs (still empty of tools).
const REAL_PACKS = resolve(__dirname, '..');

describe('real packs', () => {
  it('the suite passes on the real packs', () => {
    const errors = lintPacks(REAL_PACKS).filter(
      (finding) => finding.severity === 'error',
    );
    expect(errors).toEqual([]);
    expect(contentChecks(REAL_PACKS)).toEqual([]);
  });
});
