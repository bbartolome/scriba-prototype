import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  AGENT_GROUNDING_ROUTE,
  AGENT_SETTINGS_ROUTE,
  groundingResultSchema,
  type AgentLoopEvent,
  type GroundingResult,
} from '@bbartolome/scriba-contracts/agent-loop';
import {
  PROJECT_PENDING_ACCEPT_ROUTE,
  PROJECT_PENDING_ROUTE,
  pendingListSchema,
} from '@bbartolome/scriba-contracts/project-store';
import { COMPOSED_MODULES } from '../src/app.module';
import {
  EXTRACT_MARKER,
  JUDGE_MARKER,
} from '../src/modules/agent-loop/grounding-prompts';
import {
  agentLoopFetchKitModule,
  FETCHED_SENTENCE,
  startPageStub,
} from './agent-loop-fetch.kit';
import {
  get,
  observe,
  openHarness,
  post,
  readUntilEnded,
  requestsOf,
  startRun,
  toolMessagesOf,
  type ChatBody,
  type Harness,
} from './agent-loop-transcript.kit';
import type { Observer } from './invariant-sweep';
import type { ProjectsLibrary } from './project-store-projects.kit';

// The AGL-23 criteria (unit AGL-23 lines 17 to 20) and the AGL-23 plan, section 4.
// Each test opens its own app with the mock model and its own temp library. The successful fetches reach the page
// stub through the test-only allowance of agent-loop-fetch.kit.ts; the refusal rows of AC3 part (a) run without it.
// The helpers are copied from agent-loop-fetch-page.test.ts and agent-loop-web-search.test.ts (plan P2); nothing is
// imported from another test file.

const REFUSED_LOCAL =
  'The address is on a local or private network, so it is refused.';
const REFUSED_REDIRECT =
  'The redirect goes to a local or private network address, so it is refused.';

// The allowance of the kit for the stub's own address and port, with the default caps (plan P3).
function allowed(port: number) {
  return agentLoopFetchKitModule({ allow: { address: '127.0.0.1', port } });
}

// The research names of the research family (AGL-21).
const RESEARCH_NAMES = ['web_search', 'fetch_page'];

// The mock steps. A run's first request ends with its intent, so the intent picks the call; the request after the
// tool result ends with a tool message, and the last step answers it with text.
function fetchStep(intent: string, url: string): unknown {
  return {
    match: { endpoint: 'chat', lastMessageContent: intent },
    reply: {
      kind: 'toolCalls',
      calls: [
        { name: 'fetch_page', argumentChunks: [JSON.stringify({ url })] },
      ],
    },
  };
}

function writeStep(intent: string, path: string, content: string): unknown {
  return {
    match: { endpoint: 'chat', lastMessageContent: intent },
    reply: {
      kind: 'toolCalls',
      calls: [
        {
          name: 'write_file',
          argumentChunks: [JSON.stringify({ path, content })],
        },
      ],
    },
  };
}

const AFTER_TOOL = {
  match: { endpoint: 'chat', lastMessageRole: 'tool' },
  reply: { kind: 'stream', deltas: ['Done.'] },
};

const TEXT_STEPS = [
  {
    match: { endpoint: 'chat' },
    reply: { kind: 'stream', deltas: ['Done.'] },
  },
];

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

// The stream of agent-loop events for the duration of the body.
async function withStream<T>(
  h: Harness,
  body: (stream: Observer) => Promise<T>,
): Promise<T> {
  const stream = await observe(h);
  try {
    return await body(stream);
  } finally {
    await stream.close();
  }
}

