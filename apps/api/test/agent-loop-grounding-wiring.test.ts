import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  EXTRACT_FAILED_MESSAGE,
  EXTRACT_MARKER,
  JUDGE_MARKER,
} from '../src/modules/agent-loop/grounding-prompts';
import {
  AGENT_GROUNDING_ROUTE,
  AGENT_RUN_CURRENT_ROUTE,
  GROUNDING_ARTEFACT_PATH_PATTERN,
  GROUNDING_ARTEFACT_PATH_PREFIX,
  GROUNDING_ARTEFACT_PATH_SUFFIX,
  agentRunStateSchema,
  agentStartResponseSchema,
  groundingResultSchema,
  type AgentLoopEvent,
  type GroundingResult,
} from '@bbartolome/scriba-contracts/agent-loop';
import {
  PROJECT_PENDING_ROUTE,
  pendingListSchema,
  type PendingChange,
} from '@bbartolome/scriba-contracts/project-store';
import {
  get,
  observe,
  openHarness,
  post,
  readUntilEnded,
  requestsOf,
  startRun,
  type ChatBody,
  type Harness,
} from './agent-loop-transcript.kit';
import type { ProjectsLibrary } from './project-store-projects.kit';

// Each test opens its own harness: one mock scenario, one temp library with `book` active, and the composed app.
// Nothing here reads a service inside the app; the seam is the HTTP API, the SSE stream, the files and the mock.

const SENTENCE = 'Harbour traffic doubled in 1900.\n';
const DRAFT_CH01 = 'drafts/ch01.md';
const DRAFT_CH02 = 'drafts/ch02.md';
const GROUNDING_ROUTE = AGENT_GROUNDING_ROUTE;

function prepare(fixture: ProjectsLibrary): void {
  const book = join(fixture.library, 'book');
  mkdirSync(join(book, 'sources'), { recursive: true });
  mkdirSync(join(book, 'drafts'), { recursive: true });
  writeFileSync(
    join(book, 'sources', 'notes.md'),
    'Harbour traffic doubled in 1900.\n',
  );
  writeFileSync(join(book, DRAFT_CH01), SENTENCE);
}

// The mock steps. A grounding request carries a marker in its last message, so these steps are listed first.
function extractStep(claims: unknown[]): unknown {
  return {
    match: { endpoint: 'chat', lastMessageContent: EXTRACT_MARKER },
    reply: { kind: 'stream', deltas: [JSON.stringify({ claims })] },
  };
}

function judgeStep(verdicts: unknown[]): unknown {
  return {
    match: { endpoint: 'chat', lastMessageContent: JUDGE_MARKER },
    reply: { kind: 'stream', deltas: [JSON.stringify({ verdicts })] },
  };
}

function textStep(turnIndex: number, text: string): unknown {
  return {
    match: { endpoint: 'chat', turnIndex },
    reply: { kind: 'stream', deltas: [text] },
  };
}

function toolCallStep(
  turnIndex: number,
  name: string,
  args: Record<string, unknown>,
): unknown {
  return {
    match: { endpoint: 'chat', turnIndex },
    reply: {
      kind: 'toolCalls',
      calls: [{ name, argumentChunks: [JSON.stringify(args)] }],
    },
  };
}

const CLAIMS = [
  {
    text: 'Harbour traffic doubled in 1900.',
    span: { start: 0, end: 32 },
  },
];

const SUPPORTED = [
  {
    claim: 0,
    verdict: 'supported',
    passage: { path: 'sources/notes.md', offset: 0 },
    reason: 'The notes say so.',
  },
];

const GROUNDING_STEPS = [extractStep(CLAIMS), judgeStep(SUPPORTED)];

function hashOf(text: string): string {
  return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;
}

function typesOf(events: AgentLoopEvent[]): string[] {
  return events.map((event) => event.type);
}

function indexOfType(events: AgentLoopEvent[], type: string): number {
  return events.findIndex((event) => event.type === type);
}

// The grounding result of the run's grounding-result event, parsed with the contract (the event adds runId and seq).
function resultOf(events: AgentLoopEvent[]): GroundingResult {
  const found = events.find((event) => event.type === 'grounding-result');
  if (found === undefined) throw new Error('No grounding-result event.');
  return groundingResultSchema.parse(found.data);
}

