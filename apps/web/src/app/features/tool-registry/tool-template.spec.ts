import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { blankToolSource, duplicateToolSource } from './tool-template';

// The nonfiction pack's myth_buster tool, read from the repository. The tests run in apps/web.
const MYTH_BUSTER = readFileSync(
  resolve(
    process.cwd(),
    '../../packages/packs/nonfiction/tools/myth_buster.yaml',
  ),
  'utf8',
);

describe('tool templates', () => {
  it('T4a the blank template has the name line and a one-line description, and Duplicate changes only the name line', () => {
    const blank = blankToolSource('my_tool');
    const lines = blank.split('\n');
    expect(lines).toContain('name: my_tool');
    expect(
      lines.filter((line) => line.startsWith('description:')),
    ).toHaveLength(1);

    const copy = duplicateToolSource(MYTH_BUSTER, 'my_copy');
    const source = MYTH_BUSTER.split('\n');
    const result = copy.split('\n');
    expect(result).toHaveLength(source.length);
    const changed = source
      .map((line, index) => (line === result[index] ? null : index))
      .filter((index): index is number => index !== null);
    expect(changed).toHaveLength(1);
    expect(source[changed[0] ?? -1]).toMatch(/^name:/);
    expect(result[changed[0] ?? -1]).toBe('name: my_copy');

    const noName = 'schemaVersion: 1\noutput: draft\n';
    expect(duplicateToolSource(noName, 'my_copy')).toBe(noName);
  });
});
