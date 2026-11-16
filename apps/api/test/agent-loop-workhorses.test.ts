import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { stringify } from 'yaml';
import {
  AGENT_RUNS_ROUTE,
  agentLoopEventSchema,
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

// The four nonfiction workhorses of AGL-09 and AGL-10 called by the agent from an intent, through the mock.
// Every test builds its own temp library, its own mock scenario folder and its own app, and removes them all.
// The IDs and paths are literals of this file; no sample folder is read.

// The real packs: the nonfiction workhorses and the core tools.
const PACKS_ROOT = join(__dirname, '..', '..', '..', 'packages', 'packs');

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

// The project book, nonfiction, with the style profile and five entities and three sources, all written here.
function writeWorkhorseProject(library: string): void {
  const book = join(library, 'book');
  mkdirSync(join(book, 'entities'), { recursive: true });
  mkdirSync(join(book, 'sources'), { recursive: true });
  writeFileSync(
    join(book, 'project.yaml'),
    'schemaVersion: 1\ntitle: Book\ngenrePack: nonfiction\nstyleProfile: book-style\n',
  );
  const entities: Record<string, string> = {
    'book-style': '---\ntype: style-profile\n---\nPlain sentences.\n',
    'k-anders-ericsson': '---\ntype: person\n---\nResearcher of expertise.\n',
    'deliberate-practice':
      '---\ntype: concept\n---\nFocused, effortful practice.\n',
    'hours-figure-is-average':
      '---\ntype: claim\n---\nThe figure is an average.\n',
    'plateau-is-reorganising':
      '---\ntype: claim\n---\nA plateau reorganises skill.\n',
  };
  for (const [id, text] of Object.entries(entities)) {
    writeFileSync(join(book, 'entities', `${id}.md`), text);
  }
  const sources: Record<string, string> = {
    'deliberate-practice-notes': '---\ntype: source\n---\nNotes on practice.\n',
    'learning-plateaus-notes': '---\ntype: source\n---\nNotes on plateaus.\n',
    'ten-thousand-hours-notes':
      '---\ntype: source\n---\nNotes on the hours figure.\n',
  };
  for (const [id, text] of Object.entries(sources)) {
    writeFileSync(join(book, 'sources', `${id}.md`), text);
  }
}

// One mock scenario file, one library with `book` active, and the composed app with a session cookie.
async function openHarness(
  scenario: string,
  steps: unknown[],
  settings: (providerBaseURL: string) => SettingsOptions,
): Promise<Harness> {
  const scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-agl11-workhorses-'));
  writeFileSync(
    join(scenariosDir, `${scenario}.json`),
    JSON.stringify({ steps }),
  );
  const mock = await startMockOpenAI({ scenariosDir });
  const fixture = buildProjectsLibrary({
    settings: settingsText(settings(`${mock.baseUrl}/scenario/${scenario}/v1`)),
  });
  writeWorkhorseProject(fixture.library);
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
      env: { SCRIBA_PACKS_DIR: PACKS_ROOT },
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

interface Workhorse {
  tool: string;
  intent: string;
  coreIdea: string;
  arguments: Record<string, unknown>;
  sourcesUsed: string[];
}

// The four rows. Each sourcesUsed is in YAML property order (C19) and holds at least one source ID.
const WORKHORSE_CASES: Workhorse[] = [
  {
    tool: 'cold_open',
    intent:
      'draft a cold open about the person in my notes on the 10,000 hour idea',
    coreIdea: 'Practice shapes the expert',
    arguments: {
      entityIds: ['deliberate-practice-notes', 'ten-thousand-hours-notes'],
      person: 'k-anders-ericsson',
    },
    sourcesUsed: [
      'deliberate-practice-notes',
      'ten-thousand-hours-notes',
      'k-anders-ericsson',
    ],
  },
  {
    tool: 'mystery_question',
    intent: 'Open a chapter with the puzzle of the ten thousand hour figure.',
    coreIdea: 'Practice without progress',
    arguments: {
      entityIds: ['deliberate-practice', 'learning-plateaus-notes'],
      puzzle: 'Why do some learners stall after years of practice',
    },
    sourcesUsed: ['deliberate-practice', 'learning-plateaus-notes'],
  },
  {
    tool: 'myth_buster',
    intent: 'Bust the myth that ten thousand hours is a threshold.',
    coreIdea: 'Hours are not a threshold',
    arguments: {
      entityIds: ['ten-thousand-hours-notes'],
      belief: 'Ten thousand hours makes an expert',
      claimIds: ['hours-figure-is-average'],
    },
    sourcesUsed: ['ten-thousand-hours-notes', 'hours-figure-is-average'],
  },
  {
    tool: 'numbers_to_people',
    intent: "Turn the ten thousand hour figure into a person's story.",
    coreIdea: 'A figure becomes a life',
    arguments: {
      entityIds: ['ten-thousand-hours-notes'],
      statistic: 'A figure of ten thousand hours from one 1993 study',
      person: 'k-anders-ericsson',
    },
    sourcesUsed: ['ten-thousand-hours-notes', 'k-anders-ericsson'],
  },
];

it.each(WORKHORSE_CASES)(
  'C1 $tool: called by the agent from an intent, the workhorse returns a draft whose sourcesUsed and provenance name its sources',
  async (row) => {
    const scenario = `workhorse-${row.tool}`;
    const h = await openHarness(
      scenario,
      [
        // The executor's request: its last message starts with the core idea.
        {
          match: {
            endpoint: 'chat',
            lastMessageContent: `Core idea: ${row.coreIdea}`,
          },
          reply: { kind: 'stream', deltas: ['Scripted draft.'] },
        },
        // The agent's first turn calls the workhorse.
        {
          match: { endpoint: 'chat', toolResultPresent: false },
          reply: {
            kind: 'toolCalls',
            calls: [
              {
                name: row.tool,
                argumentChunks: [
                  JSON.stringify({ coreIdea: row.coreIdea, ...row.arguments }),
                ],
              },
            ],
          },
        },
        // The agent's last turn, after the tool result.
        {
          match: { endpoint: 'chat', toolResultPresent: true },
          reply: { kind: 'stream', deltas: ['Drafted.'] },
        },
      ],
      (url) => ({ providerBaseURL: url }),
    );
    try {
      const stream = await observeEvents(
        h.app.baseUrl,
        LOOPBACK_HOST,
        h.cookie,
      );
      try {
        const started = await startRun(h, { intent: row.intent });
        const events = await readUntilEnded(stream);

        const callStarted = events.find(
          (event) => event.type === 'tool-call-started',
        );
        expect(callStarted).toMatchObject({
          type: 'tool-call-started',
          data: { name: row.tool, family: 'narrative' },
        });
        const callId = (callStarted?.data as { callId: string }).callId;

        const args = events.find((event) => event.type === 'tool-call-args');
        expect(args).toMatchObject({ data: { valid: true } });

        const result = events.find(
          (event) => event.type === 'tool-call-result',
        );
        expect(result).toMatchObject({
          type: 'tool-call-result',
          data: {
            output: { kind: 'draft', content: 'Scripted draft.' },
            sourcesUsed: row.sourcesUsed,
          },
        });

        // The provenance on the result event, checked against the run and the call.
        const provenance = draftProvenanceSchema.parse(
          (result?.data as { provenance: unknown }).provenance,
        );
        // entityIds is in field order, so it is compared sorted.
        expect({
          ...provenance,
          entityIds: [...provenance.entityIds].sort(),
        }).toEqual({
          runId: started.runId,
          toolCallId: callId,
          tool: row.tool,
          entityIds: [...row.sourcesUsed, 'book-style'].sort(),
          sourcesUsed: row.sourcesUsed,
          model: 'mock-model',
          at: provenance.at,
        });
        expect(Number.isNaN(Date.parse(provenance.at))).toBe(false);

        expect(
          events.find((event) => event.type === 'run-ended'),
        ).toMatchObject({
          type: 'run-ended',
          data: { reason: 'completed' },
        });

        // The mock's requests: the agent offers the tool, the executor's prompt cites the sources, and the
        // agent's last turn holds the tool result.
        const records = await recordsOf(h.mock, scenario);
        expect(records).toHaveLength(3);
        const bodies = chatBodies(records);
        expect(toolNamesOf(bodies[0])).toContain(row.tool);

        const executors = bodies.filter((body) =>
          String(body.messages[0]?.content).startsWith(
            'Write the answer as Markdown prose.',
          ),
        );
        expect(executors).toHaveLength(1);
        const prompt = String(executors[0].messages[1]?.content);
        expect(prompt).toContain(`Core idea: ${row.coreIdea}`);
        for (const id of row.sourcesUsed) {
          expect(prompt).toContain(id);
        }
        expect(prompt).toContain('[@');

        expect(toolContents(bodies[2])).toHaveLength(1);
      } finally {
        await stream.close();
      }
    } finally {
      await h.close();
    }
  },
);

it('T5 demo: a disabled myth_buster is not offered, and a scripted call to it is refused', async () => {
  const h = await openHarness(
    'disabled',
    [
      {
        match: { endpoint: 'chat', toolResultPresent: false },
        reply: {
          kind: 'toolCalls',
          calls: [
            {
              name: 'myth_buster',
              argumentChunks: [
                JSON.stringify({
                  coreIdea: 'Myth check',
                  belief: 'Ten thousand hours makes an expert',
                  claimIds: ['hours-figure-is-average'],
                }),
              ],
            },
          ],
        },
      },
      {
        match: { endpoint: 'chat', toolResultPresent: true },
        reply: { kind: 'stream', deltas: ['Noted.'] },
      },
    ],
    (url) => ({ providerBaseURL: url }),
  );
  try {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      const off = await post(
        h,
        TOOL_ENABLED_ROUTE.replace(':name', 'myth_buster'),
        { enabled: false },
      );
      expect(off.status).toBe(200);

      await startRun(h, {
        intent: 'Bust the myth that ten thousand hours is a threshold.',
      });
      const events = await readUntilEnded(stream);

      // No card event: a call to a tool that is not offered emits none.
      expect(events.some((event) => event.type.startsWith('tool-call'))).toBe(
        false,
      );
      expect(events.find((event) => event.type === 'run-ended')).toMatchObject({
        type: 'run-ended',
        data: { reason: 'completed' },
      });

      // Two requests only: the agent's turn and the turn after the refusal. No executor request was made.
      const records = await recordsOf(h.mock, 'disabled');
      expect(records).toHaveLength(2);
      const [first, second] = chatBodies(records);
      expect(toolNamesOf(first)).toContain('cold_open');
      expect(toolNamesOf(first)).not.toContain('myth_buster');
      expect(toolContents(second)).toEqual([
        'This tool is not available in this agent run.',
      ]);
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});
