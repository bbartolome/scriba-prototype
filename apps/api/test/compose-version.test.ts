import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { createTestApp } from './create-test-app';

it('GET /api/platform/version reports the composeVersion shipped in deploy/compose-version', async () => {
  const shipped = Number(
    readFileSync(
      resolve(__dirname, '..', '..', '..', 'deploy', 'compose-version'),
      'utf8',
    ).trim(),
  );
  const libraryDir = mkdtempSync(join(tmpdir(), 'scriba-compose-version-'));
  try {
    const app = await createTestApp({
      libraryDir,
      staticRoot: resolve(__dirname, 'fixtures/static'),
    });
    try {
      const response = await fetch(app.baseUrl + '/api/platform/version');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Number.isInteger(shipped)).toBe(true);
      expect(shipped).toBeGreaterThan(0);
      expect(body.composeVersion).toBe(shipped);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(libraryDir, { recursive: true, force: true });
  }
});
