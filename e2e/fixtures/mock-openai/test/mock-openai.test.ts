import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI, {
  APIConnectionError,
  InternalServerError,
  RateLimitError,
} from 'openai';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import {
  startMockOpenAI,
  type MockOpenAI,
  type MockOpenAIRecord,
} from '../server.mjs';

type Messages = OpenAI.Chat.Completions.ChatCompletionMessageParam[];
type Tool = OpenAI.Chat.Completions.ChatCompletionTool;

const here = path.dirname(fileURLToPath(import.meta.url));
const MODEL = 'mock-model';

const ECHO_TOOL: Tool = {
  type: 'function',
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
const TOOLS: Tool[] = [ECHO_TOOL];
const USER_ASK: Messages = [{ role: 'user', content: 'echo hello world' }];

interface StreamChunk {
  delta: {
    role?: string;
    content?: string | null;
    tool_calls?: Array<{
      index: number;
      id?: string;
      type?: string;
      function?: { name?: string; arguments?: string };
    }>;
  };
  finish_reason: string | null;
}

interface CollectedToolCall {
  index: number;
  id: string;
  type: string;
  name: string;
  arguments: string;
}

interface CollectedStream {
  chunks: StreamChunk[];
  content: string;
  toolCalls: CollectedToolCall[];
  finishReason: string | null;
}

let shipped: MockOpenAI;
let faults: MockOpenAI;

beforeAll(async () => {
  shipped = await startMockOpenAI();
  faults = await startMockOpenAI({
    scenariosDir: path.join(here, 'scenarios'),
  });
});

afterAll(async () => {
  await shipped.close();
  await faults.close();
});

function clientFor(server: MockOpenAI, scenario: string): OpenAI {
  return new OpenAI({
    apiKey: 'test-key',
    baseURL: `${server.baseUrl}/scenario/${scenario}/v1`,
    maxRetries: 0,
  });
}

async function resetScenario(
  server: MockOpenAI,
  scenario: string,
): Promise<void> {
  const res = await fetch(
    `${server.baseUrl}/__mock/scenarios/${scenario}/reset`,
    {
      method: 'POST',
    },
  );
  expect(res.status).toBe(204);
}

async function recordsOf(
  server: MockOpenAI,
  scenario: string,
): Promise<MockOpenAIRecord[]> {
  const res = await fetch(
    `${server.baseUrl}/__mock/scenarios/${scenario}/requests`,
  );
  expect(res.status).toBe(200);
  return (await res.json()) as MockOpenAIRecord[];
}

async function errorOf(call: Promise<unknown>): Promise<unknown> {
  try {
    await call;
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to reject, but it resolved');
}

async function collectStream(
  server: MockOpenAI,
  scenario: string,
  body: Record<string, unknown>,
): Promise<CollectedStream> {
  const res = await fetch(
    `${server.baseUrl}/scenario/${scenario}/v1/chat/completions`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer test-key',
      },
      body: JSON.stringify({ model: MODEL, ...body, stream: true }),
    },
  );
  expect(res.status).toBe(200);
  const text = await res.text();
  expect(text.trimEnd().endsWith('data: [DONE]')).toBe(true);

  const chunks: StreamChunk[] = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      const payload = JSON.parse(line.slice('data: '.length)) as {
        choices: StreamChunk[];
      };
      chunks.push(payload.choices[0] as StreamChunk);
    }
  }

  const content = chunks.map((chunk) => chunk.delta.content ?? '').join('');
  const calls = new Map<number, CollectedToolCall>();
  for (const chunk of chunks) {
    for (const part of chunk.delta.tool_calls ?? []) {
      const call = calls.get(part.index) ?? {
        index: part.index,
        id: '',
        type: '',
        name: '',
        arguments: '',
      };
      if (part.id !== undefined) call.id = part.id;
      if (part.type !== undefined) call.type = part.type;
      if (part.function?.name !== undefined) call.name = part.function.name;
      call.arguments += part.function?.arguments ?? '';
      calls.set(part.index, call);
    }
  }
  const finishReason =
    chunks
      .map((chunk) => chunk.finish_reason)
      .filter((r) => r !== null)
      .at(-1) ?? null;
  return {
    chunks,
    content,
    toolCalls: [...calls.values()].sort((a, b) => a.index - b.index),
    finishReason,
  };
}

