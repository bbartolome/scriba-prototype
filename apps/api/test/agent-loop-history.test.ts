import { randomUUID } from 'node:crypto';
import {
  appendFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  AGENT_CONVERSATION_ROUTE,
  AGENT_CONVERSATIONS_ROUTE,
  AGENT_TRANSCRIPT_PATH_PATTERN,
  conversationHistorySchema,
  conversationListSchema,
  type AgentLoopEvent,
} from '@bbartolome/scriba-contracts/agent-loop';
import {
  get,
  listThenReadSteps,
  observe,
  openHarness,
  readUntilEnded,
  requestsOf,
  startRun,
  transcriptFolder,
  type Harness,
} from './agent-loop-transcript.kit';
import { snapshotLibrary } from './invariant-sweep';

// The text the token-delta events of one run carried, in order.
function deltaTextOf(events: AgentLoopEvent[]): string {
  return events
    .filter((event) => event.type === 'token-delta')
    .map((event) => (event.data as { text: string }).text)
    .join('');
}

// The transcript file of one run, found by its run id.
function transcriptPathOf(h: Harness, runId: string): string {
  const folder = transcriptFolder(h);
  const name = readdirSync(folder).find(
    (item) =>
      AGENT_TRANSCRIPT_PATH_PATTERN.test(`logs/agent-runs/${item}`) &&
      item.endsWith(`-${runId}.jsonl`),
  );
  if (name === undefined) throw new Error('No transcript for the run.');
  return join(folder, name);
}

// The mock steps of the history scenarios: run B's step is listed first, so it matches on its intent (the replayed
// history adds assistant messages, which shifts turnIndex); run A's steps match turnIndex 0 to 2.
const TWO_RUNS_STEPS = [
  {
    match: {
      endpoint: 'chat',
      lastMessageRole: 'user',
      lastMessageContent: 'Second question',
    },
    reply: { kind: 'stream', deltas: ['Second answer.'] },
  },
  ...listThenReadSteps('sources/outline.md', ['The outline ', 'is short.']),
];