// One run with the given intent, read to its end. Returns the text of its tool messages, as the model received them.
async function runIntent(
  h: Harness,
  stream: Observer,
  intent: string,
): Promise<string> {
  await startRun(h, { intent });
  await readUntilEnded(stream);
  const bodies = (await requestsOf(h)).filter((body) =>
    body.messages.some(
      (message) =>
        message.role === 'user' &&
        typeof message.content === 'string' &&
        message.content.includes(intent),
    ),
  );
  const last = bodies[bodies.length - 1];
  if (last === undefined) throw new Error(`No request for run ${intent}.`);
  return toolMessagesOf(last)
    .map((message) => String(message.content))
    .join('\n');
}

async function enableResearch(h: Harness): Promise<void> {
  const reply = await post(h, AGENT_SETTINGS_ROUTE, {
    research: { enabled: true },
  });
  expect(reply.status).toBe(200);
}

// The tool names offered in one chat request, sorted.
function toolNamesOf(body: ChatBody): string[] {
  return (body.tools ?? []).map((tool) => tool.function.name).sort();
}

// The text of the last message of a chat request, when it is a string.
function lastTextOf(body: ChatBody): string {
  const last = body.messages[body.messages.length - 1];
  return typeof last?.content === 'string' ? last.content : '';
}

// The grounding result of a check, from its grounding-result event (the event adds runId and seq).
function resultOf(events: AgentLoopEvent[]): GroundingResult {
  const found = events.find((event) => event.type === 'grounding-result');
  if (found === undefined) throw new Error('No grounding-result event.');
  return groundingResultSchema.parse(found.data);
}

async function checkDraft(
  h: Harness,
  stream: Observer,
): Promise<GroundingResult> {
  const reply = await post(h, AGENT_GROUNDING_ROUTE, {
    path: 'drafts/claim.md',
  });
  expect(reply.status).toBe(200);
  return resultOf(await readUntilEnded(stream));
}

// The judge requests of a scenario, as their last message text.
async function judgeTextsOf(h: Harness): Promise<string[]> {
  return (await requestsOf(h))
    .map(lastTextOf)
    .filter((text) => text.includes(JUDGE_MARKER));
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

it('AC1: With the setting off, the model request contains no research tools.', async () => {
  const stub = await startSearxngStub();
  try {
    const h = await openHarness({ scenario: 'agl23-ac1', steps: TEXT_STEPS });
    try {
      await withStream(h, async (stream) => {
        // Run 1: the default settings, research off.
        await startRun(h, { intent: 'AC1 run one' });
        await readUntilEnded(stream);
        // Run 2: the endpoint is set but research stays off, so the switch alone gates the tools.
        const put = await post(h, AGENT_SETTINGS_ROUTE, {
          research: { searchEndpoint: stub.url },
        });
        expect(put.status).toBe(200);
        await startRun(h, { intent: 'AC1 run two' });
        await readUntilEnded(stream);
      });
      const records = await requestsOf(h);
      expect(records).toHaveLength(2);
      for (const body of records) {
        const names = toolNamesOf(body);
        for (const name of RESEARCH_NAMES) {
          expect(names).not.toContain(name);
        }
      }
      expect(stub.requests).toHaveLength(0);
    } finally {
      await h.close();
    }
  } finally {
    await stub.close();
  }
});

it('AC2: With it on, a search and a fetch run against a local test server.', async () => {
  const stub = await startPageStub();
  const search = await startSearxngStub();
  try {
    const h = await openHarness({
      scenario: 'agl23-ac2',
      modules: [...COMPOSED_MODULES, allowed(stub.port)],
      steps: [
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
          reply: {
            kind: 'toolCalls',
            calls: [
              {
                name: 'fetch_page',
                argumentChunks: [
                  JSON.stringify({
                    url: `http://127.0.0.1:${stub.port}/page`,
                  }),
                ],
              },
            ],
          },
        },
        {
          match: { endpoint: 'chat', turnIndex: 2 },
          reply: { kind: 'stream', deltas: ['Done.'] },
        },
      ],
    });
    try {
      const put = await post(h, AGENT_SETTINGS_ROUTE, {
        research: { enabled: true, searchEndpoint: search.url },
      });
      expect(put.status).toBe(200);
      await withStream(h, async (stream) => {
        await startRun(h, { intent: 'AC2 search and fetch' });
        const events = await readUntilEnded(stream);
        expect(events[events.length - 1]?.type).toBe('run-ended');
      });
      expect(search.requests).toHaveLength(1);
      const query = new URL(search.requests[0] ?? '');
      expect(query.searchParams.get('q')).toBe('learning plateaus');
      expect(query.searchParams.get('format')).toBe('json');

      const records = await requestsOf(h);
      expect(records).toHaveLength(3);
      const afterSearch = toolMessagesOf(records[1] ?? { messages: [] })
        .map((message) => String(message.content))
        .join('\n');
      expect(afterSearch).toContain('Learning plateaus explained');
      expect(afterSearch).toContain('Why progress stalls');
      const afterFetch = toolMessagesOf(records[2] ?? { messages: [] })
        .map((message) => String(message.content))
        .join('\n');
      expect(afterFetch).toContain(FETCHED_SENTENCE);
      expect(afterFetch).toContain('"untrusted":true');
      expect(stub.hitsOf('/page')).toBe(1);
    } finally {
      await h.close();
    }
  } finally {
    await search.close();
    await stub.close();
  }
});