async function streamFirstCall(
  server: MockOpenAI,
): Promise<{ first: CollectedStream; call: CollectedToolCall }> {
  const first = await collectStream(server, 'tool-call', {
    messages: USER_ASK,
    tools: TOOLS,
  });
  const opening = first.chunks.findIndex(
    (chunk) => chunk.delta.tool_calls !== undefined,
  );
  expect(opening).toBeGreaterThan(0);
  expect(first.chunks[0]?.delta.role).toBe('assistant');
  const textBefore = first.chunks
    .slice(0, opening)
    .map((chunk) => chunk.delta.content ?? '')
    .join('');
  expect(textBefore).toBe('Let me check. ');

  const openingCall = first.chunks[opening]?.delta.tool_calls?.[0];
  expect(openingCall?.type).toBe('function');
  expect(openingCall?.function?.name).toBe('echo_text');

  const fragmentChunks = first.chunks.filter((chunk) =>
    (chunk.delta.tool_calls ?? []).some(
      (part) => (part.function?.arguments ?? '') !== '',
    ),
  );
  expect(fragmentChunks.length).toBeGreaterThanOrEqual(2);

  const call = first.toolCalls[0];
  if (!call) throw new Error('the first streamed call holds no tool call');
  expect(call.name).toBe('echo_text');
  expect(JSON.parse(call.arguments)).toEqual({ text: 'hello world' });
  expect(first.finishReason).toBe('tool_calls');
  return { first, call };
}

async function streamSecondCall(
  server: MockOpenAI,
  call: CollectedToolCall,
): Promise<CollectedStream> {
  const second = await collectStream(server, 'tool-call', {
    messages: [
      { role: 'user', content: 'echo hello world' },
      {
        role: 'assistant',
        content: 'Let me check. ',
        tool_calls: [
          {
            id: call.id,
            type: 'function',
            function: { name: call.name, arguments: call.arguments },
          },
        ],
      },
      { role: 'tool', tool_call_id: call.id, content: 'hello world' },
    ],
    tools: TOOLS,
  });
  expect(second.content).toBe('The tool returned: hello world.');
  expect(second.finishReason).toBe('stop');
  return second;
}

async function malformedFlow(server: MockOpenAI): Promise<void> {
  const client = clientFor(server, 'malformed-tool-call');
  const request = { model: MODEL, messages: USER_ASK, tools: TOOLS };

  const first = await client.chat.completions.create(request);
  const firstCall = first.choices[0]?.message.tool_calls?.[0];
  if (firstCall?.type !== 'function')
    throw new Error('expected a function tool call');
  expect(firstCall.function.name).toBe('echo_text');
  expect(() => JSON.parse(firstCall.function.arguments)).toThrow();

  const second = await client.chat.completions.create(request);
  const secondCall = second.choices[0]?.message.tool_calls?.[0];
  if (secondCall?.type !== 'function')
    throw new Error('expected a function tool call');
  expect(secondCall.function.name).toBe('echo_text');
  expect(JSON.parse(secondCall.function.arguments)).toEqual({
    text: 'hello world',
  });
}

