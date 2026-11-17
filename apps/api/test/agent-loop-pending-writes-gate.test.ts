import { createHash } from 'node:crypto';
import {
  existsSync,
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
  AGENT_RUN_STOP_ROUTE,
  AGENT_RUNS_ROUTE,
  agentLoopEventSchema,
  agentStartResponseSchema,
  type AgentLoopEvent,
} from '@bbartolome/scriba-contracts/agent-loop';
import {
  PROJECT_PENDING_ACCEPT_ROUTE,
  PROJECT_PENDING_ROUTE,
  pendingListSchema,
  type PendingChange,
} from '@bbartolome/scriba-contracts/project-store';
import { graphFileSchema } from '@bbartolome/scriba-contracts/graph-runner';
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
import {
  recordsOf,
  startMockOpenAI,
  type MockOpenAI,
  type MockOpenAIRecord,
} from './providers-client.kit';
import { dataOf } from './sse';
import { EXTRACT_MARKER } from '../src/modules/agent-loop/grounding-prompts';

// The pending-writes gate (AGL-15): criterion 1 of the phase checklist, through the composed app and the mock.
// Every sub-check builds its own temp library, its own mock scenario folder and its own app, and removes them all.

// The real packs: propose_graph is a graph tool of core.
const PACKS_ROOT = join(__dirname, '..', '..', '..', 'packages', 'packs');

interface SettingsOptions {
  providerBaseURL: string;
}

// The providers section of one mock provider. Its model is set, so the mock records only chat requests.
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
  packs?: string; // SCRIBA_PACKS_DIR of the app; not set when absent
}

// One mock scenario file, one library with `book` active, and the composed app with a session cookie.
async function openHarness(options: OpenOptions): Promise<Harness> {
  const { scenario, steps, packs } = options;
  const scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-agl15-gate-'));
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
    app = await createTestApp(
      packs === undefined
        ? { libraryDir: fixture.library }
        : { libraryDir: fixture.library, env: { SCRIBA_PACKS_DIR: packs } },
    );
    const cookie = await sessionCookie(app, fixture.library);
    return { app, cookie, mock, fixture, scenario, close };
  } catch (error) {
    await close();
    throw error;
  }
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

// The agent-loop events read from the stream until `done` says the list so far is enough.
async function readUntil(
  stream: Observer,
  done: (seen: AgentLoopEvent[]) => boolean,
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

const hasResults =
  (count: number) =>
  (events: AgentLoopEvent[]): boolean =>
    eventsOf(events, 'tool-call-result').length >= count;

// The open pending changes of project book, parsed with the contract.
async function pendingOfBook(h: Harness): Promise<PendingChange[]> {
  const reply = await get(
    h,
    PROJECT_PENDING_ROUTE.replace(':projectId', 'book'),
  );
  expect(reply.status).toBe(200);
  return pendingListSchema.parse(JSON.parse(reply.body)).changes;
}

// Every file under the book folder, keyed by its path relative to the folder, with its sha256.
// The run logs and the Project store's own state (logs/ and .scriba/) are left out.
function bookFiles(book: string): Record<string, string> {
  const found: Record<string, string> = {};
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      if (
        relative === 'logs' ||
        relative.startsWith('logs/') ||
        relative === '.scriba' ||
        relative.startsWith('.scriba/')
      ) {
        continue;
      }
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full, relative);
      else
        found[relative] = createHash('sha256')
          .update(readFileSync(full))
          .digest('hex');
    }
  };
  walk(book, '');
  return found;
}

// The chat requests the mock has received, as the tests read them.
interface WireMessage {
  role: string;
  content?: unknown;
}

interface ChatBody {
  messages: WireMessage[];
  tools?: Array<{
    type: string;
    function: {
      name: string;
      parameters: { properties: Record<string, unknown> };
    };
  }>;
}

function chatBodies(records: MockOpenAIRecord[]): ChatBody[] {
  return records.map((record) => record.body as ChatBody);
}

// The content of every tool message in one request, in order.
function toolContents(body: ChatBody): string[] {
  return body.messages
    .filter((message) => message.role === 'tool')
    .map((message) => String(message.content));
}

// A chat step that waits five seconds before it streams, so a stop always lands while the model call is in flight.
function stallAt(turnIndex: number) {
  return {
    match: { endpoint: 'chat', turnIndex },
    delayMs: 5000,
    reply: { kind: 'stream', deltas: ['late'] },
  };
}

// The run-end check of a draft (AGL-17): an extract reply with no claims, so no judge call follows.
function emptyExtractStep(): unknown {
  return {
    match: { endpoint: 'chat', lastMessageContent: EXTRACT_MARKER },
    reply: { kind: 'stream', deltas: ['{"claims":[]}'] },
  };
}

