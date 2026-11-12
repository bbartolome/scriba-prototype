import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createTestApp } from './create-test-app';

it('boots against a temp library on an ephemeral port and reads /healthz', async () => {
  const library = mkdtempSync(join(tmpdir(), 'scriba-ac5-'));
  try {
    const app = await createTestApp({ libraryDir: library });
    const url = new URL(app.baseUrl);
    expect(url.hostname).toBe('127.0.0.1');
    expect(url.port).not.toBe('');
    expect(url.port).not.toBe('8080');

    const response = await fetch(app.baseUrl + '/healthz');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: 'ok',
      version: '0.0.0-dev',
    });
    expect(existsSync(join(library, '.scriba'))).toBe(true);

    await app.close();
    await expect(fetch(app.baseUrl + '/healthz')).rejects.toThrow();
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});
