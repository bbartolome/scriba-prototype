import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { PlatformModule } from '../src/modules/platform/platform.module';
import { createTestApp } from './create-test-app';

it('an unknown /api route returns 404 PLATFORM_NOT_FOUND, and an unknown non-API path still returns index.html', async () => {
  const staticRoot = resolve(__dirname, 'fixtures/static');
  const index = readFileSync(resolve(staticRoot, 'index.html'));
  const app = await createTestApp({ staticRoot, modules: [PlatformModule] });
  try {
    for (const path of ['/', '/deep/link/x']) {
      const response = await fetch(app.baseUrl + path);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toMatch(/^text\/html/);
      const body = Buffer.from(await response.arrayBuffer());
      expect(body.equals(index)).toBe(true);
    }

    const missing = await fetch(app.baseUrl + '/api/platform/nope');
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({
      error: { code: 'PLATFORM_NOT_FOUND', message: 'Not found.' },
    });
  } finally {
    await app.close();
  }
});
