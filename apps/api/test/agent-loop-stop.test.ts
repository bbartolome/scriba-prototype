import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { stringify } from 'yaml';
import {
  AGENT_RUNS_ROUTE,
  AGENT_RUN_STOP_ROUTE,
  agentLoopEventSchema,
  agentStartResponseSchema,
  type AgentLoopEvent,
} from '@bbartolome/scriba-contracts/agent-loop';
import { EVENTS_ROUTE } from '@bbartolome/scriba-contracts/platform';
import { ACTIVE_PROJECT_ROUTE } from '@bbartolome/scriba-contracts/project-store';
import { PROVIDER_DEFAULTS } from '@bbartolome/scriba-contracts/providers';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from './invariant-sweep';
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
import { dataOf, openSse, type OpenSse } from './sse';

// Every test builds its own temp library, its own mock scenario folder, and its own app, and removes them all.

// A chat step that waits five seconds before it streams, so a stop always lands while the model call is in flight.
const STALL_STEPS = [
  {
    match: { endpoint: 'chat' },
    delayMs: 5000,
    reply: { kind: 'stream', deltas: ['late'] },
  },
];

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
  const scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-agl03-stop-'));
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

async function startRun(
  h: Harness,
  body: unknown,
): Promise<{ runId: string; conversationId: string }> {
  const reply = await post(h, AGENT_RUNS_ROUTE, body);
  expect(reply.status).toBe(200);
  return agentStartResponseSchema.parse(JSON.parse(reply.body));
}

// The agent-loop events of the stream, parsed with the contract, up to and including the next run-ended.
async function readUntilEnded(stream: OpenSse): Promise<AgentLoopEvent[]> {
  const events: AgentLoopEvent[] = [];
  for (;;) {
    const block = await stream.next(5000);
    if (!block.includes('data: ')) continue;
    const envelope: unknown = JSON.parse(dataOf(block));
    if ((envelope as { module?: unknown }).module !== 'agent-loop') continue;
    const event = agentLoopEventSchema.parse(envelope);
    events.push(event);
    if (event.type === 'run-ended') return events;
  }
}

// Every envelope of the stream, in order, until `done` says the list so far is enough.
interface Envelope {
  module?: string;
  type?: string;
  data?: Record<string, unknown>;
}

async function readEnvelopesUntil(
  stream: OpenSse,
  done: (seen: Envelope[]) => boolean,
): Promise<Envelope[]> {
  const seen: Envelope[] = [];
  while (!done(seen)) {
    const block = await stream.next(5000);
    if (!block.includes('data: ')) continue;
    seen.push(JSON.parse(dataOf(block)) as Envelope);
  }
  return seen;
}

// Polls the mock until it has received `count` requests of the scenario, or gives up after five seconds.
async function waitForRecords(
  h: Harness,
  scenario: string,
  count: number,
): Promise<MockOpenAIRecord[]> {
  const deadline = Date.now() + 5000;
  for (;;) {
    const records = await recordsOf(h.mock, scenario);
    if (records.length >= count || Date.now() > deadline) return records;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

// Polls the mock until the first request is marked closed by the client, or gives up after two seconds.
async function waitForClosed(h: Harness, scenario: string): Promise<boolean> {
  const deadline = Date.now() + 2000;
  for (;;) {
    const [first] = await recordsOf(h.mock, scenario);
    if (first?.closedByClient === true) return true;
    if (Date.now() > deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

it('C3: stop ends a run within one second and the mock sees the abort', async () => {
  const h = await openHarness('stall', STALL_STEPS);
  try {
    const stream = await openSse(`${h.app.baseUrl}${EVENTS_ROUTE}`, {
      cookie: h.cookie,
    });
    try {
      const { runId } = await startRun(h, { intent: 'Summarize my outline' });
      expect((await waitForRecords(h, 'stall', 1)).length).toBe(1);

      const sentAt = Date.now();
      const stop = await post(h, AGENT_RUN_STOP_ROUTE, { runId });
      expect(stop.status).toBe(200);
      const events = await readUntilEnded(stream);
      const elapsed = Date.now() - sentAt;

      expect(elapsed).toBeLessThanOrEqual(1000);
      expect(events[events.length - 1]).toMatchObject({
        type: 'run-ended',
        data: { reason: 'stopped', pendingChangeIds: [] },
      });
      expect(await waitForClosed(h, 'stall')).toBe(true);
    } finally {
      await stream.cancel();
    }
  } finally {
    await h.close();
  }
});

it('C5: switching the active project ends the run with project-switched', async () => {
  const h = await openHarness('stall', STALL_STEPS);
  try {
    const other = join(h.fixture.library, 'other');
    mkdirSync(other);
    writeFileSync(
      join(other, 'project.yaml'),
      'schemaVersion: 1\ntitle: Other\ngenrePack: nonfiction\n',
    );
    const stream = await openSse(`${h.app.baseUrl}${EVENTS_ROUTE}`, {
      cookie: h.cookie,
    });
    try {
      await startRun(h, { intent: 'Summarize my outline' });
      expect((await waitForRecords(h, 'stall', 1)).length).toBe(1);

      const switched = await post(h, ACTIVE_PROJECT_ROUTE, {
        projectId: 'other',
      });
      expect(switched.status).toBe(200);

      const seen = await readEnvelopesUntil(
        stream,
        (all) =>
          all.some((item) => item.type === 'run-ended') &&
          all.some((item) => item.type === 'project-switched'),
      );
      expect(seen).toContainEqual(
        expect.objectContaining({
          module: 'agent-loop',
          type: 'run-ended',
          data: expect.objectContaining({ reason: 'project-switched' }),
        }),
      );
      expect(seen).toContainEqual(
        expect.objectContaining({
          module: 'project-store',
          type: 'project-switched',
          data: { from: 'book', to: 'other' },
        }),
      );
      expect(await waitForClosed(h, 'stall')).toBe(true);
    } finally {
      await stream.cancel();
    }
  } finally {
    await h.close();
  }
});

it('S1: a second stop is a no-op, and a stop of an unknown run gives AGENT_RUN_NOT_FOUND', async () => {
  const h = await openHarness('stall', STALL_STEPS);
  try {
    const stream = await openSse(`${h.app.baseUrl}${EVENTS_ROUTE}`, {
      cookie: h.cookie,
    });
    try {
      const { runId } = await startRun(h, { intent: 'Summarize my outline' });
      expect((await waitForRecords(h, 'stall', 1)).length).toBe(1);

      expect((await post(h, AGENT_RUN_STOP_ROUTE, { runId })).status).toBe(200);
      const ended = await readUntilEnded(stream);
      expect(ended[ended.length - 1]).toMatchObject({
        type: 'run-ended',
        data: { reason: 'stopped' },
      });

      const again = await post(h, AGENT_RUN_STOP_ROUTE, { runId });
      expect(again.status).toBe(200);
      expect(JSON.parse(again.body)).toEqual({});
      await expect(stream.next(500)).rejects.toThrow();

      const unknown = await post(h, AGENT_RUN_STOP_ROUTE, {
        runId: 'no-such-run',
      });
      expect(unknown.status).toBe(404);
      expect(JSON.parse(unknown.body)).toMatchObject({
        error: { code: 'AGENT_RUN_NOT_FOUND' },
      });
    } finally {
      await stream.cancel();
    }
  } finally {
    await h.close();
  }
});
