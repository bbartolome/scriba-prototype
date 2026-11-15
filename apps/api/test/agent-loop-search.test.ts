import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { stringify } from 'yaml';
import {
  AGENT_RUNS_ROUTE,
  agentLoopEventSchema,
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
import { putFile } from './project-store-files.kit';
import { buildProjectsLibrary } from './project-store-projects.kit';
import {
  recordsOf,
  startMockOpenAI,
  type MockOpenAI,
} from './providers-client.kit';
import { dataOf } from './sse';

// AGL-10: search_notes, as scripted turns through the composed app with the mock OpenAI server (D-10). Each test
// builds its own temp library and app, and removes them. The mock and its scenario folder are shared by both tests.

const SEARCH_SCENARIO = 'search-notes-ac1';
const INVALID_SCENARIO = 'search-notes-ac2';

// The models step of tool-call.json (step 0), so a model list is answered if one is asked for.
const MODELS_STEP = {
  match: { endpoint: 'models' },
  reply: {
    kind: 'status',
    status: 200,
    body: {
      object: 'list',
      data: [{ id: 'mock-model', object: 'model', owned_by: 'scriba-mock' }],
    },
  },
};

const SEARCH_STEPS = [
  MODELS_STEP,
  {
    match: { endpoint: 'chat', toolResultPresent: false },
    reply: {
      kind: 'toolCalls',
      calls: [
        {
          name: 'search_notes',
          argumentChunks: ['{"query":', '"gamma"}'],
        },
      ],
    },
  },
  {
    match: { endpoint: 'chat', toolResultPresent: true },
    reply: { kind: 'stream', deltas: ['Three passages found.'] },
  },
];

// The seven invalid calls of criterion 2. `args` is what the event carries: the parsed object, or the raw string
// when the JSON does not parse. `problem` is the line the model is given for the one problem.
interface InvalidCase {
  id: string;
  raw: string;
  args: unknown;
  problem: string;
}

const INVALID_CASES: InvalidCase[] = [
  { id: 'a', raw: '{}', args: {}, problem: 'query: is required' },
  {
    id: 'b',
    raw: '{"query":3}',
    args: { query: 3 },
    problem: 'query: must be a string',
  },
  {
    id: 'c',
    raw: '{"query":""}',
    args: { query: '' },
    problem: 'query: must NOT have fewer than 1 characters',
  },
  {
    id: 'd',
    raw: '{"query":"gamma","limit":0}',
    args: { query: 'gamma', limit: 0 },
    problem: 'limit: must be >= 1',
  },
  {
    id: 'e',
    raw: '{"query":"gamma","scope":["drafts"]}',
    args: { query: 'gamma', scope: ['drafts'] },
    problem: 'scope/0: must be equal to one of the allowed values',
  },
  {
    id: 'f',
    raw: '{"query":"gamma","extra":1}',
    args: { query: 'gamma', extra: 1 },
    problem: 'extra: is not an argument of this tool',
  },
  {
    id: 'g',
    raw: '{"query": ',
    args: '{"query": ',
    problem: 'arguments: is not valid JSON',
  },
];

const EXPECTED_LINE =
  'Expected arguments for search_notes: query (string, required), limit (integer, optional), scope (array, optional).';

const INVALID_STEPS = [
  MODELS_STEP,
  ...INVALID_CASES.map((item) => ({
    match: {
      endpoint: 'chat',
      toolResultPresent: false,
      lastMessageContent: `case-${item.id}`,
    },
    reply: {
      kind: 'toolCalls',
      calls: [{ name: 'search_notes', argumentChunks: [item.raw] }],
    },
  })),
  {
    match: { endpoint: 'chat', toolResultPresent: true },
    reply: { kind: 'stream', deltas: ['Noted.'] },
  },
];

// The fixture of criterion 1. The draft holds the query word, so its absence from the result means something.
// The library builder also writes sources/outline.md, which is indexed and does not match.
const SEARCH_FILES: Record<string, string> = {
  'book/sources/quotes.md': 'Gamma rays and gamma bursts.\n',
  'book/sources/light.md': 'Gamma gamma gamma light.\n',
  'book/sources/notes.md': 'A gamma note.\n',
  'book/drafts/chapter-1.md': 'Gamma in a chapter draft.\n',
};

// The chat requests as the tests read them.
interface WireMessage {
  role: string;
  content?: unknown;
  tool_calls?: Array<{
    id: string;
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

interface ChatBody {
  messages: WireMessage[];
  tools?: Array<{
    type: string;
    function: { name: string; parameters?: unknown };
  }>;
}

interface Passage {
  path: string;
  offset: number;
  snippet: string;
  score: number;
}

let scenariosDir: string | undefined;
let mock: MockOpenAI | undefined;

beforeAll(async () => {
  scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-agl10-search-'));
  writeFileSync(
    join(scenariosDir, `${SEARCH_SCENARIO}.json`),
    JSON.stringify({ steps: SEARCH_STEPS }),
  );
  writeFileSync(
    join(scenariosDir, `${INVALID_SCENARIO}.json`),
    JSON.stringify({ steps: INVALID_STEPS }),
  );
  mock = await startMockOpenAI({ scenariosDir });
});

afterAll(async () => {
  try {
    await mock?.close();
  } finally {
    if (scenariosDir !== undefined) {
      rmSync(scenariosDir, { recursive: true, force: true });
    }
  }
});

function mockServer(): MockOpenAI {
  if (mock === undefined) throw new Error('The mock OpenAI server is not up.');
  return mock;
}

// The settings of one test: `book` is active, and one keyless openai-compatible provider points at the test's own
// scenario on the mock.
function settingsFor(scenario: string): string {
  const baseURL = `${mockServer().baseUrl}/scenario/${scenario}/v1`;
  return stringify({
    schemaVersion: 1,
    projects: { schemaVersion: 1, active: 'book' },
    providers: {
      schemaVersion: 1,
      list: [
        {
          id: 'mock',
          kind: 'openai-compatible',
          baseURL,
          model: 'mock-model',
          ...PROVIDER_DEFAULTS,
        },
      ],
      appDefault: { providerId: 'mock', model: 'mock-model' },
    },
  });
}

interface Harness {
  app: TestApp;
  cookie: string;
}

// Runs a body against a fresh temp library (with the given files written into it), the composed app, and a session
// cookie. The app is closed and the library removed afterwards.
async function withApp(
  scenario: string,
  files: Record<string, string>,
  body: (h: Harness) => Promise<void>,
): Promise<void> {
  const fixture = buildProjectsLibrary({ settings: settingsFor(scenario) });
  let app: TestApp | undefined;
  try {
    for (const [path, text] of Object.entries(files)) {
      putFile(fixture.library, path, text);
    }
    app = await createTestApp({ libraryDir: fixture.library });
    const cookie = await sessionCookie(app, fixture.library);
    await body({ app, cookie });
  } finally {
    try {
      await app?.close();
    } finally {
      fixture.remove();
    }
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

// One scripted turn: the start request must answer 200, then the events of that run are read in arrival order until
// its run-ended. Each event is parsed with the contract, and the seq values run 1, 2, 3 without gaps.
async function runTurn(
  h: Harness,
  stream: Observer,
  intent: string,
): Promise<AgentLoopEvent[]> {
  const reply = await post(h, AGENT_RUNS_ROUTE, { intent });
  expect(reply.status).toBe(200);
  const { runId } = agentStartResponseSchema.parse(JSON.parse(reply.body));
  const events: AgentLoopEvent[] = [];
  const deadline = Date.now() + 5000;
  while (!events.some((event) => event.type === 'run-ended')) {
    if (Date.now() > deadline) {
      throw new Error(`No run-ended for ${runId} within 5 s.`);
    }
    for (const block of await stream.take(20)) {
      const envelope: unknown = JSON.parse(dataOf(block));
      if ((envelope as { module?: unknown }).module !== 'agent-loop') continue;
      const event = agentLoopEventSchema.parse(envelope);
      if (event.data.runId === runId) events.push(event);
    }
  }
  const seqs = events.map((event) => event.data.seq);
  expect(seqs).toEqual(seqs.map((_, index) => index + 1));
  return events;
}

// The event types of a turn, without the token deltas.
function typesOf(events: AgentLoopEvent[]): string[] {
  return events
    .filter((event) => event.type !== 'token-delta')
    .map((event) => event.type);
}

// The text of the token deltas of a turn, joined.
function textOf(events: AgentLoopEvent[]): string {
  return events
    .filter((event) => event.type === 'token-delta')
    .map((event) => String((event.data as { text?: unknown }).text))
    .join('');
}

// The data of the one event of a type in a turn.
function dataFor(
  events: AgentLoopEvent[],
  type: string,
): Record<string, unknown> {
  const matches = events.filter((event) => event.type === type);
  expect(matches).toHaveLength(1);
  return matches[0].data as Record<string, unknown>;
}

// The chat requests the mock has received for one scenario, in arrival order.
async function chatBodies(scenario: string): Promise<ChatBody[]> {
  const records = await recordsOf(mockServer(), scenario);
  return records
    .filter((record) => record.endpoint === 'chat')
    .map((record) => record.body as ChatBody);
}

it('AC1: a scripted turn calling search_notes gets ranked passages from sources/, and drafts/ never appears', async () => {
  await withApp(SEARCH_SCENARIO, SEARCH_FILES, async (h) => {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      const events = await runTurn(h, stream, 'Find gamma in my notes.');

      expect(typesOf(events)).toEqual([
        'run-started',
        'tool-call-started',
        'tool-call-args',
        'tool-call-result',
        'run-ended',
      ]);
      expect(textOf(events)).toBe('Three passages found.');

      const started = dataFor(events, 'tool-call-started');
      expect(started).toMatchObject({
        name: 'search_notes',
        family: 'project',
      });
      const callId = String(started.callId);

      expect(dataFor(events, 'tool-call-args')).toMatchObject({
        callId,
        arguments: { query: 'gamma' },
        valid: true,
      });

      const result = dataFor(events, 'tool-call-result');
      expect(result.callId).toBe(callId);
      expect(result.summary).toBe('Found 3 passages for "gamma".');
      const passages = (result.output as { passages: Passage[] }).passages;
      expect(passages.map((passage) => passage.path)).toEqual([
        'sources/light.md',
        'sources/quotes.md',
        'sources/notes.md',
      ]);
      for (let index = 1; index < passages.length; index += 1) {
        expect(passages[index].score).toBeLessThan(passages[index - 1].score);
      }
      expect(
        passages.every((passage) => passage.path.startsWith('sources/')),
      ).toBe(true);
      expect(JSON.stringify(result.output)).not.toContain('drafts/');

      expect(dataFor(events, 'run-ended')).toMatchObject({
        reason: 'completed',
        pendingChangeIds: [],
      });

      // The mock's requests: the first offers search_notes with the C-4 schema, and the second carries the call and
      // its result under the same id.
      const chats = await chatBodies(SEARCH_SCENARIO);
      expect(chats).toHaveLength(2);
      const offered = (chats[0].tools ?? []).find(
        (tool) => tool.function.name === 'search_notes',
      );
      expect(offered).toBeDefined();
      const parameters = offered?.function.parameters as {
        properties: Record<string, unknown>;
        required: string[];
        additionalProperties: boolean;
      };
      expect(Object.keys(parameters.properties)).toEqual([
        'query',
        'limit',
        'scope',
      ]);
      expect(parameters.required).toEqual(['query']);
      expect(parameters.additionalProperties).toBe(false);

      const calls = chats[1].messages
        .filter((message) => message.role === 'assistant')
        .flatMap((message) => message.tool_calls ?? []);
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({
        id: callId,
        function: { name: 'search_notes', arguments: '{"query":"gamma"}' },
      });
      const toolMessages = chats[1].messages.filter(
        (message) => message.role === 'tool',
      );
      expect(toolMessages).toHaveLength(1);
      expect(toolMessages[0].tool_call_id).toBe(callId);
      expect(toolMessages[0].content).toBe(JSON.stringify(result.output));
    } finally {
      await stream.close();
    }
  });
});

it('AC2: invalid search_notes arguments in a scripted turn get the readable error', async () => {
  await withApp(INVALID_SCENARIO, {}, async (h) => {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      for (const item of INVALID_CASES) {
        const before = (await chatBodies(INVALID_SCENARIO)).length;
        const events = await runTurn(
          h,
          stream,
          `Search the notes, case-${item.id}.`,
        );

        expect(typesOf(events)).toEqual([
          'run-started',
          'tool-call-started',
          'tool-call-args',
          'tool-call-error',
          'run-ended',
        ]);
        expect(textOf(events)).toBe('Noted.');

        const started = dataFor(events, 'tool-call-started');
        expect(started).toMatchObject({
          name: 'search_notes',
          family: 'project',
        });
        const callId = String(started.callId);

        expect(dataFor(events, 'tool-call-args')).toMatchObject({
          callId,
          valid: false,
        });
        expect(dataFor(events, 'tool-call-args').arguments).toEqual(item.args);

        const error = dataFor(events, 'tool-call-error');
        expect(error).toMatchObject({
          callId,
          attempt: 1,
          message: `${item.problem}\n${EXPECTED_LINE}`,
        });
        expect('withdrawn' in error).toBe(false);

        expect(dataFor(events, 'run-ended')).toMatchObject({
          reason: 'completed',
          pendingChangeIds: [],
        });

        // Exactly two chat requests for this turn: the offer, then the call with its readable error.
        const chats = await chatBodies(INVALID_SCENARIO);
        expect(chats).toHaveLength(before + 2);
        const turn = chats.slice(before);
        expect(
          (turn[0].tools ?? []).map((tool) => tool.function.name),
        ).toContain('search_notes');
        const calls = turn[1].messages
          .filter((message) => message.role === 'assistant')
          .flatMap((message) => message.tool_calls ?? []);
        expect(calls).toHaveLength(1);
        expect(calls[0]).toMatchObject({
          id: callId,
          function: { name: 'search_notes', arguments: item.raw },
        });
        const toolMessages = turn[1].messages.filter(
          (message) => message.role === 'tool',
        );
        expect(toolMessages).toHaveLength(1);
        expect(toolMessages[0].tool_call_id).toBe(callId);
        expect(toolMessages[0].content).toBe(error.message);
      }
    } finally {
      await stream.close();
    }
  });
});
