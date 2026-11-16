import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { stringify } from 'yaml';
import {
  AGENT_RUN_CURRENT_ROUTE,
  AGENT_RUNS_ROUTE,
  agentLoopEventSchema,
  agentRunStateSchema,
  agentStartResponseSchema,
  draftProvenanceSchema,
  type AgentLoopEvent,
} from '@bbartolome/scriba-contracts/agent-loop';
import { TOOL_ENABLED_ROUTE } from '@bbartolome/scriba-contracts/tool-registry';
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

// The narrative tools of AGL-09 through the mock: the offer, the entity resolution, the citations and the provenance.
// Every test builds its own temp library, its own mock scenario folder and its own app, and removes them all.

// The shared fixture packs: cold_open is offered in every genre, and myth_buster for nonfiction.
const FIXTURE_PACKS = join(__dirname, 'fixtures', 'packs');

interface SettingsOptions {
  providerBaseURL: string;
  active?: string | null; // null leaves the projects section out
  providers?: unknown;
  agent?: unknown;
}

// The providers section of one mock provider. Its model is set, so the mock records only chat requests.
function providersSection(
  baseURL: string,
  retries: number = PROVIDER_DEFAULTS.retries,
): unknown {
  return {
    schemaVersion: 1,
    list: [
      {
        id: 'mock',
        kind: 'openai-compatible',
        baseURL,
        model: 'mock-model',
        ...PROVIDER_DEFAULTS,
        retries,
      },
    ],
    appDefault: { providerId: 'mock', model: 'mock-model' },
  };
}

function settingsText(options: SettingsOptions): string {
  const doc: Record<string, unknown> = { schemaVersion: 1 };
  if (options.active !== null) {
    doc.projects = { schemaVersion: 1, active: options.active ?? 'book' };
  }
  doc.providers =
    options.providers ?? providersSection(options.providerBaseURL);
  if (options.agent !== undefined) doc.agent = options.agent;
  return stringify(doc);
}

interface Harness {
  app: TestApp;
  cookie: string;
  mock: MockOpenAI;
  fixture: ProjectsLibrary;
  close: () => Promise<void>;
}

// The project book with its styleProfile and two entities: a person and the house style.
function writeNarrativeProject(library: string): void {
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

// One mock scenario file, one library with `book` active, and the composed app with a session cookie. The app
// reads the fixture packs, so the registry offers cold_open and myth_buster.
async function openHarness(
  scenario: string,
  steps: unknown[],
  settings: (providerBaseURL: string) => SettingsOptions,
): Promise<Harness> {
  const scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-agl09-narrative-'));
  writeFileSync(
    join(scenariosDir, `${scenario}.json`),
    JSON.stringify({ steps }),
  );
  const mock = await startMockOpenAI({ scenariosDir });
  const fixture = buildProjectsLibrary({
    settings: settingsText(settings(`${mock.baseUrl}/scenario/${scenario}/v1`)),
  });
  writeNarrativeProject(fixture.library);
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
      env: { SCRIBA_PACKS_DIR: FIXTURE_PACKS },
    });
    const cookie = await sessionCookie(app, fixture.library);
    return { app, cookie, mock, fixture, close };
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

// One start request, which must answer 200. Returns the parsed reply.
async function startRun(
  h: Harness,
  body: unknown,
): Promise<{ runId: string; conversationId: string }> {
  const reply = await post(h, AGENT_RUNS_ROUTE, body);
  expect(reply.status).toBe(200);
  return agentStartResponseSchema.parse(JSON.parse(reply.body));
}

// The agent-loop events read from the stream, each parsed with the contract, up to and including a run-ended.
async function readUntilEnded(stream: Observer): Promise<AgentLoopEvent[]> {
  const events: AgentLoopEvent[] = [];
  const deadline = Date.now() + 5000;
  while (!events.some((event) => event.type === 'run-ended')) {
    if (Date.now() > deadline) throw new Error('No run-ended within 5 s.');
    for (const block of await stream.take(20)) {
      const envelope: unknown = JSON.parse(dataOf(block));
      if ((envelope as { module?: unknown }).module === 'agent-loop') {
        events.push(agentLoopEventSchema.parse(envelope));
      }
    }
  }
  return events;
}

// The chat requests the mock has received, as the tests read them.
interface WireMessage {
  role: string;
  content?: unknown;
  tool_calls?: Array<{ id: string; function: { name: string } }>;
  tool_call_id?: string;
}

