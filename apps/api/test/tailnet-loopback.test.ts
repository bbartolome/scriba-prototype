import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { createTestApp } from './create-test-app';

it('a real loopback connection to the test app is served', async () => {
  const app = await createTestApp({
    staticRoot: resolve(__dirname, 'fixtures/static'),
  });
  try {
    const response = await fetch(app.baseUrl + '/healthz');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: 'ok',
      version: '0.0.0-dev',
    });
  } finally {
    await app.close();
  }
});
