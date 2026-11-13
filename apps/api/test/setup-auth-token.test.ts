import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { createTestApp } from './create-test-app';

const FIXTURE = resolve(__dirname, 'fixtures', 'boot-setup-auth.cjs');
const CHILD_TIMEOUT_MS = 15000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const URL_LINE =
  /^Setup URL: (http:\/\/127\.0\.0\.1:8080\/api\/setup-auth\/handshake\?token=[A-Za-z0-9_-]{43})$/;

function modeOf(path: string): number {
  return statSync(path).mode & 0o777;
}

it('first start creates the token (0600, dir 0700) and a 0600 setup-url, and prints the URL to stdout', () => {
  const library = mkdtempSync(join(tmpdir(), 'scriba-setup-token-'));
  try {
    const result = spawnSync(process.execPath, [FIXTURE], {
      env: {
        SCRIBA_BOOKS_DIR: library,
        SCRIBA_PACKS_DIR: join(library, 'packs'),
        SCRIBA_EXAMPLES_DIR: join(library, 'examples'),
        SCRIBA_PORT: '8080',
        SCRIBA_LOG_LEVEL: 'error',
      },
      encoding: 'utf8',
      timeout: CHILD_TIMEOUT_MS,
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    const lines = result.stdout.split('\n').filter((line) => line !== '');
    expect(lines).toHaveLength(1);
    const line = lines[0] ?? '';
    expect(line).toMatch(URL_LINE);
    const token = line.slice(-43);

    const dir = join(library, '.scriba');
    const tokenPath = join(dir, 'setup-token');
    expect(modeOf(tokenPath)).toBe(0o600);
    expect(readFileSync(tokenPath, 'utf8').trim()).toBe(token);
    expect(modeOf(dir)).toBe(0o700);
    const urlPath = join(dir, 'setup-url');
    expect(modeOf(urlPath)).toBe(0o600);
    expect(readFileSync(urlPath, 'utf8')).toBe(
      `${line.slice('Setup URL: '.length)}\n`,
    );
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('a restart keeps the same token and rewrites setup-url with the current port', async () => {
  const library = mkdtempSync(join(tmpdir(), 'scriba-setup-token-'));
  try {
    const dir = join(library, '.scriba');
    const first = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PORT: '8080' },
    });
    await first.close();
    const tokenBytes = readFileSync(join(dir, 'setup-token'));

    const second = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PORT: '9191' },
    });
    await second.close();

    expect(readFileSync(join(dir, 'setup-token'))).toEqual(tokenBytes);
    const token = tokenBytes.toString('utf8').trim();
    const urlPath = join(dir, 'setup-url');
    expect(readFileSync(urlPath, 'utf8')).toBe(
      `http://127.0.0.1:9191/api/setup-auth/handshake?token=${token}\n`,
    );
    expect(modeOf(urlPath)).toBe(0o600);
    expect(readFileSync(urlPath, 'utf8')).not.toContain('8080');
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('deleting the token file and restarting creates a new token and a new setup-url', async () => {
  const library = mkdtempSync(join(tmpdir(), 'scriba-setup-token-'));
  try {
    const dir = join(library, '.scriba');
    const tokenPath = join(dir, 'setup-token');
    const urlPath = join(dir, 'setup-url');
    const first = await createTestApp({ libraryDir: library });
    await first.close();
    const oldToken = readFileSync(tokenPath, 'utf8').trim();

    rmSync(tokenPath);
    const second = await createTestApp({ libraryDir: library });
    await second.close();

    const newToken = readFileSync(tokenPath, 'utf8').trim();
    expect(modeOf(tokenPath)).toBe(0o600);
    expect(newToken).toMatch(TOKEN_PATTERN);
    expect(newToken).not.toBe(oldToken);
    const setupUrl = readFileSync(urlPath, 'utf8');
    expect(setupUrl).toContain(newToken);
    expect(setupUrl).not.toContain(oldToken);
    expect(modeOf(urlPath)).toBe(0o600);
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});
