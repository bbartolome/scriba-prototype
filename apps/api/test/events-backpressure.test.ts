import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import {
  ECHO_ROUTE,
  echoDataSchema,
  platformEventSchema,
} from '@bbartolome/scriba-contracts/platform';
import { PlatformModule } from '../src/modules/platform/platform.module';
import { createTestApp } from './create-test-app';
import { WriteLimitModule } from './events-write-limit';
import { dataOf, openSse, type OpenSse } from './sse';

const TOTAL = 100000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Polls until the condition holds, or fails at the deadline. The condition may throw.
async function waitFor(
  condition: () => boolean,
  ms: number,
  what: string,
): Promise<void> {
  const deadline = Date.now() + ms;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await sleep(5);
  }
}

// Resolves when the promise settles or after ms, whichever comes first. The promise keeps running.
function within(promise: Promise<void>, ms: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  return Promise.race([
    promise,
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

it('closes a stream whose client stops reading once the buffer limit is passed, and the other streams keep receiving', async () => {
  const app = await createTestApp({
    staticRoot: resolve(__dirname, 'fixtures/static'),
    modules: [PlatformModule, WriteLimitModule],
  });
  const post = (body: unknown): Promise<Response> =>
    fetch(app.baseUrl + ECHO_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  let healthy: OpenSse | undefined;
  let stalledReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    // Stalled client S: connects, and its body is never read.
    const stalled = await fetch(app.baseUrl + '/events', {
      headers: { accept: 'text/event-stream' },
    });

    // Healthy client H: its echo seq values are collected in the background.
    const stream = await openSse(app.baseUrl + '/events');
    healthy = stream;
    await stream.next(2000); // hello
    const seqs: number[] = [];
    let collectorError: unknown;
    void (async () => {
      for (;;) {
        const block = await stream.next(20000);
        if (block.startsWith(':')) continue; // heartbeat comment
        const event = platformEventSchema.parse(JSON.parse(dataOf(block)));
        seqs.push(echoDataSchema.parse(event.data).seq);
      }
    })().catch((error: unknown) => {
      collectorError = error;
    });

    const response = await post({ count: TOTAL, intervalMs: 0 });
    expect(response.status).toBe(202);
    await response.arrayBuffer();
    await waitFor(
      () => {
        if (collectorError !== undefined) throw collectorError;
        return seqs.length === TOTAL;
      },
      20000,
      'the healthy stream to receive every echo',
    );

    // Drain S under a deadline. A stream the server closed ends with an error, which is expected.
    const body = stalled.body;
    if (!body) throw new Error('no body on the stalled stream');
    const reader = body.getReader();
    stalledReader = reader;
    const decoder = new TextDecoder();
    let stalledText = '';
    const drained = (async (): Promise<void> => {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) return;
          stalledText += decoder.decode(value, { stream: true });
        }
      } catch {
        // The server destroyed the stream; the text read so far is what counts.
      }
    })();
    await within(drained, 10000);
    const stalledEchoes = (stalledText.match(/"type":"echo"/g) ?? []).length;
    expect(stalledEchoes).toBeLessThan(TOTAL);

    // The healthy stream was not affected: one more echo still reaches it, after the whole run.
    const last = await post({ count: 1, intervalMs: 0 });
    expect(last.status).toBe(202);
    await last.arrayBuffer();
    await waitFor(
      () => seqs.length === TOTAL + 1,
      2000,
      'the final echo on the healthy stream',
    );
    expect(seqs).toEqual([
      ...Array.from({ length: TOTAL }, (_, i) => i + 1),
      1,
    ]);
  } finally {
    await healthy?.cancel();
    await stalledReader?.cancel().catch(() => undefined);
    await app.close();
  }
}, 40000);
