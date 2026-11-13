import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';

const FIXTURE = resolve(__dirname, 'fixtures', 'boot-setup-auth.cjs');
const CHILD_TIMEOUT_MS = 15000;

// The child gets only the names the test sets, so the default port and the default setup URL base apply.
function runChild(library: string, logLevel: string): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [FIXTURE], {
    env: {
      SCRIBA_BOOKS_DIR: library,
      SCRIBA_PACKS_DIR: join(library, 'packs'),
      SCRIBA_EXAMPLES_DIR: join(library, 'examples'),
      SCRIBA_LOG_LEVEL: logLevel,
    },
    encoding: 'utf8',
    timeout: CHILD_TIMEOUT_MS,
  });
}

it('the token value never appears in logs other than the setup URL line', () => {
  const library = mkdtempSync(join(tmpdir(), 'scriba-setup-logs-'));
  try {
    const dir = join(library, '.scriba');
    // Two starts at debug level, so Nest's debug output is produced. Each start prints one URL line.
    for (let start = 0; start < 2; start += 1) {
      const result = runChild(library, 'debug');
      expect(result.status).toBe(0);
      const token = readFileSync(join(dir, 'setup-token'), 'utf8').trim();
      const url = readFileSync(join(dir, 'setup-url'), 'utf8').replace(
        /\n$/,
        '',
      );
      expect(result.stderr).not.toContain(token);
      const tokenLines = [result.stdout, result.stderr]
        .join('\n')
        .split('\n')
        .filter((line) => line.includes(token));
      expect(tokenLines).toEqual([`Setup URL: ${url}`]);
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('an invalid setup-token file exits 1 naming the path, and writes no setup-url', () => {
  const library = mkdtempSync(join(tmpdir(), 'scriba-setup-logs-'));
  try {
    const dir = join(library, '.scriba');
    mkdirSync(dir, { recursive: true });
    const tokenPath = join(dir, 'setup-token');
    writeFileSync(tokenPath, 'not-a-token\n');

    const result = runChild(library, 'error');

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr.trim()).toBe(
      `Cannot read ${tokenPath}: not a 256-bit base64url setup token; delete the file and restart to create a new one.`,
    );
    expect(result.stderr).not.toContain('not-a-token');
    expect(readFileSync(tokenPath, 'utf8')).toBe('not-a-token\n');
    expect(existsSync(join(dir, 'setup-url'))).toBe(false);
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});
