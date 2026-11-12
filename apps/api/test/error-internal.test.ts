import { expect, it, vi } from 'vitest';
import { PlatformModule } from '../src/modules/platform/platform.module';
import { createTestApp } from './create-test-app';
import { ErrorProbeModule } from './error-probe';

it('a thrown plain Error returns 500 PLATFORM_INTERNAL with no stack in the body, and the error is logged to stdout', async () => {
  const app = await createTestApp({
    modules: [PlatformModule, ErrorProbeModule],
  });
  const written: string[] = [];
  const spy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: string | Uint8Array) => {
      written.push(chunk.toString());
      return true;
    });
  try {
    const response = await fetch(
      app.baseUrl + '/api/platform/probe/plain-error',
    );
    const text = await response.text();
    expect(response.status).toBe(500);
    expect(JSON.parse(text)).toEqual({
      error: { code: 'PLATFORM_INTERNAL', message: 'Internal server error.' },
    });
    expect(text).not.toContain('probe boom');
    expect(text).not.toMatch(/^\s+at /m);

    const stdout = written.join('');
    expect(stdout).toContain('probe boom');
    expect(stdout).toMatch(/^\s+at /m);
  } finally {
    spy.mockRestore();
    await app.close();
  }
});
