import { randomUUID } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { stringify } from 'yaml';
import {
  AGENT_RUN_CURRENT_ROUTE,
  AGENT_RUN_STOP_ROUTE,
  agentLoopEventSchema,
  agentRunStateSchema,
  type AgentCard,
  type AgentLoopEvent,
} from '@bbartolome/scriba-contracts/agent-loop';
import { ACTIVE_PROJECT_ROUTE } from '@bbartolome/scriba-contracts/project-store';
import {
  get,
  listThenReadSteps,
  observe,
  openHarness,
  post,
  readUntilEnded,
  requestsOf,
  startRun,
  transcriptFolder,
  type Harness,
} from './agent-loop-transcript.kit';
import { snapshotLibrary, type Observer } from './invariant-sweep';
import { dataOf } from './sse';

// The current-run-state route: the active run, else the latest transcript run (AGL-05). Each test builds its own temp
// library, its own mock scenario folder and its own app, and removes them all.

// The agent-loop events read from the stream, each parsed with the contract, until `done` holds. It gives up after 5 s.
async function readEventsUntil(
  stream: Observer,
  done: (events: AgentLoopEvent[]) => boolean,
): Promise<AgentLoopEvent[]> {
  const events: AgentLoopEvent[] = [];
  const deadline = Date.now() + 5000;
  while (!done(events)) {
    if (Date.now() > deadline) throw new Error('No event within 5 s.');
    for (const block of await stream.take(20)) {
      const envelope: unknown = JSON.parse(dataOf(block));
      if ((envelope as { module?: unknown }).module === 'agent-loop') {
        events.push(agentLoopEventSchema.parse(envelope));
      }
    }
  }
  return events;
}

// What a live subscriber holds after the events it has read: the text, the cards and the largest seq. This is the
// test's own reducer over the contract's event data, not AgentRun.
interface Mirror {
  assistantText: string;
  cards: AgentCard[];
  lastSeq: number;
}

function mirrorOf(events: AgentLoopEvent[]): Mirror {
  const mirror: Mirror = { assistantText: '', cards: [], lastSeq: 0 };
  for (const event of events) {
    const data = event.data as Record<string, unknown>;
    mirror.lastSeq = Math.max(mirror.lastSeq, data.seq as number);
    const card = mirror.cards.find((item) => item.callId === data.callId);
    switch (event.type) {
      case 'token-delta':
        mirror.assistantText += data.text as string;
        break;
      case 'tool-call-started':
        mirror.cards.push({
          callId: data.callId as string,
          name: data.name as string,
          family: data.family as AgentCard['family'],
          status: 'running',
        });
        break;
      case 'tool-call-args':
        if (card !== undefined) {
          card.arguments = data.arguments;
          card.valid = data.valid as boolean;
        }
        break;
      case 'tool-call-result':
        if (card !== undefined) {
          card.status = 'done';
          card.summary = data.summary as string;
          card.output = data.output;
        }
        break;
      case 'tool-call-error':
        if (card !== undefined) {
          card.status = 'error';
          card.error = {
            message: data.message as string,
            attempt: data.attempt as number,
            ...(data.withdrawn === true ? { withdrawn: true } : {}),
          };
        }
        break;
      default:
        break;
    }
  }
  return mirror;
}

// The seq and the reason of the run-ended event in a list of events.
function endOf(events: AgentLoopEvent[]): { seq: number; reason: unknown } {
  const ended = events.find((event) => event.type === 'run-ended');
  if (ended === undefined) throw new Error('No run-ended event.');
  const data = ended.data as { seq: number; reason: unknown };
  return { seq: data.seq, reason: data.reason };
}

