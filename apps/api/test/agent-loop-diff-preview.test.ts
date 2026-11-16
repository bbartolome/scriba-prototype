import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { stringify } from 'yaml';
import {
  AGENT_RUN_CURRENT_ROUTE,
  AGENT_RUN_STOP_ROUTE,
  AGENT_RUNS_ROUTE,
  agentLoopEventSchema,
  agentRunStateSchema,
  agentStartResponseSchema,
  type AgentLoopEvent,
} from '@bbartolome/scriba-contracts/agent-loop';
import { PROVIDER_DEFAULTS } from '@bbartolome/scriba-contracts/providers';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import {
  LOOPBACK_HOST,
  LOOPBACK_ORIGIN,
  observeEvents,
  type Observer,
} from './invariant-sweep';
import {
  buildProjectsLibrary,
  type ProjectsLibrary,
} from './project-store-projects.kit';
import { startMockOpenAI, type MockOpenAI } from './providers-client.kit';
import { dataOf } from './sse';

// The write diff previews of AGL-14: the diffPreview of tool-call-result, the run state and the transcript. Each test
// builds its own temp library, its own mock scenario folder and its own app, and removes them all.

// The shared fixture packs: cold_open is a draft tool in every genre.
const FIXTURE_PACKS = join(__dirname, 'fixtures', 'packs');

interface SettingsOptions {
  providerBaseURL: string;
}

function settingsText(options: SettingsOptions): string {
  const doc = {
    schemaVersion: 1,
    projects: { schemaVersion: 1, active: 'book' },
    providers: {
      schemaVersion: 1,
      list: [
        {
          id: 'mock',
          kind: 'openai-compatible',
          baseURL: options.providerBaseURL,
          model: 'mock-model',
          ...PROVIDER_DEFAULTS,
        },
      ],
      appDefault: { providerId: 'mock', model: 'mock-model' },
    },
  };
  return stringify(doc);
}

interface Harness {
  app: TestApp;
  cookie: string;
  mock: MockOpenAI;
  fixture: ProjectsLibrary;
  scenario: string;
  close: () => Promise<void>;
}

interface OpenOptions {
  scenario: string;
  steps: unknown[];
  packs?: string; // SCRIBA_PACKS_DIR of the app
  prepare?: (library: string) => void; // writes the project of the test
}

// One mock scenario file, one library with `book` active, and the composed app with a session cookie.
async function openHarness(options: OpenOptions): Promise<Harness> {
  const { scenario, steps, packs, prepare } = options;
  const scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-agl14-diff-'));
  writeFileSync(
    join(scenariosDir, `${scenario}.json`),
    JSON.stringify({ steps }),
  );
  const mock = await startMockOpenAI({ scenariosDir });
  const fixture = buildProjectsLibrary({
    settings: settingsText({
      providerBaseURL: `${mock.baseUrl}/scenario/${scenario}/v1`,
    }),
  });
  prepare?.(fixture.library);
  let app: TestApp | undefined;
  const close = async (): Promise<void> => {
    try {
      await app?.close();
    } finally {
      await mock.close();
      rmSync(scenariosDir, { recursive: true, force: true });
      fixture.remove();
    }
  };
  try {
    app = await createTestApp({
      libraryDir: fixture.library,
      ...(packs === undefined ? {} : { env: { SCRIBA_PACKS_DIR: packs } }),
    });
    const cookie = await sessionCookie(app, fixture.library);
    return { app, cookie, mock, fixture, scenario, close };
  } catch (error) {
    await close();
    throw error;
  }
}

// The project book: nonfiction, the style profile house-style, and two entities, a person and the style.
function writeDraftProject(library: string): void {
  const book = join(library, 'book');
  writeFileSync(
    join(book, 'project.yaml'),
    'schemaVersion: 1\ntitle: Book\ngenrePack: nonfiction\nstyleProfile: house-style\n',
  );
  mkdirSync(join(book, 'entities'), { recursive: true });
  writeFileSync(
    join(book, 'entities', 'ada-lovelace.md'),
    '---\ntype: person\n---\nAda wrote the first program.\n',
  );
  writeFileSync(
    join(book, 'entities', 'house-style.md'),
    '---\ntype: style-profile\n---\nPlain sentences.\n',
  );
}

