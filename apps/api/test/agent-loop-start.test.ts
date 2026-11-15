import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { stringify } from 'yaml';
import {
  AGENT_RUNS_ROUTE,
  AGENT_RUN_STOP_ROUTE,
  agentStartResponseSchema,
} from '@bbartolome/scriba-contracts/agent-loop';
import { EVENTS_ROUTE } from '@bbartolome/scriba-contracts/platform';
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
} from './providers-client.kit';
import { dataOf, openSse, type OpenSse } from './sse';

// Every test builds its own temp library, its own mock scenario folder, and its own app, and removes them all.

const STALL_STEPS = [
  {
    match: { endpoint: 'chat' },
    delayMs: 5000,
    reply: { kind: 'stream', deltas: ['late'] },
  },
];

interface SettingsOptions {
  providerBaseURL: string;
  active?: string | null; // null leaves the projects section out
  providers?: unknown;
  agent?: unknown;
}

function providerEntry(baseURL: string): unknown {
  return {
    id: 'mock',
    kind: 'openai-compatible',
    baseURL,
    model: 'mock-model',
    ...PROVIDER_DEFAULTS,
  };
}

function settingsText(options: SettingsOptions): string {
  const doc: Record<string, unknown> = { schemaVersion: 1 };
  if (options.active !== null) {
    doc.projects = { schemaVersion: 1, active: options.active ?? 'book' };
  }
  doc.providers = options.providers ?? {
    schemaVersion: 1,
    list: [providerEntry(options.providerBaseURL)],
    appDefault: { providerId: 'mock', model: 'mock-model' },
  };
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

// One mock scenario file, one library built from the settings, and the composed app with a session cookie.
async function openHarness(
  scenario: string,
  steps: unknown[],
  settings: (providerBaseURL: string) => SettingsOptions,
): Promise<Harness> {
  const scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-agl03-start-'));
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

function codeOf(reply: Reply): string {
  return (JSON.parse(reply.body) as { error: { code: string } }).error.code;
}

// The events stream, opened before a start, with its first block (hello) read.
async function openEvents(h: Harness): Promise<OpenSse> {
  const stream = await openSse(`${h.app.baseUrl}${EVENTS_ROUTE}`, {
    cookie: h.cookie,
  });
  await stream.next(2000);
  return stream;
}

it('C4: a second start gets AGENT_RUN_ACTIVE and no provider gets AGENT_NO_PROVIDER', async () => {
  // (a) A run is active, so a second start in the same project is refused.
  const busy = await openHarness('stall', STALL_STEPS, (url) => ({
    providerBaseURL: url,
  }));
  try {
    const first = await post(busy, AGENT_RUNS_ROUTE, { intent: 'One' });
    expect(first.status).toBe(200);
    const { runId } = agentStartResponseSchema.parse(JSON.parse(first.body));

    const second = await post(busy, AGENT_RUNS_ROUTE, { intent: 'Two' });
    expect(second.status).toBe(409);
    expect(codeOf(second)).toBe('AGENT_RUN_ACTIVE');

    // The active run is stopped, so the test ends with no run in flight.
    const stop = await post(busy, AGENT_RUN_STOP_ROUTE, { runId });
    expect(stop.status).toBe(200);
  } finally {
    await busy.close();
  }

  // (b) No provider is configured: the start is refused and no run is published.
  const bare = await openHarness('stall', STALL_STEPS, () => ({
    providerBaseURL: '',
    providers: { schemaVersion: 1, list: [], appDefault: null },
  }));
  try {
    const stream = await openEvents(bare);
    try {
      const refused = await post(bare, AGENT_RUNS_ROUTE, { intent: 'Hello' });
      expect(refused.status).toBe(409);
      expect(codeOf(refused)).toBe('AGENT_NO_PROVIDER');
      await expect(stream.next(300)).rejects.toThrow();
      expect(await recordsOf(bare.mock, 'stall')).toEqual([]);
    } finally {
      await stream.cancel();
    }
  } finally {
    await bare.close();
  }
});

it('S2: an invalid stored agent section gives 400 and no run starts', async () => {
  const h = await openHarness('stall', STALL_STEPS, (url) => ({
    providerBaseURL: url,
    agent: { schemaVersion: 1, stepCap: 0, research: { enabled: false } },
  }));
  try {
    const stream = await openEvents(h);
    try {
      const reply = await post(h, AGENT_RUNS_ROUTE, { intent: 'Hello' });
      expect(reply.status).toBe(400);
      expect(codeOf(reply)).toBe('PLATFORM_VALIDATION_FAILED');
      await expect(stream.next(300)).rejects.toThrow();
      expect(await recordsOf(h.mock, 'stall')).toEqual([]);
    } finally {
      await stream.cancel();
    }
  } finally {
    await h.close();
  }
});

it('S3: with no active project, start gives 409 AGENT_NO_ACTIVE_PROJECT', async () => {
  const h = await openHarness('stall', STALL_STEPS, (url) => ({
    providerBaseURL: url,
    active: null,
  }));
  try {
    const reply = await post(h, AGENT_RUNS_ROUTE, { intent: 'Hello' });
    expect(reply.status).toBe(409);
    expect(codeOf(reply)).toBe('AGENT_NO_ACTIVE_PROJECT');
  } finally {
    await h.close();
  }
});