function artefactOf(h: Harness, targetPath: string): GroundingResult {
  const path = join(
    h.fixture.library,
    'book',
    `${GROUNDING_ARTEFACT_PATH_PREFIX}${targetPath}${GROUNDING_ARTEFACT_PATH_SUFFIX}`,
  );
  return groundingResultSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

// The text of the last message of a chat request, when it is a string.
function lastTextOf(body: ChatBody): string {
  const last = body.messages[body.messages.length - 1];
  return typeof last?.content === 'string' ? last.content : '';
}

// The open pending changes of project book, parsed with the contract.
async function pendingOfBook(h: Harness): Promise<PendingChange[]> {
  const reply = await get(
    h,
    PROJECT_PENDING_ROUTE.replace(':projectId', 'book'),
  );
  expect(reply.status).toBe(200);
  return pendingListSchema.parse(JSON.parse(reply.body)).changes;
}

it('C1 a paragraph the agent writes to drafts/ is checked at run end, and its pending change carries the summary', async () => {
  const h = await openHarness({
    scenario: 'agl17-c1',
    prepare,
    steps: [
      ...GROUNDING_STEPS,
      toolCallStep(0, 'write_file', { path: DRAFT_CH02, content: SENTENCE }),
      textStep(1, 'Written.'),
    ],
  });
  try {
    const stream = await observe(h);
    const started = await startRun(h, {
      intent: 'Draft the opening paragraph.',
    });
    const events = await readUntilEnded(stream);

    const startedIndex = indexOfType(events, 'grounding-started');
    const resultIndex = indexOfType(events, 'grounding-result');
    const endedIndex = indexOfType(events, 'run-ended');
    expect(startedIndex).toBeGreaterThan(-1);
    expect(startedIndex).toBeLessThan(resultIndex);
    expect(resultIndex).toBeLessThan(endedIndex);
    expect(events[startedIndex]?.data).toMatchObject({
      runId: started.runId,
      targetPath: DRAFT_CH02,
    });
    expect(events[resultIndex]?.data).toMatchObject({ runId: started.runId });

    const result = resultOf(events);
    expect(result.targetPath).toBe(DRAFT_CH02);
    expect(result.claims).toHaveLength(1);
    expect(result.claims[0]).toMatchObject({
      verdict: 'supported',
      passage: { path: 'sources/notes.md' },
    });
    expect(result.contentHash).toBe(hashOf(SENTENCE));

    const artefact = artefactOf(h, DRAFT_CH02);
    expect(artefact).toEqual(result);
    expect(
      GROUNDING_ARTEFACT_PATH_PATTERN.test(`logs/grounding/${DRAFT_CH02}.json`),
    ).toBe(true);

    const changes = await pendingOfBook(h);
    expect(changes).toHaveLength(1);
    const [change] = changes;
    expect(change?.targetPath).toBe(DRAFT_CH02);
    expect(change?.proposed).toBe(SENTENCE);
    expect(change?.grounding).toEqual({
      supported: 1,
      weak: 0,
      unsupported: 0,
      checkedAt: result.checkedAt,
    });
    expect(events[endedIndex]?.data).toMatchObject({
      pendingChangeIds: [change?.id],
    });
  } finally {
    await h.close();
  }
});

it('C2 the on-demand endpoint answers a start reply, runs only the check, and writes the artefact', async () => {
  const h = await openHarness({
    scenario: 'agl17-c2',
    prepare,
    steps: GROUNDING_STEPS,
  });
  try {
    const stream = await observe(h);
    const reply = await post(h, GROUNDING_ROUTE, { path: DRAFT_CH01 });
    expect(reply.status).toBe(200);
    const started = agentStartResponseSchema.parse(JSON.parse(reply.body));
    const events = await readUntilEnded(stream);

    expect(typesOf(events)).toEqual([
      'run-started',
      'grounding-started',
      'grounding-result',
      'run-ended',
    ]);
    expect(events[1]?.data).toMatchObject({
      runId: started.runId,
      targetPath: DRAFT_CH01,
    });
    expect(events[3]?.data).toMatchObject({ reason: 'completed' });

    const result = resultOf(events);
    expect(result.targetPath).toBe(DRAFT_CH01);
    expect(result.runId).toBe(started.runId);
    expect(result.contentHash).toBe(hashOf(SENTENCE));
    expect(artefactOf(h, DRAFT_CH01)).toEqual(result);
    expect(
      existsSync(
        join(
          h.fixture.library,
          'book',
          `${GROUNDING_ARTEFACT_PATH_PREFIX}${DRAFT_CH01}${GROUNDING_ARTEFACT_PATH_SUFFIX}`,
        ),
      ),
    ).toBe(true);

    expect(await requestsOf(h)).toHaveLength(2);
  } finally {
    await h.close();
  }
});

it('C2b check_grounding in an agent run emits the same events, shows a card, and writes the artefact', async () => {
  const h = await openHarness({
    scenario: 'agl17-c2b',
    prepare,
    steps: [
      ...GROUNDING_STEPS,
      toolCallStep(0, 'check_grounding', { path: DRAFT_CH01 }),
      textStep(1, 'Checked.'),
    ],
  });
  try {
    const stream = await observe(h);
    const started = await startRun(h, { intent: 'Check the draft.' });
    const events = await readUntilEnded(stream);

    const startedCard = events.find(
      (event) => event.type === 'tool-call-started',
    );
    expect(startedCard?.data).toMatchObject({
      name: 'check_grounding',
      family: 'grounding',
    });
    const callId = (startedCard?.data as { callId: string }).callId;
    const resultIndex = indexOfType(events, 'grounding-result');
    const toolResultIndex = events.findIndex(
      (event) =>
        event.type === 'tool-call-result' &&
        (event.data as { callId: string }).callId === callId,
    );
    expect(indexOfType(events, 'grounding-started')).toBeGreaterThan(-1);
    expect(resultIndex).toBeGreaterThan(-1);
    expect(toolResultIndex).toBeGreaterThan(resultIndex);
    expect(resultIndex).toBeLessThan(indexOfType(events, 'run-ended'));
    expect(events[toolResultIndex]?.data).toMatchObject({
      summary: 'Checked drafts/ch01.md: 1 supported, 0 weak, 0 unsupported.',
    });

    const result = resultOf(events);
    expect(result.runId).toBe(started.runId);
    expect(artefactOf(h, DRAFT_CH01)).toEqual(result);

    // The second request is the turn after the tool call; its tool message carries the verdict.
    const bodies = await requestsOf(h);
    expect(
      bodies.some((body) =>
        body.messages.some(
          (message) =>
            message.role === 'tool' &&
            typeof message.content === 'string' &&
            message.content.includes('"verdict":"supported"'),
        ),
      ),
    ).toBe(true);
  } finally {
    await h.close();
  }
});

it('X1 after a restart, the run state of an on-demand check still holds its grounding result', async () => {
  const h = await openHarness({
    scenario: 'agl17-x1',
    prepare,
    steps: GROUNDING_STEPS,
  });
  try {
    const stream = await observe(h);
    const reply = await post(h, GROUNDING_ROUTE, { path: DRAFT_CH01 });
    expect(reply.status).toBe(200);
    await readUntilEnded(stream);

    await h.restart();
    const state = agentRunStateSchema.parse(
      JSON.parse((await get(h, AGENT_RUN_CURRENT_ROUTE)).body),
    );
    expect(state.status).toBe('ended');
    expect(state.groundingResults).toHaveLength(1);
    expect(state.groundingResults[0]).toMatchObject({
      targetPath: DRAFT_CH01,
    });
  } finally {
    await h.close();
  }
});

it('X2 a check whose extract reply is never a claim list ends the on-demand run with the readable failure and writes no artefact', async () => {
  const h = await openHarness({
    scenario: 'agl17-x2',
    prepare,
    steps: [
      {
        match: { endpoint: 'chat', lastMessageContent: EXTRACT_MARKER },
        reply: { kind: 'stream', deltas: ['not a claim list'] },
      },
    ],
  });
  try {
    const stream = await observe(h);
    const reply = await post(h, GROUNDING_ROUTE, { path: DRAFT_CH01 });
    expect(reply.status).toBe(200);
    const events = await readUntilEnded(stream);

    const ended = events[events.length - 1];
    expect(ended?.type).toBe('run-ended');
    expect(ended?.data).toMatchObject({
      reason: 'error',
      message: EXTRACT_FAILED_MESSAGE,
    });
    expect(indexOfType(events, 'grounding-result')).toBe(-1);
    expect(
      existsSync(join(h.fixture.library, 'book', 'logs', 'grounding')),
    ).toBe(false);

    const bodies = await requestsOf(h);
    expect(bodies).toHaveLength(3);
    for (const body of bodies) {
      expect(lastTextOf(body)).toContain(EXTRACT_MARKER);
    }
  } finally {
    await h.close();
  }
});

it('X3 an on-demand check is refused while another run is active', async () => {
  const h = await openHarness({
    scenario: 'agl17-x3',
    prepare,
    steps: [
      {
        match: { endpoint: 'chat', turnIndex: 0 },
        delayMs: 1000,
        reply: { kind: 'stream', deltas: ['Hello back.'] },
      },
    ],
  });
  try {
    const stream = await observe(h);
    await startRun(h, { intent: 'Hello' });
    const reply = await post(h, GROUNDING_ROUTE, { path: DRAFT_CH01 });
    expect(reply.status).toBe(409);
    expect(JSON.parse(reply.body)).toMatchObject({
      error: { code: 'AGENT_RUN_ACTIVE' },
    });

    const events = await readUntilEnded(stream);
    expect(events[events.length - 1]?.data).toMatchObject({
      reason: 'completed',
    });
  } finally {
    await h.close();
  }
});

it('X4 a later run in the check conversation does not replay the check to the model', async () => {
  const h = await openHarness({
    scenario: 'agl17-x4',
    prepare,
    steps: [...GROUNDING_STEPS, textStep(0, 'Second answer.')],
  });
  try {
    const stream = await observe(h);
    const reply = await post(h, GROUNDING_ROUTE, { path: DRAFT_CH01 });
    expect(reply.status).toBe(200);
    const started = agentStartResponseSchema.parse(JSON.parse(reply.body));
    await readUntilEnded(stream);

    await startRun(h, {
      intent: 'Next question',
      conversationId: started.conversationId,
    });
    await readUntilEnded(stream);

    const bodies = await requestsOf(h);
    const next = bodies.find((body) => lastTextOf(body) === 'Next question');
    expect(next).toBeDefined();
    expect(
      next?.messages.some(
        (message) =>
          typeof message.content === 'string' &&
          message.content.includes('Check grounding'),
      ),
    ).toBe(false);
  } finally {
    await h.close();
  }
});
