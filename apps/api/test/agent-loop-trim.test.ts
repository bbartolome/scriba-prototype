import { expect, it } from 'vitest';
import {
  AGENT_CONVERSATION_ROUTE,
  conversationHistorySchema,
} from '@bbartolome/scriba-contracts/agent-loop';
import {
  get,
  listThenReadSteps,
  observe,
  openHarness,
  readUntilEnded,
  requestsOf,
  startRun,
  writeLongSource,
  type ChatBody,
  type Harness,
} from './agent-loop-transcript.kit';

// Run A reads a 20,000-character file; run B (same conversation) is sent after it. Run B's own step is listed first,
// so it matches on its intent (D22).
const TRIM_STEPS = [
  {
    match: {
      endpoint: 'chat',
      lastMessageRole: 'user',
      lastMessageContent: 'Second question',
    },
    reply: { kind: 'stream', deltas: ['Second answer.'] },
  },
  ...listThenReadSteps('sources/long.md', ['Done.']),
];

// Starts run A, then run B in its conversation. Answers the B request the mock received, and the conversation id.
async function runTwice(
  h: Harness,
): Promise<{ request: ChatBody; conversationId: string }> {
  const stream = await observe(h);
  let conversationId = '';
  try {
    const first = await startRun(h, { intent: 'Read two files' });
    conversationId = first.conversationId;
    await readUntilEnded(stream);
    await startRun(h, {
      intent: 'Second question',
      conversationId,
    });
    await readUntilEnded(stream);
  } finally {
    await stream.close();
  }
  const bodies = await requestsOf(h);
  expect(bodies).toHaveLength(4);
  return { request: bodies[3], conversationId };
}

it('T3a (AC3): with a tiny contextSize, the oldest tool results are shortened and the turn is kept', async () => {
  const h = await openHarness({
    scenario: 'trim-shorten',
    steps: TRIM_STEPS,
    contextSize: 1000,
    prepare: writeLongSource,
  });
  try {
    const b = (await runTwice(h)).request.messages;

    // The system prompt is first and the current intent is last.
    expect(b[0].role).toBe('system');
    expect(b[b.length - 1]).toEqual({
      role: 'user',
      content: 'Second question',
    });

    // Run A's intent and its assistant tool calls are kept.
    expect(b).toContainEqual({ role: 'user', content: 'Read two files' });
    const calls = b
      .filter((message) => message.role === 'assistant')
      .flatMap((message) => message.tool_calls ?? []);
    expect(calls.map((call) => call.function.name)).toEqual([
      'list_files',
      'read_file',
    ]);

    // The read's tool message is shortened: its first 200 characters and the marker, at most 300 characters.
    const readCall = calls.find((call) => call.function.name === 'read_file');
    const readTool = b.find(
      (message) =>
        message.role === 'tool' && message.tool_call_id === readCall?.id,
    );
    expect(readTool).toBeDefined();
    const content = String(readTool?.content);
    expect(content).toContain('[shortened: original length');
    expect(content.length).toBeLessThanOrEqual(300);
  } finally {
    await h.close();
  }
});

it('T3b (AC3): when shortening is not enough, the oldest turn is dropped and the intent and prompt remain', async () => {
  const h = await openHarness({
    scenario: 'trim-drop',
    steps: TRIM_STEPS,
    contextSize: 20,
    prepare: writeLongSource,
  });
  try {
    const { request, conversationId } = await runTwice(h);

    // Run A is a finished turn of the conversation, so the request below is trimmed and not empty from the start.
    const historyReply = await get(
      h,
      AGENT_CONVERSATION_ROUTE.replace(':conversationId', conversationId),
    );
    expect(historyReply.status).toBe(200);
    expect(
      conversationHistorySchema.parse(JSON.parse(historyReply.body)).turns,
    ).toHaveLength(1);

    const b = request.messages;

    // Only the system prompt, the project summary and the current intent are left.
    expect(b).toHaveLength(3);
    expect(b[0].role).toBe('system');
    expect(b[1].role).toBe('system');
    expect(String(b[1].content)).toContain(
      'Project: Book (genre pack: nonfiction).',
    );
    expect(b[2]).toEqual({ role: 'user', content: 'Second question' });
  } finally {
    await h.close();
  }
});