it('AC3: Fetching loopback, private, tailnet or `host.docker.internal` addresses is refused, including after a redirect.', async () => {
  const stub = await startPageStub();
  try {
    const p = stub.port;
    // Part (a): the literal refusal rows, in the composed app without the kit. One run per row (plan P6).
    const rows: Array<[string, string]> = [
      ['a', `http://127.0.0.1:${p}/page`],
      ['b', `http://localhost:${p}/page`],
      ['c', `http://[::1]:${p}/page`],
      ['d', 'http://10.0.0.1/'],
      ['e', 'http://192.168.1.1/'],
      ['f', 'http://100.64.0.1/'],
      ['g', 'http://[fd7a:115c:a1e0::1]/'],
      ['h', `http://host.docker.internal:${p}/page`],
    ];
    const partA = await openHarness({
      scenario: 'agl23-ac3-literal',
      steps: [
        ...rows.map(([label, url]) => fetchStep(`AC3 row ${label} fetch`, url)),
        AFTER_TOOL,
      ],
    });
    try {
      await enableResearch(partA);
      await withStream(partA, async (stream) => {
        for (const [label] of rows) {
          const text = await runIntent(partA, stream, `AC3 row ${label} fetch`);
          expect(text, `row ${label}`).toContain(REFUSED_LOCAL);
        }
      });
      expect(stub.hitsOf('/page')).toBe(0);
    } finally {
      await partA.close();
    }

    // Part (b): the kit app with the allowance for the stub. A name is refused, and a redirect into a refused range.
    const partB = await openHarness({
      scenario: 'agl23-ac3-kit',
      modules: [...COMPOSED_MODULES, allowed(p)],
      steps: [
        fetchStep('AC3 kit localhost fetch', `http://localhost:${p}/page`),
        fetchStep(
          'AC3 kit redirect fetch',
          `http://127.0.0.1:${p}/redirect-private`,
        ),
        AFTER_TOOL,
      ],
    });
    try {
      await enableResearch(partB);
      await withStream(partB, async (stream) => {
        const localhost = await runIntent(
          partB,
          stream,
          'AC3 kit localhost fetch',
        );
        expect(localhost).toContain(REFUSED_LOCAL);
        const redirect = await runIntent(
          partB,
          stream,
          'AC3 kit redirect fetch',
        );
        expect(redirect).toContain(REFUSED_REDIRECT);
      });
      expect(stub.hitsOf('/page')).toBe(0);
      expect(stub.hitsOf('/redirect-private')).toBe(1);
    } finally {
      await partB.close();
    }
  } finally {
    await stub.close();
  }
});