function post(h: Harness, path: string, body: unknown): Promise<Reply> {
  return send(h.app.baseUrl, {
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie: h.cookie,
    method: 'POST',
    path,
    body: JSON.stringify(body),
  });
}

function get(h: Harness, path: string): Promise<Reply> {
  return send(h.app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie: h.cookie,
    method: 'GET',
    path,
  });
}

async function startRun(h: Harness, body: unknown): Promise<{ runId: string }> {
  const reply = await post(h, AGENT_RUNS_ROUTE, body);
  expect(reply.status).toBe(200);
  return agentStartResponseSchema.parse(JSON.parse(reply.body));
}

// The agent-loop events read from the stream, each parsed with the contract, until `done` holds. It gives up after 5 s.
async function readUntil(
  stream: Observer,
  done: (events: AgentLoopEvent[]) => boolean,
): Promise<AgentLoopEvent[]> {
  const events: AgentLoopEvent[] = [];
  const deadline = Date.now() + 5000;
  while (!done(events)) {
    if (Date.now() > deadline)
      throw new Error('Expected events not seen in 5 s.');
    for (const block of await stream.take(20)) {
      const envelope: unknown = JSON.parse(dataOf(block));
      if ((envelope as { module?: unknown }).module === 'agent-loop') {
        events.push(agentLoopEventSchema.parse(envelope));
      }
    }
  }
  return events;
}

const hasEnded = (events: AgentLoopEvent[]): boolean =>
  events.some((event) => event.type === 'run-ended');

type Typed<T extends AgentLoopEvent['type']> = Extract<
  AgentLoopEvent,
  { type: T }
>;

function eventsOf<T extends AgentLoopEvent['type']>(
  events: AgentLoopEvent[],
  type: T,
): Typed<T>[] {
  return events.filter((event): event is Typed<T> => event.type === type);
}

// One chat step that makes one write or edit call.
function toolCallStep(turnIndex: number, name: string, args: string) {
  return {
    match: { endpoint: 'chat', turnIndex },
    reply: { kind: 'toolCalls', calls: [{ name, argumentChunks: [args] }] },
  };
}

// The transcript lines of one run, parsed, in file order.
function transcriptLinesOf(
  h: Harness,
  runId: string,
): Array<{ kind: string; data: Record<string, unknown> }> {
  const folder = join(h.fixture.library, 'book', 'logs', 'agent-runs');
  const name = readdirSync(folder).find((item) =>
    item.endsWith(`-${runId}.jsonl`),
  );
  if (name === undefined) throw new Error(`No transcript for run ${runId}.`);
  return readFileSync(join(folder, name), 'utf8')
    .split('\n')
    .filter((line) => line.length > 0)
    .map(
      (line) =>
        JSON.parse(line) as { kind: string; data: Record<string, unknown> },
    );
}

