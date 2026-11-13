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
const SCENARIOS = ['unknown-model', 'html-200'];

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

describe('providers client: error mapping', () => {
  test('D7: an unknown model fails with PROVIDER_MODEL_NOT_FOUND and is not retried', async () => {
    const target = targetFor(mock, 'unknown-model', { key: KEY, retries: 2 });

    await expectCoded(
      collectStream(streamChat(target, { messages: [USER] })),
      'PROVIDER_MODEL_NOT_FOUND',
    );

    const records = await recordsOf(mock, 'unknown-model');
    expect(records).toHaveLength(1);
  });

  test('D8: a 200 reply that is not an event stream fails with PROVIDER_BAD_RESPONSE', async () => {
    const target = targetFor(mock, 'html-200', { key: KEY, retries: 2 });

    await expectCoded(
      collectStream(streamChat(target, { messages: [USER] })),
      'PROVIDER_BAD_RESPONSE',
    );

    const records = await recordsOf(mock, 'html-200');
    expect(records).toHaveLength(1);
  });

  test('D9: a refused connection fails with PROVIDER_UNREACHABLE', async () => {
    const gone = await startMockOpenAI();
    const target = targetFor(gone, 'text-stream', { key: KEY, retries: 0 });
    await gone.close();

    await expectCoded(
      collectStream(streamChat(target, { messages: [USER] })),
      'PROVIDER_UNREACHABLE',
    );
  });
});
