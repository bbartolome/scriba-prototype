import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';

const MAIN = resolve(__dirname, '..', 'dist', 'main.js');

it('an invalid SCRIBA_* value exits 1 with one readable line naming the variable', () => {
  const dirs = [0, 1, 2].map(() => mkdtempSync(join(tmpdir(), 'scriba-ac3-')));
  try {
    const [books, packs, examples] = dirs;
    const result = spawnSync(process.execPath, [MAIN], {
      env: {
        SCRIBA_BOOKS_DIR: books,
        SCRIBA_PACKS_DIR: packs,
        SCRIBA_EXAMPLES_DIR: examples,
        SCRIBA_LOG_LEVEL: 'loud',
      },
      encoding: 'utf8',
      timeout: 15000,
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr.trim()).toBe(
      'Invalid SCRIBA_LOG_LEVEL "loud": expected one of debug, info, warn, error.',
    );
    const stackFrame = result.stderr
      .split('\n')
      .some((line) => /^\s+at /.test(line));
    expect(stackFrame).toBe(false);
  } finally {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  }
});
