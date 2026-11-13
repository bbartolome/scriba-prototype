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
  type StreamEvent,
} from '../src/modules/providers/client';
import {
  recordsOf,
  resetScenario,
  startMockOpenAI,
  targetFor,
  type MockOpenAI,
} from './providers-client.kit';

const KEY = 'sk-test-key-0001';
const USER: ChatMessage = { role: 'user', content: 'echo hello world' };
const ECHO_TOOL = {
  type: 'function' as const,
  function: {
    name: 'echo_text',
    description: 'Echo the given text.',
    parameters: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
    },
  },
};

let mock: MockOpenAI;

beforeAll(async () => {
  mock = await startMockOpenAI();
});

afterAll(async () => {
  await mock.close();
});

beforeEach(async () => {
  await resetScenario(mock, 'tool-call');
  await resetScenario(mock, 'malformed-tool-call');
});

async function eventsOf(
  events: AsyncIterable<StreamEvent>,
): Promise<StreamEvent[]> {
  const out: StreamEvent[] = [];
  for await (const event of events) {
    out.push(event);
  }
  return out;
}

describe('providers client: streaming', () => {
  test('criterion 1: a streamed chat yields text deltas, one assembled tool call, then finish', async () => {
    const target = targetFor(mock, 'tool-call', { key: KEY, retries: 0 });
    const request = {
      messages: [USER],
      tools: [ECHO_TOOL],
      toolChoice: 'auto' as const,
    };

    const events = await eventsOf(streamChat(target, request));
    expect(events).toEqual([
      { type: 'text-delta', text: 'Let me check. ' },
      {
        type: 'tool-call',
        id: 'call_mock_0',
        name: 'echo_text',
        arguments: '{"text": "hello world"}',
      },
      { type: 'finish', reason: 'tool-calls' },
    ]);

    const collected = await collectStream(streamChat(target, request));
    expect(collected.text).toBe('Let me check. ');
    expect(collected.toolCalls).toEqual([
      {
        id: 'call_mock_0',
        name: 'echo_text',
        arguments: '{"text": "hello world"}',
      },
    ]);
    expect(collected.finishReason).toBe('tool-calls');

    const records = await recordsOf(mock, 'tool-call');
    expect(records).toHaveLength(2);
    expect(records[0]?.endpoint).toBe('chat');
    expect(records[0]?.step).toBe(1);
    const body = records[0]?.body as Record<string, unknown>;
    expect(body.tools).toEqual([ECHO_TOOL]);
    expect(body.tool_choice).toBe('auto');
    expect(body.temperature).toBe(0.7);
    expect(body.max_tokens).toBe(4096);
    expect(body).not.toHaveProperty('contextSize');
  });

  test('criterion 1: a tool result sent back maps to the wire shape and the final answer streams', async () => {
    const target = targetFor(mock, 'tool-call', { key: KEY, retries: 0 });
    const messages: ChatMessage[] = [
      USER,
      {
        role: 'assistant',
        toolCalls: [
          {
            id: 'call_mock_0',
            name: 'echo_text',
            arguments: '{"text": "hello world"}',
          },
        ],
      },
      { role: 'tool', toolCallId: 'call_mock_0', content: 'hello world' },
    ];

    const events = await eventsOf(
      streamChat(target, { messages, tools: [ECHO_TOOL] }),
    );
    expect(events).toEqual([
      { type: 'text-delta', text: 'The tool returned: ' },
      { type: 'text-delta', text: 'hello world.' },
      { type: 'finish', reason: 'stop' },
    ]);

    const [record] = await recordsOf(mock, 'tool-call');
    expect(record?.step).toBe(2);
    const sent = (record?.body as { messages: Record<string, unknown>[] })
      .messages;
    expect(sent[1]).toMatchObject({
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'call_mock_0',
          type: 'function',
          function: {
            name: 'echo_text',
            arguments: '{"text": "hello world"}',
          },
        },
      ],
    });
    expect(sent[2]).toEqual({
      role: 'tool',
      tool_call_id: 'call_mock_0',
      content: 'hello world',
    });
  });

  test('criterion 2: a malformed tool call is passed through as its raw string', async () => {
    const target = targetFor(mock, 'malformed-tool-call', { key: KEY });

    const events = await eventsOf(
      streamChat(target, { messages: [USER], tools: [ECHO_TOOL] }),
    );
    expect(events).toEqual([
      {
        type: 'tool-call',
        id: 'call_mock_0',
        name: 'echo_text',
        arguments: '{"text": "hello world',
      },
      { type: 'finish', reason: 'tool-calls' },
    ]);

    const [record] = await recordsOf(mock, 'malformed-tool-call');
    expect(record?.step).toBe(1);
    expect(record?.attempt).toBe(1);
  });
});
