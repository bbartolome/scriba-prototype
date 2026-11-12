import { expect, it } from 'vitest';
import { errorBodySchema } from '@bbartolome/scriba-contracts/platform';
import { PlatformModule } from '../src/modules/platform/platform.module';
import { createTestApp } from './create-test-app';
import { ErrorProbeModule } from './error-probe';

// 200 KB is above the 100 KB default JSON limit (PLT-05 open point 1).
it('a body over the limit returns 413 PLATFORM_PAYLOAD_TOO_LARGE', async () => {
  const app = await createTestApp({
    modules: [PlatformModule, ErrorProbeModule],
  });
  try {
    const response = await fetch(app.baseUrl + '/api/platform/probe/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ count: 1, pad: 'x'.repeat(200 * 1024) }),
    });
    expect(response.status).toBe(413);
    const body: unknown = await response.json();
    expect(() => errorBodySchema.parse(body)).not.toThrow();
    const parsed = errorBodySchema.parse(body);
    expect(parsed.error.code).toBe('PLATFORM_PAYLOAD_TOO_LARGE');
    expect(parsed.error).not.toHaveProperty('details');
  } finally {
    await app.close();
  }
});
