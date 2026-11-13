import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';
import {
  collectStream,
  streamChat,
  type ChatMessage,
  type StreamEvent,
} from '../src/modules/providers/client';
import {
  expectCoded,
  recordsOf,
  resetScenario,
  startMockOpenAI,
  targetFor,
  type MockOpenAI,
} from './providers-client.kit';

const KEY = 'sk-test-key-0001';
const USER: ChatMessage = { role: 'user', content: 'echo hello world' };
const SCENARIOS = [
  'stalled',
  'stream-with-gaps',
  'long-stream',
  'unavailable-persistent',
];

let mock: MockOpenAI;

beforeAll(async () => {
  mock = await startMockOpenAI();
});

afterAll(async () => {
  await mock.close();
});

beforeEach(async () => {
  for (const scenario of SCENARIOS) {
    await resetScenario(mock, scenario);
  }
});

async function drain(events: AsyncIterable<StreamEvent>): Promise<void> {
  for await (const event of events) {
    void event;
  }
}

function sleepFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('providers client: timeout and abort', () => {
  test('criterion 5: a stalled response fails with PROVIDER_TIMEOUT after timeout', async () => {
    const target = targetFor(mock, 'stalled', {
      key: KEY,
      timeout: 300,
      retries: 0,
    });

    const started = performance.now();
    await expectCoded(
      collectStream(streamChat(target, { messages: [USER] })),
      'PROVIDER_TIMEOUT',
    );
    const elapsed = performance.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(250);
    expect(elapsed).toBeLessThanOrEqual(4000);

    await vi.waitFor(async () => {
      const [record] = await recordsOf(mock, 'stalled');
      expect(record?.closedByClient).toBe(true);
    });
  });

  test('criterion 5: a slow stream whose gaps are under timeout completes', async () => {
    const target = targetFor(mock, 'stream-with-gaps', {
      key: KEY,
      timeout: 500,
      retries: 0,
    });

    const started = performance.now();
    const collected = await collectStream(
      streamChat(target, { messages: [USER] }),
    );
    const elapsed = performance.now() - started;

    expect(collected.text).toBe('abcd');
    expect(collected.finishReason).toBe('stop');
    expect(elapsed).toBeGreaterThanOrEqual(700);
  });

  test('criterion 6: abort mid-stream ends with PROVIDER_ABORTED and the mock sees the close', async () => {
    const target = targetFor(mock, 'long-stream', {
      key: KEY,
      timeout: 5000,
      retries: 0,
    });
    const controller = new AbortController();
    const events = streamChat(target, {
      messages: [USER],
      signal: controller.signal,
    })[Symbol.asyncIterator]();

    const first = await events.next();
    expect(first.value).toEqual({ type: 'text-delta', text: 't00' });
    const second = await events.next();
    expect(second.value).toEqual({ type: 'text-delta', text: 't01' });

    controller.abort();
    const started = performance.now();
    await expectCoded(drain(events), 'PROVIDER_ABORTED');
    expect(performance.now() - started).toBeLessThan(1000);

    await vi.waitFor(async () => {
      const [record] = await recordsOf(mock, 'long-stream');
      expect(record?.closedByClient).toBe(true);
    });
  });

  test('criterion 6: abort during the retry wait makes no further attempt', async () => {
    const target = targetFor(mock, 'unavailable-persistent', {
      key: KEY,
      retries: 2,
    });
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100);

    await expectCoded(
      collectStream(
        streamChat(target, { messages: [USER], signal: controller.signal }),
      ),
      'PROVIDER_ABORTED',
    );

    await sleepFor(800);
    const records = await recordsOf(mock, 'unavailable-persistent');
    expect(records).toHaveLength(1);
  });

  test('D10: a connection lost after tokens reached the caller fails with PROVIDER_UNREACHABLE and is not retried', async () => {
    const own = await startMockOpenAI();
    try {
      const target = targetFor(own, 'long-stream', {
        key: KEY,
        timeout: 5000,
        retries: 2,
      });
      const events = streamChat(target, { messages: [USER] })[
        Symbol.asyncIterator
      ]();
      const first = await events.next();
      expect(first.value).toEqual({ type: 'text-delta', text: 't00' });
      const second = await events.next();
      expect(second.value).toEqual({ type: 'text-delta', text: 't01' });

      const before = await recordsOf(own, 'long-stream');
      expect(before).toHaveLength(1);
      expect(before[0]?.attempt).toBe(1);

      await own.close();
      const closedAt = performance.now();
      await expectCoded(drain(events), 'PROVIDER_UNREACHABLE');
      // A retry would first wait 500 ms, the first backoff, so this bound is the no-retry evidence.
      expect(performance.now() - closedAt).toBeLessThan(400);
    } finally {
      await own.close().catch(() => undefined);
    }
  });

  test('D11: timeout 0 still ends a silent stream with PROVIDER_TIMEOUT', async () => {
    const target = targetFor(mock, 'stalled', {
      key: KEY,
      timeout: 0,
      retries: 0,
    });

    const started = performance.now();
    await expectCoded(
      collectStream(
        streamChat(target, { messages: [USER], zeroTimeoutLimitMs: 300 }),
      ),
      'PROVIDER_TIMEOUT',
    );
    const elapsed = performance.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(250);
    expect(elapsed).toBeLessThanOrEqual(4000);

    await vi.waitFor(async () => {
      const [record] = await recordsOf(mock, 'stalled');
      expect(record?.closedByClient).toBe(true);
    });
  });
});
