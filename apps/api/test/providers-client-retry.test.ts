import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';
import {
  collectStream,
  streamChat,
  type ChatMessage,
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
  'unavailable-then-ok',
  'unavailable-persistent',
  'unauthorized-without-key',
  'rate-limited',
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

describe('providers client: retries', () => {
  test('criterion 3: a 503 then a 200 succeeds within retries', async () => {
    const target = targetFor(mock, 'unavailable-then-ok', {
      key: KEY,
      retries: 2,
    });

    const collected = await collectStream(
      streamChat(target, { messages: [USER] }),
    );
    expect(collected.text).toBe('ok');

    const records = await recordsOf(mock, 'unavailable-then-ok');
    expect(records.map((record) => record.attempt)).toEqual([1, 2]);
    expect(records.map((record) => record.step)).toEqual([0, 1]);
  });

  test('criterion 3: a persistent 503 fails with PROVIDER_BAD_RESPONSE after retries plus one attempts', async () => {
    const target = targetFor(mock, 'unavailable-persistent', {
      key: KEY,
      retries: 2,
    });

    await expectCoded(
      collectStream(streamChat(target, { messages: [USER] })),
      'PROVIDER_BAD_RESPONSE',
    );

    const records = await recordsOf(mock, 'unavailable-persistent');
    expect(records.map((record) => record.attempt)).toEqual([1, 2, 3]);
  });

  test('criterion 3: a 401 fails at once with PROVIDER_UNAUTHORIZED', async () => {
    const target = targetFor(mock, 'unauthorized-without-key', {
      key: 'wrong-key',
      retries: 2,
    });

    const error = await expectCoded(
      collectStream(streamChat(target, { messages: [USER] })),
      'PROVIDER_UNAUTHORIZED',
    );
    expect(error.message).not.toContain('wrong-key');

    const records = await recordsOf(mock, 'unauthorized-without-key');
    expect(records).toHaveLength(1);
  });

  test('criterion 4: a 429 with Retry-After waits at least that long before the retry', async () => {
    const target = targetFor(mock, 'rate-limited', { key: KEY, retries: 2 });

    const started = performance.now();
    const collected = await collectStream(
      streamChat(target, { messages: [USER] }),
    );
    const elapsed = performance.now() - started;

    expect(collected.text).toBe('ok');
    expect(elapsed).toBeGreaterThanOrEqual(2000);
    const records = await recordsOf(mock, 'rate-limited');
    expect(records).toHaveLength(3);
  });

  test('D3: a 429 that persists fails with PROVIDER_RATE_LIMITED', async () => {
    const target = targetFor(mock, 'rate-limited', { key: KEY, retries: 1 });

    await expectCoded(
      collectStream(streamChat(target, { messages: [USER] })),
      'PROVIDER_RATE_LIMITED',
    );

    const records = await recordsOf(mock, 'rate-limited');
    expect(records).toHaveLength(2);
  });
});
