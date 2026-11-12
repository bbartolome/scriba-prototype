import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import {
  ECHO_ROUTE,
  platformEventSchema,
} from '@bbartolome/scriba-contracts/platform';
import { createTestApp } from './create-test-app';
import { dataOf, openSse } from './sse';

it('every message on /events validates against the platform envelope schema', async () => {
  const app = await createTestApp({
    staticRoot: resolve(__dirname, 'fixtures/static'),
  });
  const stream = await openSse(app.baseUrl + '/events');
  try {
    const blocks = [await stream.next(2000)]; // hello
    const response = await fetch(app.baseUrl + ECHO_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ count: 3, intervalMs: 0 }),
    });
    expect(response.status).toBe(202);
    await response.arrayBuffer();
    for (let i = 0; i < 3; i++) blocks.push(await stream.next(2000));

    const messages = blocks.map((block) =>
      platformEventSchema.parse(JSON.parse(dataOf(block))),
    );
    expect(messages.map((message) => message.type)).toEqual([
      'hello',
      'echo',
      'echo',
      'echo',
    ]);
  } finally {
    await stream.cancel();
    await app.close();
  }
});