interface ChatBody {
  messages: WireMessage[];
  tools?: Array<{ type: string; function: { name: string } }>;
}

function toolNamesOf(body: ChatBody): string[] {
  return (body.tools ?? []).map((tool) => tool.function.name).sort();
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

// The run-end check of the draft (AGL-17): an extract reply with no claims, listed first.
function emptyExtractStep(): unknown {
  return {
    match: { endpoint: 'chat', lastMessageContent: EXTRACT_MARKER },
    reply: { kind: 'stream', deltas: ['{"claims":[]}'] },
  };
}

// The scenario of a draft: the executor's request, the first model turn that calls cold_open, and the final text.
function draftSteps(args: string): unknown[] {
  return [
    emptyExtractStep(),
    {
      match: {
        endpoint: 'chat',
        lastMessageContent: 'Core idea: Engines reward patience',
      },
      reply: {
        kind: 'stream',
        deltas: ['The cold open opens on the bench at dawn.'],
      },
    },
    {
      match: { endpoint: 'chat', turnIndex: 0 },
      reply: {
        kind: 'toolCalls',
        calls: [{ name: 'cold_open', argumentChunks: [args] }],
      },
    },
    {
      match: { endpoint: 'chat', toolResultPresent: true },
      reply: { kind: 'stream', deltas: ['Drafted.'] },
    },
  ];
}

const DRAFT_ARGS =
  '{"coreIdea":"Engines reward patience","entityIds":["ada-lovelace"],"person":"ada-lovelace"}';

// Starts the draft run of T2 and T4 and reads it to its end.
async function runDraft(
  h: Harness,
  stream: Observer,
): Promise<{ runId: string; events: AgentLoopEvent[] }> {
  const started = await startRun(h, {
    intent: 'Draft the cold open for the engines chapter',
  });
  const events = await readUntilEnded(stream);
  return { runId: started.runId, events };
}

// The transcript lines of the run's log folder, parsed.
function transcriptLines(h: Harness): Array<{ kind: string; data: unknown }> {
  const folder = join(h.fixture.library, 'book', 'logs', 'agent-runs');
  const files = readdirSync(folder, { recursive: true }).filter(
    (name): name is string =>
      typeof name === 'string' && name.endsWith('.jsonl'),
  );
  return files.flatMap((name) =>
    readFileSync(join(folder, name), 'utf8')
      .split('\n')
      .filter((line) => line !== '')
      .map((line) => JSON.parse(line) as { kind: string; data: unknown }),
  );
}

it('T1: a disabled registry tool is absent from the next request, and back after it is re-enabled', async () => {
  const h = await openHarness(
    'enabled',
    [
      {
        match: { endpoint: 'chat' },
        reply: { kind: 'stream', deltas: ['Done.'] },
      },
    ],
    (url) => ({ providerBaseURL: url }),
  );
  try {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      const off = await post(
        h,
        TOOL_ENABLED_ROUTE.replace(':name', 'cold_open'),
        { enabled: false },
      );
      expect(off.status).toBe(200);
      await startRun(h, { intent: 'Say done' });
      await readUntilEnded(stream);

      const on = await post(
        h,
        TOOL_ENABLED_ROUTE.replace(':name', 'cold_open'),
        { enabled: true },
      );
      expect(on.status).toBe(200);
      await startRun(h, { intent: 'Say done again' });
      await readUntilEnded(stream);

      const [first, second] = chatBodies(await recordsOf(h.mock, 'enabled'));
      expect(toolNamesOf(first)).toContain('myth_buster');
      expect(toolNamesOf(first)).not.toContain('cold_open');
      expect(toolNamesOf(second)).toContain('cold_open');
      for (const body of [first, second]) {
        expect(toolNamesOf(body)).toEqual(
          expect.arrayContaining(['list_files', 'read_file', 'search_notes']),
        );
      }
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('T2: a narrative call sends the resolved entity text to the executor and the card carries sourcesUsed', async () => {
  const h = await openHarness('draft', draftSteps(DRAFT_ARGS), (url) => ({
    providerBaseURL: url,
  }));
  try {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      const { runId, events } = await runDraft(h, stream);

      const started = events.find(
        (event) => event.type === 'tool-call-started',
      );
      expect(started).toMatchObject({
        type: 'tool-call-started',
        data: { name: 'cold_open', family: 'narrative' },
      });
      const result = events.find((event) => event.type === 'tool-call-result');
      expect(result).toMatchObject({
        type: 'tool-call-result',
        data: {
          output: {
            kind: 'draft',
            content: 'The cold open opens on the bench at dawn.',
          },
          sourcesUsed: ['ada-lovelace'],
        },
      });

      // The executor's own request: the mock holds it next to the agent's requests.
      const records = await recordsOf(h.mock, 'draft');
      const executor = chatBodies(records).find((body) =>
        String(body.messages[0]?.content).startsWith(
          'Write the answer as Markdown prose.',
        ),
      );
      expect(executor).toBeDefined();
      expect(String(executor?.messages[1]?.content)).toContain(
        'Ada wrote the first program.',
      );

      // The run state holds the card with its sources.
      const state = agentRunStateSchema.parse(
        JSON.parse((await get(h, AGENT_RUN_CURRENT_ROUTE)).body),
      );
      expect(state.runId).toBe(runId);
      const card = state.cards.find((item) => item.name === 'cold_open');
      expect(card?.sourcesUsed).toEqual(['ada-lovelace']);
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('T3: an unknown entity ID is a readable error, and a second one is attempt 2', async () => {
  const badArgs =
    '{"coreIdea":"Engines reward patience","entityIds":[],"person":"ghost-entity"}';
  const h = await openHarness(
    'ghost',
    [
      {
        match: { endpoint: 'chat', turnIndex: 0 },
        reply: {
          kind: 'toolCalls',
          calls: [{ name: 'cold_open', argumentChunks: [badArgs] }],
        },
      },
      {
        match: { endpoint: 'chat', turnIndex: 1 },
        reply: {
          kind: 'toolCalls',
          calls: [{ name: 'cold_open', argumentChunks: [badArgs] }],
        },
      },
      {
        match: { endpoint: 'chat', turnIndex: 2 },
        reply: { kind: 'stream', deltas: ['Stopping here.'] },
      },
    ],
    (url) => ({ providerBaseURL: url }),
  );
  try {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      await startRun(h, { intent: 'Draft the cold open' });
      const events = await readUntilEnded(stream);

      const errors = events.filter((event) => event.type === 'tool-call-error');
      expect(errors.map((event) => event.data)).toMatchObject([
        { attempt: 1 },
        { attempt: 2 },
      ]);
      for (const event of errors) {
        const message = (event.data as { message: string }).message;
        expect(message).toContain('person');
        expect(message).toContain('ghost-entity');
        expect(message).toContain('is not in this project');
        expect(message.split('\n').pop()).toMatch(
          /^Expected arguments for cold_open:/,
        );
      }
      expect(events.some((event) => event.type === 'tool-call-result')).toBe(
        false,
      );

      const records = await recordsOf(h.mock, 'ghost');
      expect(records).toHaveLength(3);
      const bodies = chatBodies(records);
      for (const body of bodies) {
        expect(String(body.messages[0]?.content)).not.toContain(
          'Write the answer as Markdown prose.',
        );
      }
      expect(toolContents(bodies[1])).toEqual([errors[0].data.message]);
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('T4: a draft carries its provenance on the event, the card and the transcript', async () => {
  const h = await openHarness('provenance', draftSteps(DRAFT_ARGS), (url) => ({
    providerBaseURL: url,
  }));
  try {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      const { runId, events } = await runDraft(h, stream);
      const started = events.find(
        (event) => event.type === 'tool-call-started',
      );
      const callId = (started?.data as { callId: string }).callId;

      const result = events.find((event) => event.type === 'tool-call-result');
      const provenance = draftProvenanceSchema.parse(
        (result?.data as { provenance: unknown }).provenance,
      );
      expect(provenance).toEqual({
        runId,
        toolCallId: callId,
        tool: 'cold_open',
        entityIds: ['ada-lovelace', 'house-style'],
        sourcesUsed: ['ada-lovelace'],
        model: 'mock-model',
        at: provenance.at,
      });
      expect(Number.isNaN(Date.parse(provenance.at))).toBe(false);

      // The card in the run state.
      const state = agentRunStateSchema.parse(
        JSON.parse((await get(h, AGENT_RUN_CURRENT_ROUTE)).body),
      );
      const card = state.cards.find((item) => item.callId === callId);
      expect(card?.provenance).toEqual(provenance);

      // The transcript: one tool-result line with the same provenance.
      const toolResults = transcriptLines(h).filter(
        (line) => line.kind === 'tool-result',
      );
      expect(toolResults).toHaveLength(1);
      expect(
        (toolResults[0].data as { provenance: unknown }).provenance,
      ).toEqual(provenance);
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});
