import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { createTestApp } from './create-test-app';

it('GET /events is sent as text/event-stream with Cache-Control no-cache, no-transform and no Content-Encoding', async () => {
  const app = await createTestApp({
    staticRoot: resolve(__dirname, 'fixtures/static'),
  });
  const response = await fetch(app.baseUrl + '/events', {
    headers: {
      accept: 'text/event-stream',
      'accept-encoding': 'gzip, deflate, br',
    },
  });
  try {
    expect(response.headers.get('content-type')).toMatch(/^text\/event-stream/);
    expect(response.headers.get('cache-control')).toBe(
      'no-cache, no-transform',
    );
    expect(response.headers.get('content-encoding')).toBeNull();
  } finally {
    await response.body?.cancel();
    await app.close();
  }
});
