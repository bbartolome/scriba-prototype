import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import {
  ECHO_ROUTE,
  echoDataSchema,
  platformEventSchema,
} from '@bbartolome/scriba-contracts/platform';
import { createTestApp } from './create-test-app';
import { dataOf, openSse } from './sse';

it('POST /api/platform/echo delivers three platform/echo envelopes in seq order to each of two streams', async () => {
  const app = await createTestApp({
    staticRoot: resolve(__dirname, 'fixtures/static'),
  });
  const streamA = await openSse(app.baseUrl + '/events');
  const streamB = await openSse(app.baseUrl + '/events');
  try {
    await streamA.next(2000); // hello
    await streamB.next(2000); // hello

    const response = await fetch(app.baseUrl + ECHO_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ count: 3, intervalMs: 50 }),
    });
    expect(response.status).toBe(202);
    await response.arrayBuffer();

    for (const stream of [streamA, streamB]) {
      const seqs: number[] = [];
      for (let i = 0; i < 3; i++) {
        const block = await stream.next(2000);
        expect(block.startsWith('data: ')).toBe(true);
        expect(block.split('\n')).toHaveLength(1);
        const event = platformEventSchema.parse(JSON.parse(dataOf(block)));
        expect(event.module).toBe('platform');
        expect(event.type).toBe('echo');
        seqs.push(echoDataSchema.parse(event.data).seq);
      }
      expect(seqs).toEqual([1, 2, 3]);
    }
  } finally {
    await streamA.cancel();
    await streamB.cancel();
    await app.close();
  }
});
