import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lintPacks } from './checks';

// Acceptance criterion 1 (fixture half): the pack-lint library rejects each broken-spec fixture with its rule.
const FIXTURES = join(__dirname, 'fixtures', 'broken-specs');

describe('broken-spec fixtures', () => {
  it.each([
    ['output-kind', 'output', 'core/tools/bad_output.yaml'],
    ['unknown-hint', 'hint-unknown', 'core/tools/unknown_hint.yaml'],
    [
      'template-undeclared',
      'template-variable',
      'core/tools/undeclared_input.yaml',
    ],
    ['duplicate-name', 'duplicate-name', 'nonfiction/tools/dup_tool.yaml'],
    ['multi-line-description', 'description', 'core/tools/multi_line.yaml'],
  ])('fails on each broken-spec fixture: %s', (caseName, rule, file) => {
    const errors = lintPacks(join(FIXTURES, caseName)).filter(
      (finding) => finding.severity === 'error',
    );
    expect(errors).toContainEqual(expect.objectContaining({ rule, file }));
  });
});