it('T2 (AC2): a follow-up start sends the earlier turns to the mock', async () => {
  const h = await openHarness({
    scenario: 'follow',
    steps: TWO_RUNS_STEPS,
  });
  try {
    const stream = await observe(h);
    try {
      const first = await startRun(h, { intent: 'Say hello first' });
      await readUntilEnded(stream);
      const second = await startRun(h, {
        intent: 'Second question',
        conversationId: first.conversationId,
      });
      expect(second.conversationId).toBe(first.conversationId);
      await readUntilEnded(stream);

      const bodies = await requestsOf(h);
      expect(bodies).toHaveLength(4);
      const [aFirst, aSecond, aThird] = bodies.map((body) => body.messages);
      const b = bodies[3].messages;

      // The system prompt, then the project summary, then A's intent.
      expect(b[0]).toEqual(aFirst[0]);
      expect(b[0].role).toBe('system');
      expect(b[1].role).toBe('system');
      expect(String(b[1].content)).toContain(
        'Project: Book (genre pack: nonfiction).',
      );
      expect(b[2]).toEqual({ role: 'user', content: 'Say hello first' });

      // A's list call, then its result as the model received it in run A.
      expect(b[3].role).toBe('assistant');
      expect(b[3].tool_calls?.map((call) => call.function.name)).toEqual([
        'list_files',
      ]);
      expect(b[4]).toMatchObject({
        role: 'tool',
        content: aSecond[4].content,
      });

      // A's read call, then its result as the model received it in run A.
      expect(b[5].role).toBe('assistant');
      expect(b[5].tool_calls?.map((call) => call.function.name)).toEqual([
        'read_file',
      ]);
      expect(b[6]).toMatchObject({
        role: 'tool',
        content: aThird[6].content,
      });
      expect(b[7]).toEqual({
        role: 'assistant',
        content: 'The outline is short.',
      });

      // The current intent is last.
      expect(b[8]).toEqual({ role: 'user', content: 'Second question' });
      expect(b).toHaveLength(9);

      // The call ids are the callIds of run A's cards in the history route.
      const historyReply = await get(
        h,
        AGENT_CONVERSATION_ROUTE.replace(
          ':conversationId',
          first.conversationId,
        ),
      );
      expect(historyReply.status).toBe(200);
      const history = conversationHistorySchema.parse(
        JSON.parse(historyReply.body),
      );
      const callIds = history.turns[0].cards.map((card) => card.callId);
      expect(callIds).toEqual([
        b[3].tool_calls?.[0].id,
        b[5].tool_calls?.[0].id,
      ]);
      expect(b[4].tool_call_id).toBe(callIds[0]);
      expect(b[6].tool_call_id).toBe(callIds[1]);
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('G1: the list and the history routes answer the finished turns and write nothing', async () => {
  const h = await openHarness({
    scenario: 'routes',
    steps: [
      {
        match: { endpoint: 'chat', turnIndex: 0 },
        reply: { kind: 'stream', deltas: ['Hello there.'] },
      },
      // Run B's first request has one assistant message from run A, so its turns start at 1.
      ...listThenReadSteps(
        'sources/outline.md',
        ['The outline ', 'is short.'],
        1,
      ),
    ],
  });
  try {
    const stream = await observe(h);
    try {
      const first = await startRun(h, { intent: 'First' });
      const firstEvents = await readUntilEnded(stream);
      const second = await startRun(h, {
        intent: 'Second',
        conversationId: first.conversationId,
      });
      const secondEvents = await readUntilEnded(stream);

      const before = snapshotLibrary(h.fixture.library);

      const listReply = await get(h, AGENT_CONVERSATIONS_ROUTE);
      expect(listReply.status).toBe(200);
      const list = conversationListSchema.parse(JSON.parse(listReply.body));
      expect(list.conversations).toHaveLength(1);
      expect(list.conversations[0]).toMatchObject({
        conversationId: first.conversationId,
        intent: 'First',
        turnCount: 2,
      });

      const historyReply = await get(
        h,
        AGENT_CONVERSATION_ROUTE.replace(
          ':conversationId',
          first.conversationId,
        ),
      );
      expect(historyReply.status).toBe(200);
      const history = conversationHistorySchema.parse(
        JSON.parse(historyReply.body),
      );
      expect(history.conversationId).toBe(first.conversationId);
      expect(history.turns.map((turn) => turn.runId)).toEqual([
        first.runId,
        second.runId,
      ]);
      expect(history.turns.map((turn) => turn.reason)).toEqual([
        'completed',
        'completed',
      ]);

      // The turns carry the assistant text the stream carried.
      expect(history.turns[0].assistantText).toBe(deltaTextOf(firstEvents));
      expect(history.turns[1].assistantText).toBe(deltaTextOf(secondEvents));
      expect(history.turns[0].assistantText).toBe('Hello there.');

      // The cards of the second run are the live cards, with the callIds of its stream.
      const streamedCallIds = secondEvents
        .filter((event) => event.type === 'tool-call-started')
        .map((event) => (event.data as { callId: string }).callId);
      const cards = history.turns[1].cards;
      expect(cards.map((card) => card.callId)).toEqual(streamedCallIds);
      for (const card of cards) {
        expect(card).toMatchObject({
          status: 'done',
          valid: true,
        });
        expect(card.arguments).toBeDefined();
        expect(card.summary).toEqual(expect.any(String));
        expect(card.output).toBeDefined();
      }

      // Neither route wrote anything.
      expect(snapshotLibrary(h.fixture.library)).toEqual(before);
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('G2: an unfinished transcript and a partial last line are left out without an error', async () => {
  const h = await openHarness({
    scenario: 'partial',
    steps: [
      {
        match: { endpoint: 'chat' },
        reply: { kind: 'stream', deltas: ['Hello there.'] },
      },
    ],
  });
  try {
    const stream = await observe(h);
    try {
      const first = await startRun(h, { intent: 'First' });
      await readUntilEnded(stream);

      // A partial last line, with no newline, at the end of the finished run's file.
      appendFileSync(
        transcriptPathOf(h, first.runId),
        '{"schemaVersion":1,"at":"2026-11-1',
      );

      // An intent-only file with a valid name and a fresh run id: a run that never finished.
      const freshRunId = randomUUID();
      const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
      writeFileSync(
        join(transcriptFolder(h), `${stamp}Z-${freshRunId}.jsonl`),
        `${JSON.stringify({
          schemaVersion: 1,
          at: new Date().toISOString(),
          runId: freshRunId,
          conversationId: first.conversationId,
          seq: 1,
          kind: 'intent',
          data: { intent: 'Unfinished' },
        })}\n`,
      );

      const historyReply = await get(
        h,
        AGENT_CONVERSATION_ROUTE.replace(
          ':conversationId',
          first.conversationId,
        ),
      );
      expect(historyReply.status).toBe(200);
      const history = conversationHistorySchema.parse(
        JSON.parse(historyReply.body),
      );
      expect(history.turns.map((turn) => turn.runId)).toEqual([first.runId]);

      const listReply = await get(h, AGENT_CONVERSATIONS_ROUTE);
      expect(listReply.status).toBe(200);
      const list = conversationListSchema.parse(JSON.parse(listReply.body));
      expect(list.conversations[0].turnCount).toBe(1);
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('G3: a folder that cannot take the transcript does not stop the run', async () => {
  const h = await openHarness({
    scenario: 'blocked',
    steps: [
      {
        match: { endpoint: 'chat' },
        reply: { kind: 'stream', deltas: ['Done.'] },
      },
    ],
    prepare: (fixture) => {
      const logs = join(fixture.library, 'book', 'logs');
      mkdirSync(logs, { recursive: true });
      writeFileSync(join(logs, 'agent-runs'), 'not a folder\n');
    },
  });
  try {
    const stream = await observe(h);
    try {
      await startRun(h, { intent: 'Say done' });
      const events = await readUntilEnded(stream);
      expect(events.map((event) => event.type)).toEqual([
        'run-started',
        'token-delta',
        'run-ended',
      ]);
      expect(events[events.length - 1]).toMatchObject({
        type: 'run-ended',
        data: { reason: 'completed' },
      });

      // The blocking file is untouched, and no transcript was created.
      const logs = join(h.fixture.library, 'book', 'logs');
      expect(readdirSync(logs)).toEqual(['agent-runs']);
      expect(readFileSync(join(logs, 'agent-runs'), 'utf8')).toBe(
        'not a folder\n',
      );
      expect(statSync(join(logs, 'agent-runs')).isFile()).toBe(true);

      const historyReply = await get(h, AGENT_CONVERSATIONS_ROUTE);
      expect(historyReply.status).toBe(200);
      expect(
        conversationListSchema.parse(JSON.parse(historyReply.body))
          .conversations,
      ).toEqual([]);
      expect((await requestsOf(h)).length).toBe(1);
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});