it('AC4: Fetched text never appears as grounding evidence until it is accepted into `sources/`.', async () => {
  const stub = await startPageStub();
  try {
    const h = await openHarness({
      scenario: 'agl23-ac4',
      prepare: (fixture: ProjectsLibrary) => {
        const book = join(fixture.library, 'book');
        mkdirSync(join(book, 'sources'), { recursive: true });
        mkdirSync(join(book, 'drafts'), { recursive: true });
        writeFileSync(
          join(book, 'sources', 'other.md'),
          'Unrelated oats and barley.\n',
        );
        writeFileSync(
          join(book, 'drafts', 'claim.md'),
          'Harbour traffic doubled in 1900.\n',
        );
      },
      modules: [...COMPOSED_MODULES, allowed(stub.port)],
      steps: [
        extractStep([
          {
            text: 'Harbour traffic doubled in 1900.',
            span: { start: 0, end: 31 },
          },
        ]),
        judgeStep([
          {
            claim: 0,
            verdict: 'supported',
            passage: { path: 'sources/fetched.md', offset: 0 },
            reason: 'The accepted source says so.',
          },
        ]),
        fetchStep('AC4 fetch', `http://127.0.0.1:${stub.port}/page`),
        writeStep('AC4 write', 'sources/fetched.md', `${FETCHED_SENTENCE}\n`),
        AFTER_TOOL,
      ],
    });
    try {
      await enableResearch(h);
      const fetched = join(h.fixture.library, 'book', 'sources', 'fetched.md');
      await withStream(h, async (stream) => {
        // (1) A run fetches the page.
        await runIntent(h, stream, 'AC4 fetch');
        // (2) The check before any write: no passage for the claim, and no judge request carries the fetched text.
        const before = await checkDraft(h, stream);
        expect(before.claims[0]).toMatchObject({ verdict: 'unsupported' });
        expect(before.claims[0]).not.toHaveProperty('passage');
        expect(
          (await judgeTextsOf(h)).some((text) => text.includes('oats')),
        ).toBe(false);

        // (3) A run writes the fetched text to sources/. The write is a pending change, so nothing is on disk.
        await runIntent(h, stream, 'AC4 write');
        expect(existsSync(fetched)).toBe(false);

        // (4) The check again: still no passage, and no judge request carries the fetched text.
        const middle = await checkDraft(h, stream);
        expect(middle.claims[0]).toMatchObject({ verdict: 'unsupported' });
        expect(
          (await judgeTextsOf(h)).some((text) => text.includes('oats')),
        ).toBe(false);
        expect(existsSync(fetched)).toBe(false);

        // (5) The author accepts the pending change; only now is the file on disk.
        const pending = await get(
          h,
          PROJECT_PENDING_ROUTE.replace(':projectId', 'book'),
        );
        expect(pending.status).toBe(200);
        const change = pendingListSchema
          .parse(JSON.parse(pending.body))
          .changes.find((item) => item.targetPath === 'sources/fetched.md');
        expect(change).toBeDefined();
        const accepted = await post(
          h,
          PROJECT_PENDING_ACCEPT_ROUTE.replace(':projectId', 'book').replace(
            ':id',
            change?.id ?? '',
          ),
          {},
        );
        expect(accepted.status).toBe(200);
        expect(readFileSync(fetched, 'utf8')).toBe(`${FETCHED_SENTENCE}\n`);

        // (6) The check after acceptance: a judge request carries the passage from sources/fetched.md.
        const after = await checkDraft(h, stream);
        expect(after.claims[0]).toMatchObject({
          verdict: 'supported',
          passage: { path: 'sources/fetched.md', offset: 0 },
        });
        expect(
          (await judgeTextsOf(h)).some((text) =>
            text.includes('sources/fetched.md'),
          ),
        ).toBe(true);
      });
    } finally {
      await h.close();
    }
  } finally {
    await stub.close();
  }
});