function writeCall(turnIndex: number, name: string, args: string) {
  return {
    match: { endpoint: 'chat', turnIndex },
    reply: { kind: 'toolCalls', calls: [{ name, argumentChunks: [args] }] },
  };
}

// A story graph whose first node id is not a valid id (the dot), so the graph file schema refuses it.
const GRAPH_WITH_BAD_ID =
  '{"schemaVersion":1,"view":"story","name":"First","nodes":[{"id":"a.b","kind":"scene","label":"A","position":{"x":0,"y":0}}],"edges":[]}';
const GRAPH_VALID =
  '{"schemaVersion":1,"view":"story","name":"Ada and the engine","nodes":[{"id":"ada","kind":"entity","label":"Ada","position":{"x":0,"y":0}}],"edges":[]}';

it('C1: no agent write reaches the book before acceptance; a stopped run keeps its change; two edits fold into one change on the first base; an invalid graph is retried and a valid one is filed under graphs/', async () => {
  // (a) No write before acceptance, and a stopped run keeps its changes.
  const gate = await openHarness({
    scenario: 'gate-disk',
    steps: [
      emptyExtractStep(),
      writeCall(
        0,
        'write_file',
        '{"path":"drafts/new-chapter.md","content":"# Chapter\\n"}',
      ),
      writeCall(
        1,
        'edit_file',
        '{"path":"sources/outline.md","old":"# Outline","new":"# Changed"}',
      ),
      stallAt(2),
    ],
  });
  try {
    const book = join(gate.fixture.library, 'book');
    const draft = join(book, 'drafts', 'new-chapter.md');
    const outline = join(book, 'sources', 'outline.md');
    const before = bookFiles(book);
    const stream = await observeEvents(
      gate.app.baseUrl,
      LOOPBACK_HOST,
      gate.cookie,
    );
    try {
      const { runId } = await startRun(gate, { intent: 'Write the chapter' });
      await readUntil(stream, hasResults(2));

      expect(existsSync(draft)).toBe(false);
      expect(readFileSync(outline, 'utf8')).toBe('# Outline\n');
      expect(bookFiles(book)).toEqual(before);

      const stop = await post(gate, AGENT_RUN_STOP_ROUTE, { runId });
      expect(stop.status).toBe(200);
      const events = await readUntil(stream, hasEnded);

      const ended = eventsOf(events, 'run-ended');
      expect(ended[0].data).toMatchObject({ reason: 'stopped' });
      expect(ended[0].data.pendingChangeIds).toHaveLength(2);

      expect(existsSync(draft)).toBe(false);
      expect(readFileSync(outline, 'utf8')).toBe('# Outline\n');
      expect(bookFiles(book)).toEqual(before);

      const changes = await pendingOfBook(gate);
      expect(changes).toHaveLength(2);
      expect(changes).toContainEqual(
        expect.objectContaining({
          targetPath: 'drafts/new-chapter.md',
          kind: 'create',
          capturedBase: null,
          status: 'pending',
          origin: { kind: 'agent-run', runId, toolCallId: expect.any(String) },
        }),
      );
      expect(changes).toContainEqual(
        expect.objectContaining({
          targetPath: 'sources/outline.md',
          kind: 'modify',
          capturedBase: expect.objectContaining({ content: '# Outline\n' }),
        }),
      );

      // The accept route is the only write that changes the book: it creates the accepted draft.
      const created = changes.find(
        (change) => change.targetPath === 'drafts/new-chapter.md',
      );
      expect(created).toBeDefined();
      const accepted = await post(
        gate,
        PROJECT_PENDING_ACCEPT_ROUTE.replace(':projectId', 'book').replace(
          ':id',
          created?.id ?? '',
        ),
        {},
      );
      expect(accepted.status).toBe(200);
      expect(readFileSync(draft, 'utf8')).toBe('# Chapter\n');
      const remaining = await pendingOfBook(gate);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].targetPath).toBe('sources/outline.md');
    } finally {
      await stream.close();
    }
  } finally {
    await gate.close();
  }

  // (b) Two edits to one file in one run fold into one pending change against the first base.
  const twice = await openHarness({
    scenario: 'gate-two-edits',
    steps: [
      writeCall(
        0,
        'edit_file',
        '{"path":"sources/outline.md","old":"# Outline","new":"# Outline A"}',
      ),
      writeCall(1, 'read_file', '{"path":"sources/outline.md"}'),
      writeCall(
        2,
        'edit_file',
        '{"path":"sources/outline.md","old":"Outline A","new":"Outline B"}',
      ),
      {
        match: { endpoint: 'chat', turnIndex: 3 },
        reply: { kind: 'stream', deltas: ['Done.'] },
      },
    ],
  });
  try {
    const book = join(twice.fixture.library, 'book');
    const outline = join(book, 'sources', 'outline.md');
    const before = bookFiles(book);
    const stream = await observeEvents(
      twice.app.baseUrl,
      LOOPBACK_HOST,
      twice.cookie,
    );
    try {
      const { runId } = await startRun(twice, { intent: 'Revise the outline' });
      const events = await readUntil(stream, hasEnded);

      const results = eventsOf(events, 'tool-call-result');
      expect(results).toHaveLength(3);
      expect(results[1].data.output).toEqual({
        path: 'sources/outline.md',
        content: '# Outline A\n',
      });
      const secondEdit = results[2].data.callId;

      const ended = eventsOf(events, 'run-ended');
      expect(ended[0].data).toMatchObject({ reason: 'completed' });
      expect(ended[0].data.pendingChangeIds).toHaveLength(1);

      const changes = await pendingOfBook(twice);
      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({
        targetPath: 'sources/outline.md',
        kind: 'modify',
        capturedBase: { content: '# Outline\n' },
        proposed: '# Outline B\n',
        origin: { kind: 'agent-run', runId, toolCallId: secondEdit },
      });
      expect(readFileSync(outline, 'utf8')).toBe('# Outline\n');
      expect(bookFiles(book)).toEqual(before);
    } finally {
      await stream.close();
    }
  } finally {
    await twice.close();
  }

  // (c) Propose-graph: an invalid graph is retried, and a valid one is filed under graphs/.
  const graphs = await openHarness({
    scenario: 'routing-graph',
    packs: PACKS_ROOT,
    steps: [
      {
        match: { endpoint: 'chat', lastMessageContent: 'Intent: first sketch' },
        reply: { kind: 'stream', deltas: [GRAPH_WITH_BAD_ID] },
      },
      {
        match: {
          endpoint: 'chat',
          lastMessageContent: 'Intent: second sketch',
        },
        reply: { kind: 'stream', deltas: [GRAPH_VALID] },
      },
      {
        match: { endpoint: 'chat', turnIndex: 0 },
        reply: {
          kind: 'toolCalls',
          calls: [
            {
              name: 'propose_graph',
              argumentChunks: [
                '{"intent":"first sketch","view":"story","includeCatalogue":false}',
              ],
            },
          ],
        },
      },
      {
        match: { endpoint: 'chat', turnIndex: 1 },
        reply: {
          kind: 'toolCalls',
          calls: [
            {
              name: 'propose_graph',
              argumentChunks: [
                '{"intent":"second sketch","view":"story","includeCatalogue":false}',
              ],
            },
          ],
        },
      },
      {
        match: { endpoint: 'chat', turnIndex: 2 },
        reply: { kind: 'stream', deltas: ['Sketched.'] },
      },
    ],
  });
  try {
    const book = join(graphs.fixture.library, 'book');
    const before = bookFiles(book);
    const stream = await observeEvents(
      graphs.app.baseUrl,
      LOOPBACK_HOST,
      graphs.cookie,
    );
    try {
      await startRun(graphs, { intent: 'Sketch two graphs for the book' });
      const events = await readUntil(stream, hasEnded);

      // Turn 0: the Zod issue is one readable line at the path of the bad node id.
      const errors = eventsOf(events, 'tool-call-error');
      expect(errors).toHaveLength(1);
      expect(errors[0].data.attempt).toBe(1);
      expect(errors[0].data.message).toContain('graph/nodes/0/id');

      // The model received that line in its next request, which offers the tool again, and retried.
      const offered = chatBodies(
        await recordsOf(graphs.mock, graphs.scenario),
      ).filter((body) =>
        body.tools?.some((tool) => tool.function.name === 'propose_graph'),
      );
      expect(offered).toHaveLength(3);
      expect(toolContents(offered[1])).toEqual([errors[0].data.message]);

      // Turn 1 is the valid graph: one result, and one pending change under graphs/.
      expect(eventsOf(events, 'tool-call-result')).toHaveLength(1);
      const changes = await pendingOfBook(graphs);
      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({
        targetPath: 'graphs/ada-and-the-engine.json',
        kind: 'create',
      });
      expect(
        graphFileSchema.safeParse(JSON.parse(changes[0].proposed)).success,
      ).toBe(true);
      expect(existsSync(join(book, 'graphs'))).toBe(false);
      expect(bookFiles(book)).toEqual(before);
    } finally {
      await stream.close();
    }
  } finally {
    await graphs.close();
  }
}, 60000);
