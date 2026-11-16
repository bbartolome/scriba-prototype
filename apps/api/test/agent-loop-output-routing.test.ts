import {
  existsSync,
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
  AGENT_RUNS_ROUTE,
  agentLoopEventSchema,
  agentStartResponseSchema,
  type AgentLoopEvent,
} from '@bbartolome/scriba-contracts/agent-loop';
import {
  PROJECT_PENDING_ROUTE,
  pendingListSchema,
  type PendingChange,
} from '@bbartolome/scriba-contracts/project-store';
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

// The routing of draft, entity, graph and check outputs (AGL-13) through the composed app and the mock.
// Every test builds its own temp library, its own mock scenario folder and its own app, and removes them all.

// The shared fixture packs: cold_open is a draft tool in every genre.
const FIXTURE_PACKS = join(__dirname, 'fixtures', 'packs');

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
  packs: string; // SCRIBA_PACKS_DIR of the app
  prepare?: (library: string) => void; // writes the project of the test
}

// One mock scenario file, one library with `book` active, and the composed app with a session cookie.
async function openHarness(options: OpenOptions): Promise<Harness> {
  const { scenario, steps, packs, prepare } = options;
  const scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-agl13-routing-'));
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
      env: { SCRIBA_PACKS_DIR: packs },
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

async function startRun(h: Harness, body: unknown): Promise<{ runId: string }> {
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

function get(h: Harness, path: string): Promise<Reply> {
  return send(h.app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie: h.cookie,
    method: 'GET',
    path,
  });
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

// The text of the last message of one request.
function lastContentOf(body: ChatBody): string {
  return String(body.messages[body.messages.length - 1]?.content);
}

// The executor's requests are the ones whose last message holds the rendered prompt of the tool.
function executorRequestsOf(bodies: ChatBody[], prompt: string): ChatBody[] {
  return bodies.filter((body) => lastContentOf(body).includes(prompt));
}

// Every file under a folder, keyed by its path relative to the folder. The top-level folder `skip` is left out.
function filesOf(root: string, skip: string): Record<string, string> {
  const found: Record<string, string> = {};
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      if (relative === skip) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full, relative);
      else found[relative] = readFileSync(full, 'utf8');
    }
  };
  walk(root, '');
  return found;
}

// The draft: a call to cold_open with the given arguments. The arguments are the raw string the model sends.
function coldOpenCall(turnIndex: number, args: string) {
  return {
    match: { endpoint: 'chat', turnIndex },
    reply: {
      kind: 'toolCalls',
      calls: [{ name: 'cold_open', argumentChunks: [args] }],
    },
  };
}

const BASE_ARGS =
  '{"coreIdea":"Engines reward patience","person":"ada-lovelace"}';
const DRAFT_TEXT = 'The cold open opens on the bench at dawn.';

