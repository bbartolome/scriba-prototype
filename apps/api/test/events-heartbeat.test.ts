import { resolve } from 'node:path';
import { expect, it, vi } from 'vitest';
import { PlatformModule } from '../src/modules/platform/platform.module';
import { createTestApp } from './create-test-app';
import { openSse, type OpenSse } from './sse';

it('sends a heartbeat comment every 15 s on an open stream', async () => {
  const app = await createTestApp({
    modules: [PlatformModule],
    staticRoot: resolve(__dirname, 'fixtures/static'),
  });
  // Only the interval timers are faked: the read deadlines use the real setTimeout.
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  let stream: OpenSse | undefined;
  try {
    stream = await openSse(app.baseUrl + '/events');
    await stream.next(2000); // hello

    vi.advanceTimersByTime(15000);
    expect(await stream.next(2000)).toBe(': heartbeat');

    vi.advanceTimersByTime(15000);
    expect(await stream.next(2000)).toBe(': heartbeat');
  } finally {
    vi.useRealTimers();
    await stream?.cancel();
    await app.close();
  }
});
