import {
  existsSync,
  mkdirSync,
  mkdtempSync,
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
  ACTIVE_PROJECT_ROUTE,
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
import { startMockOpenAI, type MockOpenAI } from './providers-client.kit';
import { dataOf } from './sse';

// Every test builds its own temp library, its own mock scenario folder and its own app, and removes them all.

const EXPECTED_EDIT_LINE =
  'Expected arguments for edit_file: path (string, required), old (string, required), new (string, required).';

interface SettingsOptions {
  providerBaseURL: string;
  active?: string | null;
}

function settingsText(options: SettingsOptions): string {
  const doc = {
    schemaVersion: 1,
    projects: { schemaVersion: 1, active: options.active ?? 'book' },
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
  close: () => Promise<void>;
}

// One mock scenario file, one library with `book` active, and the composed app with a session cookie.
async function openHarness(
  scenario: string,
  steps: unknown[],
): Promise<Harness> {
  const scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-agl12-writes-'));
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

it('AC4: an edit with zero matches and an edit with two matches return distinct readable errors', async () => {
  const h = await openHarness('edit-matches', [
    {
      match: { endpoint: 'chat', turnIndex: 0 },
      reply: {
        kind: 'toolCalls',
        calls: [
          {
            name: 'edit_file',
            argumentChunks: [
              '{"path":"sources/notes.md","old":"missing","new":"x"}',
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
            name: 'edit_file',
            argumentChunks: ['{"path":"sources/notes.md","old":"a","new":"c"}'],
          },
        ],
      },
    },
    {
      match: { endpoint: 'chat', turnIndex: 2 },
      reply: { kind: 'stream', deltas: ['Noted.'] },
    },
  ]);
  try {
    mkdirSync(join(h.fixture.library, 'book', 'sources'), { recursive: true });
    writeFileSync(
      join(h.fixture.library, 'book', 'sources', 'notes.md'),
      'a b a\n',
    );
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      await startRun(h, { intent: 'Edit the notes' });
      const events = await readUntilEnded(stream);

      const errors = events.filter(
        (
          event,
        ): event is Extract<AgentLoopEvent, { type: 'tool-call-error' }> =>
          event.type === 'tool-call-error',
      );
      expect(errors).toHaveLength(2);
      const [zero, two] = errors;
      expect(zero.data).toMatchObject({
        attempt: 1,
        message: `old: The text to replace was not found in the file.\n${EXPECTED_EDIT_LINE}`,
      });
      expect('withdrawn' in zero.data).toBe(false);
      expect(two.data).toMatchObject({
        attempt: 2,
        message: `old: The text to replace occurs more than once in the file. It must occur exactly once.\n${EXPECTED_EDIT_LINE}`,
      });
      expect('withdrawn' in two.data).toBe(false);
      expect(zero.data.message).not.toBe(two.data.message);

      expect(
        readFileText(h.fixture.library, 'book', 'sources', 'notes.md'),
      ).toBe('a b a\n');
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

function readFileText(...parts: string[]): string {
  return readFileSync(join(...parts), 'utf8');
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

// A chat step that waits five seconds before it streams, so a stop always lands while the model call is in flight.
function stallAt(turnIndex: number) {
  return {
    match: { endpoint: 'chat', turnIndex },
    delayMs: 5000,
    reply: { kind: 'stream', deltas: ['late'] },
  };
}

function writeCall(turnIndex: number, name: string, args: string) {
  return {
    match: { endpoint: 'chat', turnIndex },
    reply: { kind: 'toolCalls', calls: [{ name, argumentChunks: [args] }] },
  };
}

it('AC1: no agent write changes a file on disk before the author accepts it', async () => {
  const h = await openHarness('writes-disk', [
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
  ]);
  try {
    const book = join(h.fixture.library, 'book');
    const draft = join(book, 'drafts', 'new-chapter.md');
    const outline = join(book, 'sources', 'outline.md');
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      const { runId } = await startRun(h, { intent: 'Write the chapter' });
      await readUntil(stream, hasResults(2));

      expect(existsSync(draft)).toBe(false);
      expect(readFileSync(outline, 'utf8')).toBe('# Outline\n');

      const stop = await post(h, AGENT_RUN_STOP_ROUTE, { runId });
      expect(stop.status).toBe(200);
      await readUntil(stream, hasEnded);

      expect(existsSync(draft)).toBe(false);
      expect(readFileSync(outline, 'utf8')).toBe('# Outline\n');

      const changes = await pendingOfBook(h);
      expect(changes).toHaveLength(2);
      expect(changes).toContainEqual(
        expect.objectContaining({
          targetPath: 'drafts/new-chapter.md',
          kind: 'create',
          capturedBase: null,
          status: 'pending',
        }),
      );
      expect(changes).toContainEqual(
        expect.objectContaining({
          targetPath: 'sources/outline.md',
          kind: 'modify',
          capturedBase: expect.objectContaining({ content: '# Outline\n' }),
        }),
      );
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('AC2: two edits to one file in one run yield one pending change against the first base, and a read between them sees the first edit', async () => {
  const h = await openHarness('two-edits', [
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
  ]);
  try {
    const outline = join(h.fixture.library, 'book', 'sources', 'outline.md');
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      const { runId } = await startRun(h, { intent: 'Revise the outline' });
      const events = await readUntil(stream, hasEnded);

      const results = eventsOf(events, 'tool-call-result');
      expect(results).toHaveLength(3);
      expect(results[1].data.output).toEqual({
        path: 'sources/outline.md',
        content: '# Outline A\n',
      });
      const secondEdit = results[2].data.callId;

      const ended = eventsOf(events, 'run-ended');
      expect(ended[0].data).toMatchObject({
        reason: 'completed',
      });
      expect(ended[0].data.pendingChangeIds).toHaveLength(1);

      const changes = await pendingOfBook(h);
      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({
        targetPath: 'sources/outline.md',
        kind: 'modify',
        capturedBase: { content: '# Outline\n' },
        proposed: '# Outline B\n',
        origin: { kind: 'agent-run', runId, toolCallId: secondEdit },
      });
      expect(readFileSync(outline, 'utf8')).toBe('# Outline\n');
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('AC3: a stopped agent run still creates its pending changes, and a project-switched one creates them in the original project', async () => {
  // Run A: stopped after its write.
  const stopped = await openHarness('stop-after-write', [
    writeCall(
      0,
      'write_file',
      '{"path":"drafts/stopped.md","content":"# Stopped\\n"}',
    ),
    stallAt(1),
  ]);
  try {
    const stream = await observeEvents(
      stopped.app.baseUrl,
      LOOPBACK_HOST,
      stopped.cookie,
    );
    try {
      const { runId } = await startRun(stopped, { intent: 'Draft the stop' });
      await readUntil(stream, hasResults(1));
      expect(
        (await post(stopped, AGENT_RUN_STOP_ROUTE, { runId })).status,
      ).toBe(200);
      const events = await readUntil(stream, hasEnded);

      expect(eventsOf(events, 'run-ended')[0].data).toMatchObject({
        reason: 'stopped',
      });
      expect(
        eventsOf(events, 'run-ended')[0].data.pendingChangeIds,
      ).toHaveLength(1);
      expect(await pendingOfBook(stopped)).toContainEqual(
        expect.objectContaining({
          targetPath: 'drafts/stopped.md',
          origin: { kind: 'agent-run', runId, toolCallId: expect.any(String) },
        }),
      );
    } finally {
      await stream.close();
    }
  } finally {
    await stopped.close();
  }

  // Run B: the project is switched after its write.
  const switched = await openHarness('switch-after-write', [
    writeCall(
      0,
      'write_file',
      '{"path":"drafts/switched.md","content":"# Switched\\n"}',
    ),
    stallAt(1),
  ]);
  try {
    const other = join(switched.fixture.library, 'other');
    mkdirSync(other);
    writeFileSync(
      join(other, 'project.yaml'),
      'schemaVersion: 1\ntitle: Other\ngenrePack: nonfiction\n',
    );
    const stream = await observeEvents(
      switched.app.baseUrl,
      LOOPBACK_HOST,
      switched.cookie,
    );
    try {
      const { runId } = await startRun(switched, {
        intent: 'Draft the switch',
      });
      await readUntil(stream, hasResults(1));
      expect(
        (await post(switched, ACTIVE_PROJECT_ROUTE, { projectId: 'other' }))
          .status,
      ).toBe(200);
      const events = await readUntil(stream, hasEnded);

      const ended = eventsOf(events, 'run-ended')[0];
      expect(ended.data).toMatchObject({ reason: 'project-switched' });
      expect(ended.data.pendingChangeIds).toHaveLength(1);

      expect(
        (await post(switched, ACTIVE_PROJECT_ROUTE, { projectId: 'book' }))
          .status,
      ).toBe(200);
      expect(await pendingOfBook(switched)).toContainEqual(
        expect.objectContaining({
          targetPath: 'drafts/switched.md',
          origin: { kind: 'agent-run', runId, toolCallId: expect.any(String) },
        }),
      );
    } finally {
      await stream.close();
    }
  } finally {
    await switched.close();
  }
});