// Polls the mock until the scenario has received `count` chat requests, or gives up after five seconds.
async function waitForRequests(h: Harness, count: number): Promise<void> {
  const deadline = Date.now() + 5000;
  while ((await requestsOf(h)).length < count) {
    if (Date.now() > deadline) {
      throw new Error(`No ${count} chat request within 5 s.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

// The bodies of `count` GETs of the current-run-state route, in order. Each answers 200.
async function currentBodies(h: Harness, count: number): Promise<string[]> {
  const bodies: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const reply = await get(h, AGENT_RUN_CURRENT_ROUTE);
    expect(reply.status).toBe(200);
    bodies.push(reply.body);
  }
  return bodies;
}

// The mock steps of C1: list_files, read_file, then a stream whose second delta waits three seconds after the first.
function slowStreamSteps(): unknown[] {
  const [listStep, readStep] = listThenReadSteps('sources/outline.md', []);
  return [
    listStep,
    readStep,
    {
      match: { endpoint: 'chat', turnIndex: 2 },
      reply: {
        kind: 'stream',
        deltas: ['First part. ', 'Second part.'],
        chunkDelayMs: 3000,
      },
    },
  ];
}

// One line of a hand-written transcript, as the writer writes it.
function transcriptLine(
  runId: string,
  conversationId: string,
  at: string,
  seq: number,
  kind: string,
  data: unknown,
): string {
  return `${JSON.stringify({
    schemaVersion: 1,
    at,
    runId,
    conversationId,
    seq,
    kind,
    data,
  })}\n`;
}

it('C1: the mid-run state matches what a live subscriber has accumulated', async () => {
  const h = await openHarness({
    scenario: 'mid-run',
    steps: slowStreamSteps(),
  });
  try {
    const stream = await observe(h);
    try {
      const started = await startRun(h, { intent: 'Summarize my outline' });
      // The first delta comes about three seconds after the stream's request; the tool events come before it.
      const seen = await readEventsUntil(stream, (events) =>
        events.some((event) => event.type === 'token-delta'),
      );
      const mirror = mirrorOf(seen);

      const midRun = await get(h, AGENT_RUN_CURRENT_ROUTE);
      expect(midRun.status).toBe(200);
      const state = agentRunStateSchema.parse(JSON.parse(midRun.body));
      expect(state.runId).toBe(started.runId);
      expect(state.status).toBe('running');
      expect(state.reason).toBeUndefined();
      expect(state.step).toBe(3);
      expect(state.cap).toBe(12);
      expect(state.assistantText).toBe('First part. ');
      expect(mirror.assistantText).toBe(state.assistantText);
      expect(mirror.cards.map((card) => card.status)).toEqual(['done', 'done']);
      expect(state.cards).toEqual(mirror.cards);
      expect(state.lastSeq).toBe(mirror.lastSeq);

      const rest = await readUntilEnded(stream);
      const finished = await get(h, AGENT_RUN_CURRENT_ROUTE);
      expect(finished.status).toBe(200);
      const finishedState = agentRunStateSchema.parse(
        JSON.parse(finished.body),
      );
      expect(finishedState.status).toBe('ended');
      expect(finishedState.reason).toBe('completed');
      expect(finishedState.assistantText).toBe('First part. Second part.');
      expect(finishedState.lastSeq).toBe(endOf(rest).seq);
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('C2: after a restart the last run is reported from its transcript', async () => {
  const h = await openHarness({
    scenario: 'restart',
    steps: listThenReadSteps('sources/outline.md', ['Done.']),
  });
  try {
    const stream = await observe(h);
    try {
      await startRun(h, { intent: 'Read the outline' });
      const events = await readUntilEnded(stream);
      expect(endOf(events).seq).toBe(9);
    } finally {
      await stream.close();
    }

    const before = await get(h, AGENT_RUN_CURRENT_ROUTE);
    expect(before.status).toBe(200);
    const kept = agentRunStateSchema.parse(JSON.parse(before.body));

    await h.restart();
    const after = await get(h, AGENT_RUN_CURRENT_ROUTE);
    expect(after.status).toBe(200);
    const rebuilt = agentRunStateSchema.parse(JSON.parse(after.body));
    expect(rebuilt).toEqual(kept);
    expect(rebuilt).toMatchObject({
      status: 'ended',
      reason: 'completed',
      step: 3,
      cap: 12,
      assistantText: 'Done.',
      groundingResults: [],
      pendingChangeIds: [],
      lastSeq: 9,
    });
    expect(rebuilt.cards.map((card) => [card.name, card.status])).toEqual([
      ['list_files', 'done'],
      ['read_file', 'done'],
    ]);
  } finally {
    await h.close();
  }
});

it('C3: the GET changes no file, emits no event and leaves the run running', async () => {
  const h = await openHarness({
    scenario: 'quiet',
    steps: [
      {
        match: { endpoint: 'chat' },
        delayMs: 5000,
        reply: { kind: 'stream', deltas: ['late'] },
      },
    ],
  });
  try {
    const stream = await observe(h);
    try {
      const started = await startRun(h, { intent: 'Say late' });
      await waitForRequests(h, 1);
      await stream.take(0);

      const beforeReads = snapshotLibrary(h.fixture.library);
      const running = await currentBodies(h, 3);
      expect(snapshotLibrary(h.fixture.library)).toEqual(beforeReads);
      expect(await stream.take(300)).toEqual([]);
      expect(new Set(running).size).toBe(1);
      expect(agentRunStateSchema.parse(JSON.parse(running[0]))).toMatchObject({
        runId: started.runId,
        status: 'running',
      });
      expect(await requestsOf(h)).toHaveLength(1);

      const stop = await post(h, AGENT_RUN_STOP_ROUTE, {
        runId: started.runId,
      });
      expect(stop.status).toBe(200);
      const ended = await readUntilEnded(stream);
      expect(endOf(ended).reason).toBe('stopped');
      await stream.close();

      const endedSnapshot = snapshotLibrary(h.fixture.library);
      const stopped = await currentBodies(h, 2);
      expect(snapshotLibrary(h.fixture.library)).toEqual(endedSnapshot);
      expect(stopped[0]).toBe(stopped[1]);
      expect(agentRunStateSchema.parse(JSON.parse(stopped[0]))).toMatchObject({
        runId: started.runId,
        status: 'ended',
        reason: 'stopped',
      });

      // The same reads after a restart, when the run comes from its transcript.
      await h.restart();
      const again = await observe(h);
      try {
        await again.take(0);
        const restartSnapshot = snapshotLibrary(h.fixture.library);
        const rebuilt = await currentBodies(h, 2);
        expect(snapshotLibrary(h.fixture.library)).toEqual(restartSnapshot);
        expect(await again.take(300)).toEqual([]);
        expect(rebuilt[0]).toBe(rebuilt[1]);
        expect(agentRunStateSchema.parse(JSON.parse(rebuilt[0]))).toMatchObject(
          { runId: started.runId, status: 'ended', reason: 'stopped' },
        );
      } finally {
        await again.close();
      }
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('S1: with no run the body is null, and with no active project the GET answers 409', async () => {
  const idle = await openHarness({ scenario: 'idle', steps: [] });
  try {
    const reply = await get(idle, AGENT_RUN_CURRENT_ROUTE);
    expect(reply.status).toBe(200);
    expect(reply.body).toBe('null');
  } finally {
    await idle.close();
  }

  const bare = await openHarness({
    scenario: 'bare',
    steps: [],
    prepare: (fixture) => {
      writeFileSync(
        join(fixture.library, '.scriba', 'settings.yaml'),
        stringify({ schemaVersion: 1 }),
      );
    },
  });
  try {
    const reply = await get(bare, AGENT_RUN_CURRENT_ROUTE);
    expect(reply.status).toBe(409);
    expect(JSON.parse(reply.body)).toMatchObject({
      error: { code: 'AGENT_NO_ACTIVE_PROJECT' },
    });
  } finally {
    await bare.close();
  }
});

it('S2: a transcript without run-end reports stopped from its own lines, and the older one once the newer is gone', async () => {
  const runA = randomUUID();
  const runB = randomUUID();
  const conversationId = randomUUID();
  const RUN_A_AT = '2026-11-14T10:00:00.000Z';
  const RUN_B_AT = '2026-11-14T11:00:00.000Z';
  const fileA = `20261114T100000Z-${runA}.jsonl`;
  const fileB = `20261114T110000Z-${runB}.jsonl`;
  const h = await openHarness({
    scenario: 'unfinished',
    steps: [],
    prepare: (fixture) => {
      const folder = join(fixture.library, 'book', 'logs', 'agent-runs');
      mkdirSync(folder, { recursive: true });
      // Run A: a call that was answered, and no run-end.
      writeFileSync(
        join(folder, fileA),
        [
          transcriptLine(runA, conversationId, RUN_A_AT, 1, 'intent', {
            intent: 'List the project',
          }),
          transcriptLine(runA, conversationId, RUN_A_AT, 1, 'step', {
            step: 1,
            cap: 12,
          }),
          transcriptLine(runA, conversationId, RUN_A_AT, 4, 'tool-call', {
            step: 1,
            callId: 'call-a',
            name: 'list_files',
            family: 'project',
            arguments: {},
            rawArguments: '{}',
            valid: true,
          }),
          transcriptLine(runA, conversationId, RUN_A_AT, 4, 'tool-result', {
            step: 1,
            callId: 'call-a',
            summary: 'Listed the project.',
            output: { entries: 2 },
            modelText: '2 entries',
          }),
        ].join(''),
      );
      // Run B: a newer run with only its intent line.
      writeFileSync(
        join(folder, fileB),
        transcriptLine(runB, conversationId, RUN_B_AT, 1, 'intent', {
          intent: 'Second question',
        }),
      );
    },
  });
  try {
    const newer = await get(h, AGENT_RUN_CURRENT_ROUTE);
    expect(newer.status).toBe(200);
    expect(agentRunStateSchema.parse(JSON.parse(newer.body))).toEqual({
      runId: runB,
      conversationId,
      status: 'ended',
      step: 0,
      cap: 12,
      assistantText: '',
      cards: [],
      groundingResults: [],
      pendingChangeIds: [],
      lastSeq: 1,
      reason: 'stopped',
    });

    rmSync(join(transcriptFolder(h), fileB));
    const older = await get(h, AGENT_RUN_CURRENT_ROUTE);
    expect(older.status).toBe(200);
    const state = agentRunStateSchema.parse(JSON.parse(older.body));
    expect(state).toMatchObject({
      runId: runA,
      status: 'ended',
      reason: 'stopped',
      step: 1,
      cap: 12,
      lastSeq: 4,
    });
    expect(state.cards).toEqual([
      {
        callId: 'call-a',
        name: 'list_files',
        family: 'project',
        status: 'done',
        arguments: {},
        valid: true,
        summary: 'Listed the project.',
        output: { entries: 2 },
      },
    ]);
  } finally {
    await h.close();
  }
});

it('S3: each project has its own slots', async () => {
  const h = await openHarness({
    scenario: 'slots',
    steps: [
      {
        match: { endpoint: 'chat' },
        reply: { kind: 'stream', deltas: ['Done.'] },
      },
    ],
    prepare: (fixture) => {
      const other = join(fixture.library, 'other');
      mkdirSync(other);
      writeFileSync(
        join(other, 'project.yaml'),
        'schemaVersion: 1\ntitle: Other\ngenrePack: nonfiction\n',
      );
    },
  });
  try {
    const stream = await observe(h);
    try {
      await startRun(h, { intent: 'Say done' });
      const events = await readUntilEnded(stream);
      expect(endOf(events).reason).toBe('completed');
    } finally {
      await stream.close();
    }

    const bookBefore = await get(h, AGENT_RUN_CURRENT_ROUTE);
    expect(bookBefore.status).toBe(200);
    expect(bookBefore.body).not.toBe('null');

    const away = await post(h, ACTIVE_PROJECT_ROUTE, { projectId: 'other' });
    expect(away.status).toBe(200);
    const otherGet = await get(h, AGENT_RUN_CURRENT_ROUTE);
    expect(otherGet.status).toBe(200);
    expect(otherGet.body).toBe('null');

    const back = await post(h, ACTIVE_PROJECT_ROUTE, { projectId: 'book' });
    expect(back.status).toBe(200);
    const bookAfter = await get(h, AGENT_RUN_CURRENT_ROUTE);
    expect(bookAfter.body).toBe(bookBefore.body);
  } finally {
    await h.close();
  }
});
