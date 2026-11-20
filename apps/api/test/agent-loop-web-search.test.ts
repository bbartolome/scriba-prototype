import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { expect, it } from 'vitest';
import { stringify } from 'yaml';
import {
  AGENT_RUNS_ROUTE,
  AGENT_SETTINGS_ROUTE,
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

// Every test builds its own temp library, its own mock scenario folder, its own SearXNG-shaped stub and its own app,
// and removes them all. The research names are the reserved names of the research family (AGL-21).

const RESEARCH_NAMES = ['web_search', 'fetch_page'];

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

// One mock scenario file, one library with `book` active, and the composed app with a session cookie.
async function openHarness(
  scenario: string,
  steps: unknown[],
  settings: (providerBaseURL: string) => SettingsOptions,
): Promise<Harness> {
  const scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-agl21-run-'));
  writeFileSync(
    join(scenariosDir, `${scenario}.json`),
    JSON.stringify({ steps }),
  );
  const mock = await startMockOpenAI({ scenariosDir });
  const fixture = buildProjectsLibrary({
    settings: settingsText(settings(`${mock.baseUrl}/scenario/${scenario}/v1`)),
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
    app = await createTestApp({ libraryDir: fixture.library });
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

// A SearXNG-shaped stub on 127.0.0.1. On /search it records each request URL, answers 400 unless q is present and
// format is json, and otherwise answers two results with a title, a URL and a content each.
interface SearxngStub {
  url: string;
  requests: string[];
  close: () => Promise<void>;
}

async function startSearxngStub(): Promise<SearxngStub> {
  const requests: string[] = [];
  const server: Server = createServer((req, res) => {
    const target = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (target.pathname !== '/search') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end('{}');
      return;
    }
    requests.push(target.toString());
    const q = target.searchParams.get('q');
    if (!q || target.searchParams.get('format') !== 'json') {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'q and format=json are required' }));
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        results: [
          {
            title: 'Learning plateaus explained',
            url: 'https://example.test/plateaus',
            content: 'A plateau is a stretch with little visible progress.',
          },
          {
            title: 'Why progress stalls',
            url: 'https://example.test/stall',
            content: 'Stalling is a common part of skill practice.',
          },
        ],
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/search`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

const TEXT_STEPS = [
  {
    match: { endpoint: 'chat' },
    reply: { kind: 'stream', deltas: ['Done.'] },
  },
];

const AGENT_SECTION = (research: Record<string, unknown>): unknown => ({
  schemaVersion: 1,
  stepCap: 12,
  research,
});

it("AC1: With research off, the mock's received request contains no research tools.", async () => {
  const stub = await startSearxngStub();
  const h = await openHarness('text', TEXT_STEPS, (url) => ({
    providerBaseURL: url,
  }));
  try {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      // Run 1: the default settings, research off.
      await startRun(h, { intent: 'Say done' });
      await readUntilEnded(stream);
      // Run 2: the endpoint is set but research stays off, so the switch alone gates the tools.
      const put = await post(h, AGENT_SETTINGS_ROUTE, {
        research: { searchEndpoint: stub.url },
      });
      expect(put.status).toBe(200);
      await startRun(h, { intent: 'Say done again' });
      await readUntilEnded(stream);

      const records = chatBodies(await recordsOf(h.mock, 'text'));
      expect(records).toHaveLength(2);
      for (const body of records) {
        const names = toolNamesOf(body);
        for (const name of RESEARCH_NAMES) {
          expect(names).not.toContain(name);
        }
      }
      expect(stub.requests).toHaveLength(0);
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
    await stub.close();
  }
});

it('D1: With research on and no endpoint, web_search is not offered.', async () => {
  const h = await openHarness('text-d1', TEXT_STEPS, (url) => ({
    providerBaseURL: url,
    agent: AGENT_SECTION({ enabled: true }),
  }));
  try {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      await startRun(h, { intent: 'Say done' });
      await readUntilEnded(stream);

      const [first] = chatBodies(await recordsOf(h.mock, 'text-d1'));
      expect(toolNamesOf(first)).not.toContain('web_search');
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('AC3: With both, a search runs against a local SearXNG-shaped stub and returns titles, URLs and snippets.', async () => {
  const stub = await startSearxngStub();
  const h = await openHarness(
    'search',
    [
      {
        match: { endpoint: 'chat', turnIndex: 0 },
        reply: {
          kind: 'toolCalls',
          calls: [
            {
              name: 'web_search',
              argumentChunks: ['{"query":"learning plateaus"}'],
            },
          ],
        },
      },
      {
        match: { endpoint: 'chat', turnIndex: 1 },
        reply: { kind: 'stream', deltas: ['Done.'] },
      },
    ],
    (url) => ({
      providerBaseURL: url,
      agent: AGENT_SECTION({ enabled: true, searchEndpoint: stub.url }),
    }),
  );
  try {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      await startRun(h, { intent: 'Look up learning plateaus' });
      const events = await readUntilEnded(stream);

      // The stub received one search request, with q and format=json.
      expect(stub.requests).toHaveLength(1);
      const sent = new URL(stub.requests[0]);
      expect(sent.pathname).toBe('/search');
      expect(sent.searchParams.get('q')).toBe('learning plateaus');
      expect(sent.searchParams.get('format')).toBe('json');

      // The second chat request carries the tool message with each result.
      const records = chatBodies(await recordsOf(h.mock, 'search'));
      expect(records).toHaveLength(2);
      const toolMessages = toolContents(records[1]).join('\n');
      expect(toolMessages).toContain('Learning plateaus explained');
      expect(toolMessages).toContain('https://example.test/plateaus');
      expect(toolMessages).toContain(
        'A plateau is a stretch with little visible progress.',
      );
      expect(toolMessages).toContain('Why progress stalls');
      expect(toolMessages).toContain('https://example.test/stall');
      expect(toolMessages).toContain(
        'Stalling is a common part of skill practice.',
      );

      expect(events[events.length - 1]).toMatchObject({
        type: 'run-ended',
      });
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
    await stub.close();
  }
});