it('AC1: a draft output with no target lands at the generated path; a target outside drafts/ is refused readably', async () => {
  const h = await openHarness({
    scenario: 'routing-draft',
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
        '{"coreIdea":"Engines reward patience","person":"ada-lovelace","target":"sources/outline.md"}',
      ),
      coldOpenCall(1, BASE_ARGS),
      coldOpenCall(
        2,
        '{"coreIdea":"Engines reward patience","person":"ada-lovelace","target":"drafts/chapter-one.md"}',
      ),
      {
        match: { endpoint: 'chat', turnIndex: 3 },
        reply: { kind: 'stream', deltas: ['Done.'] },
      },
    ],
  });
  try {
    const book = join(h.fixture.library, 'book');
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      await startRun(h, {
        intent: 'Draft the cold open for the engines chapter',
      });
      const events = await readUntilEnded(stream);

      // Turn 0: the target outside drafts/ is refused by the handler, with a readable line and no executor call.
      const errors = eventsOf(events, 'tool-call-error');
      expect(errors).toHaveLength(1);
      expect(errors[0].data.attempt).toBe(1);
      expect(errors[0].data.message).toContain('target');
      expect(errors[0].data.message).toContain('drafts/');

      // Turns 1 and 2 reach the executor; the refused call does not.
      const bodies = chatBodies(await recordsOf(h.mock, h.scenario));
      expect(
        executorRequestsOf(bodies, 'Core idea: Engines reward patience'),
      ).toHaveLength(2);

      const results = eventsOf(events, 'tool-call-result');
      expect(results).toHaveLength(2);
      const [generated, explicit] = results.map((event) => event.data.callId);

      const ended = eventsOf(events, 'run-ended');
      const changes = await pendingOfBook(h);
      expect(changes).toHaveLength(2);
      const first = changes.find(
        (change) => change.origin.toolCallId === generated,
      );
      const second = changes.find(
        (change) => change.origin.toolCallId === explicit,
      );
      expect(first).toMatchObject({
        kind: 'create',
        proposed: DRAFT_TEXT,
        provenance: expect.objectContaining({ tool: 'cold_open' }),
      });
      expect(first?.targetPath).toMatch(/^drafts\/cold_open-\d{8}-\d{4}\.md$/);
      expect(second).toMatchObject({
        targetPath: 'drafts/chapter-one.md',
        kind: 'create',
      });
      expect(ended[0].data.pendingChangeIds).toEqual([first?.id, second?.id]);

      // Nothing is written to disk: the outline is unchanged and the drafts folder does not exist.
      expect(readFileSync(join(book, 'sources', 'outline.md'), 'utf8')).toBe(
        '# Outline\n',
      );
      expect(existsSync(join(book, 'drafts'))).toBe(false);
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('AC3: a check output creates no file', async () => {
  // A packs root with one test-only check tool. It has no genre folder, so only core tools are offered.
  const packs = mkdtempSync(join(tmpdir(), 'scriba-agl13-packs-'));
  mkdirSync(join(packs, 'core', 'tools'), { recursive: true });
  writeFileSync(
    join(packs, 'core', 'tools', 'check_draft.yaml'),
    [
      'schemaVersion: 1',
      'name: check_draft',
      'description: Lists the problems of a draft text.',
      'inputs:',
      '  type: object',
      '  properties:',
      '    text:',
      '      type: string',
      '      title: Text',
      '      x-scriba-type: text',
      '      x-scriba-port: true',
      '      x-scriba-control: textarea',
      '  required: [text]',
      'output: check',
      'enabled: true',
      'prompt: |',
      '  Check this text: {{text}}',
      '',
    ].join('\n'),
  );
  try {
    const h = await openHarness({
      scenario: 'routing-check',
      packs,
      steps: [
        {
          match: {
            endpoint: 'chat',
            lastMessageContent: 'Check this text: Draft text',
          },
          reply: { kind: 'stream', deltas: ['No findings.'] },
        },
        {
          match: { endpoint: 'chat', turnIndex: 0 },
          reply: {
            kind: 'toolCalls',
            calls: [
              {
                name: 'check_draft',
                argumentChunks: ['{"text":"Draft text"}'],
              },
            ],
          },
        },
        {
          match: { endpoint: 'chat', turnIndex: 1 },
          reply: { kind: 'stream', deltas: ['Checked.'] },
        },
      ],
    });
    try {
      const before = filesOf(join(h.fixture.library, 'book'), 'logs');
      const stream = await observeEvents(
        h.app.baseUrl,
        LOOPBACK_HOST,
        h.cookie,
      );
      try {
        await startRun(h, { intent: 'Check the draft text' });
        const events = await readUntilEnded(stream);

        // The offer of check_draft has no target property.
        const bodies = chatBodies(await recordsOf(h.mock, h.scenario));
        const offered = bodies.find((body) =>
          body.tools?.some((tool) => tool.function.name === 'check_draft'),
        );
        const tool = offered?.tools?.find(
          (item) => item.function.name === 'check_draft',
        );
        expect(Object.keys(tool?.function.parameters.properties ?? {})).toEqual(
          ['text'],
        );

        // The card carries the findings, and no file is proposed.
        const results = eventsOf(events, 'tool-call-result');
        expect(results).toHaveLength(1);
        expect(results[0].data.output).toMatchObject({
          kind: 'check',
          content: 'No findings.',
        });
        expect(await pendingOfBook(h)).toEqual([]);
        expect(eventsOf(events, 'run-ended')[0].data.pendingChangeIds).toEqual(
          [],
        );

        // The project folder, without the run logs, is the same before and after the run.
        const after = filesOf(join(h.fixture.library, 'book'), 'logs');
        expect(after).toEqual(before);
      } finally {
        await stream.close();
      }
    } finally {
      await h.close();
    }
  } finally {
    rmSync(packs, { recursive: true, force: true });
  }
});