describe('shipped scenarios', () => {
  test('criterion 1: tool-call scenario streams a tool call split across chunks, then a final text answer', async () => {
    await resetScenario(shipped, 'tool-call');
    const client = clientFor(shipped, 'tool-call');

    const models = await client.models.list();
    expect(models.data[0]?.id).toBe('mock-model');

    const { call } = await streamFirstCall(shipped);

    const streamed = await client.chat.completions
      .stream({ model: MODEL, messages: USER_ASK, tools: TOOLS })
      .finalChatCompletion();
    const streamedMessage = streamed.choices[0]?.message;
    expect(streamedMessage?.content).toBe('Let me check. ');
    expect(streamedMessage?.tool_calls).toHaveLength(1);
    const streamedCall = streamedMessage?.tool_calls?.[0];
    if (streamedCall?.type !== 'function')
      throw new Error('expected a function tool call');
    expect(streamedCall.function.name).toBe('echo_text');
    expect(JSON.parse(streamedCall.function.arguments)).toEqual({
      text: 'hello world',
    });

    const plain = await client.chat.completions.create({
      model: MODEL,
      messages: USER_ASK,
      tools: TOOLS,
    });
    const plainChoice = plain.choices[0];
    expect(plainChoice?.message.role).toBe('assistant');
    expect(plainChoice?.message.content).toBe('Let me check. ');
    const plainCall = plainChoice?.message.tool_calls?.[0];
    if (plainCall?.type !== 'function')
      throw new Error('expected a function tool call');
    expect(plainCall.function.name).toBe('echo_text');
    expect(plainChoice?.finish_reason).toBe('tool_calls');

    await streamSecondCall(shipped, call);
  });

  test('criterion 2: malformed-tool-call returns invalid arguments first and valid ones on the retry', async () => {
    await resetScenario(shipped, 'malformed-tool-call');
    await malformedFlow(shipped);
  });

  test('criterion 3: a scenario returns a status with headers, a delay, and a dropped connection', async () => {
    await resetScenario(faults, 'faults');
    const client = clientFor(faults, 'faults');
    const messages: Messages = [{ role: 'user', content: 'hi' }];
    const request = { model: MODEL, messages };

    const limited = await errorOf(client.chat.completions.create(request));
    expect(limited).toBeInstanceOf(RateLimitError);
    const rateError = limited as RateLimitError;
    expect(rateError.status).toBe(429);
    expect(rateError.headers.get('retry-after')).toBe('1');

    const startedAt = performance.now();
    const delayed = await client.chat.completions.create(request);
    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(400);
    expect(delayed.choices[0]?.message.content).toBe('ok');

    const dropped = await errorOf(client.chat.completions.create(request));
    expect(dropped).toBeInstanceOf(APIConnectionError);

    const recs = await recordsOf(faults, 'faults');
    expect(recs.map((r) => r.attempt)).toEqual([1, 2, 3]);
    expect(recs.map((r) => r.step)).toEqual([0, 1, 2]);
  });

  test('criterion 4: recorded requests are readable and resettable per scenario', async () => {
    await resetScenario(shipped, 'tool-call');
    await resetScenario(shipped, 'malformed-tool-call');
    await resetScenario(faults, 'slow');

    const { call } = await streamFirstCall(shipped);
    await streamSecondCall(shipped, call);

    const malformed = clientFor(shipped, 'malformed-tool-call');
    await malformed.chat.completions.create({
      model: MODEL,
      messages: USER_ASK,
      tools: TOOLS,
    });

    const toolRecords = await recordsOf(shipped, 'tool-call');
    expect(toolRecords.map((r) => r.attempt)).toEqual([1, 2]);
    expect(toolRecords.map((r) => r.step)).toEqual([1, 2]);
    for (const record of toolRecords) {
      expect(record.headers.authorization).toBe('Bearer test-key');
      expect(
        Array.isArray((record.body as { messages?: unknown }).messages),
      ).toBe(true);
    }
    const malformedRecords = await recordsOf(shipped, 'malformed-tool-call');
    expect(malformedRecords).toHaveLength(1);

    await resetScenario(shipped, 'tool-call');
    expect(await recordsOf(shipped, 'tool-call')).toEqual([]);
    expect(await recordsOf(shipped, 'malformed-tool-call')).toHaveLength(1);

    const controller = new AbortController();
    const slowClient = clientFor(faults, 'slow');
    const slowCall = slowClient.chat.completions.create(
      { model: MODEL, messages: [{ role: 'user', content: 'slow' }] },
      { signal: controller.signal },
    );
    setTimeout(() => controller.abort(), 100);
    await errorOf(slowCall);

    await vi.waitFor(
      async () => {
        const slowRecords = await recordsOf(faults, 'slow');
        expect(slowRecords).toHaveLength(1);
        expect(slowRecords[0]?.closedByClient).toBe(true);
      },
      { timeout: 2000, interval: 50 },
    );

    await resetScenario(faults, 'slow');
    expect(await recordsOf(faults, 'slow')).toEqual([]);
  });

  describe('criterion 5: two scenarios used in parallel on one server do not interfere', () => {
    test.concurrent(
      'criterion 5: tool-call flow runs alongside the malformed flow',
      async () => {
        await resetScenario(shipped, 'tool-call');
        const { call } = await streamFirstCall(shipped);
        await streamSecondCall(shipped, call);
        const recs = await recordsOf(shipped, 'tool-call');
        expect(recs.map((r) => r.step)).toEqual([1, 2]);
      },
    );

    test.concurrent(
      'criterion 5: malformed flow runs alongside the tool-call flow',
      async () => {
        await resetScenario(shipped, 'malformed-tool-call');
        await malformedFlow(shipped);
        const recs = await recordsOf(shipped, 'malformed-tool-call');
        expect(recs.map((r) => r.step)).toEqual([1, 2]);
        expect(recs.map((r) => r.attempt)).toEqual([1, 2]);
      },
    );
  });

  test('criterion 6: npm run mock:openai starts the server and prints its base URL', async () => {
    const repoRoot = path.resolve(here, '../../../..');
    const child = spawn('npm', ['run', 'mock:openai'], {
      cwd: repoRoot,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8');
    });
    const exited = new Promise<void>((resolve) =>
      child.once('exit', () => resolve()),
    );

    let baseUrl = '';
    try {
      await vi.waitFor(
        () => {
          const match =
            /mock OpenAI base URL: (http:\/\/127\.0\.0\.1:\d+)/.exec(output);
          if (!match?.[1])
            throw new Error(`no base URL printed yet: ${output}`);
          baseUrl = match[1];
        },
        { timeout: 15000, interval: 100 },
      );
      const res = await fetch(`${baseUrl}/__mock/scenarios/tool-call/requests`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([]);
    } finally {
      if (child.pid !== undefined) {
        try {
          process.kill(-child.pid, 'SIGTERM');
        } catch {
          // The process group has already exited.
        }
      }
      await exited;
    }

    await vi.waitFor(
      async () => {
        await expect(fetch(`${baseUrl}/`)).rejects.toThrow();
      },
      { timeout: 5000, interval: 100 },
    );
  }, 30_000);
});

describe('matcher: scenario matchers on the test-only matchers scenario', () => {
  test('matcher: header matches only when the named header is present', async () => {
    await resetScenario(faults, 'matchers');
    const client = clientFor(faults, 'matchers');
    const messages: Messages = [{ role: 'user', content: 'hi' }];

    const matched = await client.chat.completions.create(
      { model: MODEL, messages },
      { headers: { 'x-mock-case': 'header' } },
    );
    expect(matched.choices[0]?.message.content).toBe('header-step');

    const unmatched = await errorOf(
      client.chat.completions.create({ model: MODEL, messages }),
    );
    expect(unmatched).toBeInstanceOf(InternalServerError);

    const recs = await recordsOf(faults, 'matchers');
    expect(recs.map((r) => r.step)).toEqual([0, null]);
  });

  test('matcher: turnIndex counts the assistant messages of a chat request', async () => {
    await resetScenario(faults, 'matchers');
    const client = clientFor(faults, 'matchers');
    const messages: Messages = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'ok' },
      { role: 'user', content: 'turn-check' },
    ];

    const reply = await client.chat.completions.create({
      model: MODEL,
      messages,
    });
    expect(reply.choices[0]?.message.content).toBe('turn-step');

    const recs = await recordsOf(faults, 'matchers');
    expect(recs.map((r) => r.step)).toEqual([1]);
  });

  test('matcher: lastMessageRole matches the role of the last message', async () => {
    await resetScenario(faults, 'matchers');
    const client = clientFor(faults, 'matchers');
    const messages: Messages = [
      { role: 'user', content: 'hi' },
      { role: 'tool', tool_call_id: 'call_x', content: 'result' },
    ];

    const reply = await client.chat.completions.create({
      model: MODEL,
      messages,
    });
    expect(reply.choices[0]?.message.content).toBe('role-step');

    const recs = await recordsOf(faults, 'matchers');
    expect(recs.map((r) => r.step)).toEqual([2]);
  });

  test('matcher: lastMessageContent matches a string or the joined text of array parts', async () => {
    await resetScenario(faults, 'matchers');
    const client = clientFor(faults, 'matchers');

    const plain = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: 'content-check' }],
    });
    expect(plain.choices[0]?.message.content).toBe('content-step');

    const parts = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'content-' },
            { type: 'text', text: 'check' },
          ],
        },
      ],
    });
    expect(parts.choices[0]?.message.content).toBe('content-step');

    const recs = await recordsOf(faults, 'matchers');
    expect(recs.map((r) => r.step)).toEqual([3, 3]);
  });

  test('matcher: chunkDelayMs waits before each streamed chunk', async () => {
    await resetScenario(faults, 'matchers');
    const startedAt = performance.now();
    const streamed = await collectStream(faults, 'matchers', {
      messages: [{ role: 'user', content: 'chunk-check' }],
    });
    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(400);
    expect(streamed.content).toBe('abc');

    const recs = await recordsOf(faults, 'matchers');
    expect(recs.map((r) => r.step)).toEqual([4]);
  });
});
