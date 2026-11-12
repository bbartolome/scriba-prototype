import { expect, it } from 'vitest';
import { PlatformModule } from '../src/modules/platform/platform.module';
import { createTestApp } from './create-test-app';
import { ErrorProbeModule } from './error-probe';

it('a module error with a custom code and status is returned unchanged in the base shape', async () => {
  const app = await createTestApp({
    modules: [PlatformModule, ErrorProbeModule],
  });
  try {
    const response = await fetch(
      app.baseUrl + '/api/platform/probe/module-error',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      },
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: {
        code: 'PROVIDER_UNREACHABLE',
        message: 'Provider is unreachable.',
        details: { provider: 'ollama' },
      },
    });
  } finally {
    await app.close();
  }
});