it('A1: a write or edit result carries the path, the captured base and the proposed text; a new file has an empty base', async () => {
  const h = await openHarness({
    scenario: 'diff-data',
    steps: [
      toolCallStep(
        0,
        'write_file',
        '{"path":"sources/outline.md","content":"# Outline A\\n"}',
      ),
      toolCallStep(
        1,
        'edit_file',
        '{"path":"sources/outline.md","old":"Outline A","new":"Outline B"}',
      ),
      toolCallStep(
        2,
        'write_file',
        '{"path":"drafts/new-note.md","content":"New.\\n"}',
      ),
      {
        match: { endpoint: 'chat', turnIndex: 3 },
        reply: { kind: 'stream', deltas: ['Done.'] },
      },
    ],
  });
  try {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      await startRun(h, { intent: 'Change the outline and add a note' });
      const events = await readUntil(stream, hasEnded);
      const results = eventsOf(events, 'tool-call-result');
      expect(results).toHaveLength(3);
      expect(results[0].data.diffPreview).toEqual({
        path: 'sources/outline.md',
        base: '# Outline\n',
        proposed: '# Outline A\n',
      });
      // The base is the first touch's, not the text before the edit.
      expect(results[1].data.diffPreview).toEqual({
        path: 'sources/outline.md',
        base: '# Outline\n',
        proposed: '# Outline B\n',
      });
      expect(results[2].data.diffPreview).toEqual({
        path: 'drafts/new-note.md',
        base: '',
        proposed: 'New.\n',
      });
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('A2: the write card keeps its diff in the current run state while the run is still going', async () => {
  const h = await openHarness({
    scenario: 'diff-refresh',
    steps: [
      toolCallStep(
        0,
        'write_file',
        '{"path":"sources/outline.md","content":"# Outline A\\n"}',
      ),
      {
        match: { endpoint: 'chat', turnIndex: 1 },
        reply: {
          kind: 'stream',
          deltas: ['First part. ', 'Second part.'],
          chunkDelayMs: 3000,
        },
      },
    ],
  });
  try {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      const { runId } = await startRun(h, { intent: 'Rewrite the outline' });
      const events = await readUntil(stream, (seen) =>
        seen.some((event) => event.type === 'token-delta'),
      );
      const live = eventsOf(events, 'tool-call-result');
      expect(live).toHaveLength(1);
      const liveDiff = live[0].data.diffPreview;
      expect(liveDiff).toEqual({
        path: 'sources/outline.md',
        base: '# Outline\n',
        proposed: '# Outline A\n',
      });

      const reply = await get(h, AGENT_RUN_CURRENT_ROUTE);
      expect(reply.status).toBe(200);
      const state = agentRunStateSchema.parse(JSON.parse(reply.body));
      expect(state.runId).toBe(runId);
      expect(state.status).toBe('running');
      const card = state.cards.find(
        (item) => item.callId === live[0].data.callId,
      );
      expect(card?.diffPreview).toEqual(liveDiff);

      const stop = await post(h, AGENT_RUN_STOP_ROUTE, { runId });
      expect(stop.status).toBe(200);
      await readUntil(stream, hasEnded);
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('A3: the live diff is whole, and the transcript line of the same call carries it cut at the transcript limit', async () => {
  const LENGTH = 9000;
  const h = await openHarness({
    scenario: 'diff-transcript',
    steps: [
      toolCallStep(
        0,
        'write_file',
        JSON.stringify({
          path: 'drafts/long-note.md',
          content: 'a'.repeat(LENGTH),
        }),
      ),
      {
        match: { endpoint: 'chat', turnIndex: 1 },
        reply: { kind: 'stream', deltas: ['Done.'] },
      },
    ],
  });
  try {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      const { runId } = await startRun(h, { intent: 'Write a long note' });
      const events = await readUntil(stream, hasEnded);
      const [result] = eventsOf(events, 'tool-call-result');
      expect(result.data.diffPreview?.path).toBe('drafts/long-note.md');
      expect(result.data.diffPreview?.base).toBe('');
      expect(result.data.diffPreview?.proposed).toHaveLength(LENGTH);

      const lines = transcriptLinesOf(h, runId);
      const line = lines.find(
        (item) =>
          item.kind === 'tool-result' &&
          item.data.callId === result.data.callId,
      );
      expect(line).toBeDefined();
      expect(line?.data.diffPreview).toEqual({
        path: 'drafts/long-note.md',
        base: '',
        proposed: `${'a'.repeat(8192)} … [truncated: original length ${LENGTH} characters]`,
      });
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

// The draft: a call to cold_open with the given arguments. The arguments are the raw string the model sends.
function coldOpenCall(turnIndex: number, args: string) {
  return toolCallStep(turnIndex, 'cold_open', args);
}

const DRAFT_TEXT = 'The cold open opens on the bench at dawn.';

it('A4: a routed narrative draft carries a diff of its target path, with an empty base and the draft text as proposed', async () => {
  const h = await openHarness({
    scenario: 'diff-narrative',
    packs: FIXTURE_PACKS,
    prepare: writeDraftProject,
    steps: [
      {
        match: {
          endpoint: 'chat',
          lastMessageContent: 'Core idea: Engines reward patience',
        },
        reply: { kind: 'stream', deltas: [DRAFT_TEXT] },
      },
      coldOpenCall(
        0,
        '{"coreIdea":"Engines reward patience","person":"ada-lovelace","target":"drafts/chapter-one.md"}',
      ),
      {
        match: { endpoint: 'chat', turnIndex: 1 },
        reply: { kind: 'stream', deltas: ['Done.'] },
      },
    ],
  });
  try {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      await startRun(h, {
        intent: 'Draft the cold open for the engines chapter',
      });
      const events = await readUntil(stream, hasEnded);
      const [result] = eventsOf(events, 'tool-call-result');
      expect(result.data.diffPreview).toEqual({
        path: 'drafts/chapter-one.md',
        base: '',
        proposed: DRAFT_TEXT,
      });
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});
