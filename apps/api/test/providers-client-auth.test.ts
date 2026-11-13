import {
  afterAll,
  afterEach,
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

// Environment variables the SDK reads on its own. Each one carries a value that must never reach a request.
const SDK_ENV: Record<string, string> = {
  OPENAI_API_KEY: 'env-key-must-not-be-used',
  OPENAI_BASE_URL: 'http://127.0.0.1:9/env-base-must-not-be-used/v1',
  OPENAI_ORG_ID: 'env-org-must-not-be-used',
  OPENAI_PROJECT_ID: 'env-project-must-not-be-used',
  OPENAI_ADMIN_KEY: 'admin-key-must-not-be-used',
  OPENAI_WEBHOOK_SECRET: 'env-webhook-must-not-be-used',
  OPENAI_LOG: 'debug',
  OPENAI_CUSTOM_HEADERS:
    'Authorization: Bearer env-key-must-not-be-used\nx-marker: env-marker',
};

let mock: MockOpenAI;
const saved: Record<string, string | undefined> = {};

beforeAll(async () => {
  mock = await startMockOpenAI();
});

afterAll(async () => {
  await mock.close();
});

beforeEach(async () => {
  await resetScenario(mock, 'text-stream');
  for (const [name, value] of Object.entries(SDK_ENV)) {
    saved[name] = process.env[name];
    process.env[name] = value;
  }
});

afterEach(() => {
  for (const name of Object.keys(SDK_ENV)) {
    const original = saved[name];
    if (original === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = original;
    }
  }
  vi.restoreAllMocks();
});

describe('providers client: authorization', () => {
  test('criterion 7: the key reaches the mock only in the Authorization header', async () => {
    const target = targetFor(mock, 'text-stream', { key: KEY, retries: 0 });

    const collected = await collectStream(
      streamChat(target, { messages: [USER] }),
    );
    expect(collected.text).toBe('Hello world');

    const [record] = await recordsOf(mock, 'text-stream');
    expect(record?.headers.authorization).toBe(`Bearer ${KEY}`);
    for (const [name, value] of Object.entries(record?.headers ?? {})) {
      if (name !== 'authorization') {
        expect(value).not.toContain(KEY);
      }
    }
    expect(JSON.stringify(record?.body)).not.toContain(KEY);
  });

  test('criterion 7: SDK environment variables cannot change a request', async () => {
    const consoleSpies = ['log', 'info', 'warn', 'error', 'debug'].map(
      (method) =>
        vi
          .spyOn(console, method as 'log' | 'info' | 'warn' | 'error' | 'debug')
          .mockImplementation(() => undefined),
    );
    const target = targetFor(mock, 'text-stream', { key: KEY, retries: 0 });

    const collected = await collectStream(
      streamChat(target, { messages: [USER] }),
    );
    expect(collected.text).toBe('Hello world');

    const [record] = await recordsOf(mock, 'text-stream');
    expect(record?.headers.authorization).toBe(`Bearer ${KEY}`);
    expect(record?.headers).not.toHaveProperty('openai-organization');
    expect(record?.headers).not.toHaveProperty('openai-project');
    expect(record?.headers).not.toHaveProperty('x-marker');
    const everything = JSON.stringify([record?.headers, record?.body]);
    expect(everything).not.toContain('env-key-must-not-be-used');
    expect(everything).not.toContain('admin-key-must-not-be-used');
    for (const spy of consoleSpies) {
      expect(spy).not.toHaveBeenCalled();
    }
  });

  test('D1: a keyless target sends the placeholder key', async () => {
    const target = targetFor(mock, 'text-stream', { retries: 0 });

    await collectStream(streamChat(target, { messages: [USER] }));

    const [record] = await recordsOf(mock, 'text-stream');
    expect(record?.headers.authorization).toBe('Bearer scriba-keyless');
  });

  test('D2: no model, or a keyRef without a key, fails with PROVIDER_NOT_CONFIGURED before any request', async () => {
    await expectCoded(
      collectStream(
        streamChat(targetFor(mock, 'text-stream', { model: '' }), {
          messages: [USER],
        }),
      ),
      'PROVIDER_NOT_CONFIGURED',
    );
    await expectCoded(
      collectStream(
        streamChat(
          targetFor(mock, 'text-stream', { keyRef: 'providers/mock' }),
          {
            messages: [USER],
          },
        ),
      ),
      'PROVIDER_NOT_CONFIGURED',
    );

    expect(await recordsOf(mock, 'text-stream')).toHaveLength(0);

    // An empty key is no key (coordinator decision on the Opus review of MPR-04).
    // A keyRef with an empty key is not configured, and sends no request.
    await expectCoded(
      collectStream(
        streamChat(
          targetFor(mock, 'text-stream', { keyRef: 'providers/mock', key: '' }),
          {
            messages: [USER],
          },
        ),
      ),
      'PROVIDER_NOT_CONFIGURED',
    );
    expect(await recordsOf(mock, 'text-stream')).toHaveLength(0);

    // A keyless target with an empty key sends the placeholder, not an empty bearer.
    await collectStream(
      streamChat(targetFor(mock, 'text-stream', { key: '', retries: 0 }), {
        messages: [USER],
      }),
    );
    const records = await recordsOf(mock, 'text-stream');
    expect(records).toHaveLength(1);
    expect(records[0]?.headers.authorization).toBe('Bearer scriba-keyless');
  });
});
