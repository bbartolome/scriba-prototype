import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { parse } from 'yaml';
import { setupAuthSectionSchema } from '@bbartolome/scriba-contracts/setup-auth';
import { backupEntries } from './settings.kit';

const FIXTURE = resolve(__dirname, 'fixtures', 'boot-setup-auth.cjs');
const CHILD_TIMEOUT_MS = 15000;

function runChild(library: string): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [FIXTURE], {
    env: {
      SCRIBA_BOOKS_DIR: library,
      SCRIBA_PACKS_DIR: join(library, 'packs'),
      SCRIBA_EXAMPLES_DIR: join(library, 'examples'),
      SCRIBA_LOG_LEVEL: 'error',
    },
    encoding: 'utf8',
    timeout: CHILD_TIMEOUT_MS,
  });
}

it('a fresh library gets the setupAuth default in settings.yaml, and a second start changes nothing', () => {
  const library = mkdtempSync(join(tmpdir(), 'scriba-setup-section-'));
  try {
    const first = runChild(library);
    expect(first.status).toBe(0);
    const settingsPath = join(library, '.scriba', 'settings.yaml');
    const text = readFileSync(settingsPath, 'utf8');
    const doc = parse(text) as Record<string, unknown>;
    expect(doc.schemaVersion).toBe(1);
    const setupAuth = doc.setupAuth;
    expect(setupAuth).toEqual({
      schemaVersion: 1,
      steps: {
        access: 'pending',
        tailscale: 'pending',
        providers: 'pending',
        preferences: 'pending',
        firstProject: 'pending',
      },
      complete: false,
      preferences: {},
      allowlist: { enabled: false, logins: [] },
    });
    expect(setupAuthSectionSchema.safeParse(setupAuth).success).toBe(true);

    const second = runChild(library);
    expect(second.status).toBe(0);
    expect(readFileSync(settingsPath, 'utf8')).toBe(text);
    expect(backupEntries(library)).toEqual([]);
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});
