import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import {
  helloDataSchema,
  platformEventSchema,
} from '@bbartolome/scriba-contracts/platform';
import { PlatformModule } from '../src/modules/platform/platform.module';
import { createTestApp } from './create-test-app';
import { dataOf, openSse } from './sse';

it('GET /events sends retry: 3000, then platform/hello as the first block', async () => {
  const app = await createTestApp({
    modules: [PlatformModule],
    staticRoot: resolve(__dirname, 'fixtures/static'),
  });
  const stream = await openSse(app.baseUrl + '/events');
  try {
    const block = await stream.next(2000);
    expect(block.startsWith('retry: 3000\ndata: ')).toBe(true);
    expect(block.split('\n')).toHaveLength(2);

    const event = platformEventSchema.parse(JSON.parse(dataOf(block)));
    expect(event.type).toBe('hello');
    const data = helloDataSchema.parse(event.data);
    expect(data.streamId).not.toBe('');
    expect(data.version).toBe('0.0.0-dev');
  } finally {
    await stream.cancel();
    await app.close();
  }
});
