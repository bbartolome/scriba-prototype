import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { versionInfoSchema } from '@bbartolome/scriba-contracts/platform';
import { PlatformModule } from '../src/modules/platform/platform.module';
import { createTestApp } from './create-test-app';

it('GET /healthz returns status ok, and GET /api/platform/version returns the version-info shape', async () => {
  const app = await createTestApp({
    modules: [PlatformModule],
    staticRoot: resolve(__dirname, 'fixtures/static'),
  });
  try {
    const health = await fetch(app.baseUrl + '/healthz');
    expect(health.status).toBe(200);
    expect(health.headers.get('content-type')).toMatch(/^application\/json/);
    expect(await health.json()).toEqual({ status: 'ok', version: '0.0.0-dev' });

    const response = await fetch(app.baseUrl + '/api/platform/version');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual([
      'builtAt',
      'composeVersion',
      'revision',
      'version',
    ]);
    expect(() => versionInfoSchema.parse(body)).not.toThrow();
    expect(body.version).toBe('0.0.0-dev');
    expect(Number.isInteger(body.composeVersion)).toBe(true);
  } finally {
    await app.close();
  }
});
