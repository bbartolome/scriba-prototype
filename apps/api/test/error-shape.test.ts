import { expect, it } from 'vitest';
import { errorBodySchema } from '@bbartolome/scriba-contracts/platform';
import { PlatformModule } from '../src/modules/platform/platform.module';
import { createTestApp } from './create-test-app';
import { ErrorProbeModule } from './error-probe';

function postJson(url: string, body?: string): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
}

it('every error body validates against the /platform error schema and has only the error key', async () => {
  const app = await createTestApp({
    modules: [PlatformModule, ErrorProbeModule],
  });
  try {
    const responses = [
      await fetch(app.baseUrl + '/api/platform/nope'),
      await postJson(
        app.baseUrl + '/api/platform/probe/validate',
        JSON.stringify({ count: 0 }),
      ),
      await postJson(
        app.baseUrl + '/api/platform/probe/validate',
        JSON.stringify({ count: 1, pad: 'x'.repeat(200 * 1024) }),
      ),
      await fetch(app.baseUrl + '/api/platform/probe/plain-error'),
      await postJson(app.baseUrl + '/api/platform/probe/module-error'),
    ];
    expect(responses.map((response) => response.status)).toEqual([
      404, 400, 413, 500, 502,
    ]);
    for (const response of responses) {
      const body: unknown = await response.json();
      expect(() => errorBodySchema.parse(body)).not.toThrow();
      // errorBodySchema strips unknown keys, so the key list is checked here.
      expect(Object.keys(body as object)).toEqual(['error']);
    }
  } finally {
    await app.close();
  }
});
