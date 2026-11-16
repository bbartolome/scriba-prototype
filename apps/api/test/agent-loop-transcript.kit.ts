import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Type } from '@nestjs/common';
import { expect } from 'vitest';
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

// Shared by the transcript, history and trim tests of AGL-04. Each test builds its own temp library, its own mock
// scenario folder and its own app, and removes them all. The helpers copy agent-loop-run.test.ts (its helpers are
// private to that file).

// The providers section of the one mock provider. Its model is set, so the mock records only chat requests.
// contextSize and keyRef are left out unless given.
export interface ProviderOptions {
  contextSize?: number;
  keyRef?: string;
}

function providersSection(baseURL: string, options: ProviderOptions): unknown {
  return {
    schemaVersion: 1,
    list: [
      {
        id: 'mock',
        kind: 'openai-compatible',
        baseURL,
        model: 'mock-model',
        ...PROVIDER_DEFAULTS,
        ...(options.contextSize === undefined
          ? {}
          : { contextSize: options.contextSize }),
        ...(options.keyRef === undefined ? {} : { keyRef: options.keyRef }),
      },
    ],
    appDefault: { providerId: 'mock', model: 'mock-model' },
  };
}

export interface HarnessOptions extends ProviderOptions {
  scenario: string;
  steps: unknown[];
  // Writes files into the fixture library before the app boots.
  prepare?: (fixture: ProjectsLibrary) => void;
  // Replaces the composed modules when set, as `TestAppOptions.modules`.
  modules?: Type<unknown>[];
}

export interface Harness {
  app: TestApp;
  cookie: string;
  mock: MockOpenAI;
  fixture: ProjectsLibrary;
  scenario: string;
  close: () => Promise<void>;
  // Closes the current app and boots a new one on the same library, as after an API restart. `app` and `cookie` are
  // replaced; `close` then closes the new app.
  restart: () => Promise<void>;
}

// One mock scenario file, one library with `book` active, and the composed app with a session cookie.
export async function openHarness(options: HarnessOptions): Promise<Harness> {
  const scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-agl04-scenarios-'));
  writeFileSync(
    join(scenariosDir, `${options.scenario}.json`),
    JSON.stringify({ steps: options.steps }),
  );
  const mock = await startMockOpenAI({ scenariosDir });
  const providerBaseURL = `${mock.baseUrl}/scenario/${options.scenario}/v1`;
  const settings = stringify({
    schemaVersion: 1,
    projects: { schemaVersion: 1, active: 'book' },
    providers: providersSection(providerBaseURL, options),
  });
  let fixture: ProjectsLibrary | undefined;
  let app: TestApp | undefined;
  let harness: Harness | undefined;
  const close = async (): Promise<void> => {
    try {
      await app?.close();
    } finally {
      await mock.close();
      rmSync(scenariosDir, { recursive: true, force: true });
      fixture?.remove();
    }
  };
  const restart = async (): Promise<void> => {
    if (fixture === undefined || harness === undefined) {
      throw new Error('The harness is not open.');
    }
    await app?.close();
    app = undefined;
    app = await createTestApp({
      libraryDir: fixture.library,
      modules: options.modules,
    });
    harness.app = app;
    harness.cookie = await sessionCookie(app, fixture.library);
  };
  try {
    fixture = buildProjectsLibrary({ settings });
    options.prepare?.(fixture);
    app = await createTestApp({
      libraryDir: fixture.library,
      modules: options.modules,
    });
    const cookie = await sessionCookie(app, fixture.library);
    harness = {
      app,
      cookie,
      mock,
      fixture,
      scenario: options.scenario,
      close,
      restart,
    };
    return harness;
  } catch (error) {
    await close();
    throw error;
  }
}

export function post(h: Harness, path: string, body: unknown): Promise<Reply> {
  return send(h.app.baseUrl, {
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie: h.cookie,
    method: 'POST',
    path,
    body: JSON.stringify(body),
  });
}

export function get(h: Harness, path: string): Promise<Reply> {
  return send(h.app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie: h.cookie,
    method: 'GET',
    path,
  });
}

export function observe(h: Harness): Promise<Observer> {
  return observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
}

// One start request, which must answer 200. Returns the parsed reply.
export async function startRun(
  h: Harness,
  body: unknown,
): Promise<{ runId: string; conversationId: string }> {
  const reply = await post(h, AGENT_RUNS_ROUTE, body);
  expect(reply.status).toBe(200);
  return agentStartResponseSchema.parse(JSON.parse(reply.body));
}

// The agent-loop events read from the stream, each parsed with the contract, up to and including a run-ended.
export async function readUntilEnded(
  stream: Observer,
): Promise<AgentLoopEvent[]> {
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
export interface WireMessage {
  role: string;
  content?: unknown;
  tool_calls?: Array<{ id: string; function: { name: string } }>;
  tool_call_id?: string;
}

export interface ChatBody {
  messages: WireMessage[];
  tools?: Array<{ type: string; function: { name: string } }>;
}

export function chatBodies(records: MockOpenAIRecord[]): ChatBody[] {
  return records.map((record) => record.body as ChatBody);
}

// The chat requests one scenario has received, in arrival order.
export async function requestsOf(h: Harness): Promise<ChatBody[]> {
  return chatBodies(await recordsOf(h.mock, h.scenario));
}

// The folder of the agent transcripts in the fixture's book project.
export function transcriptFolder(h: Harness): string {
  return join(h.fixture.library, 'book', 'logs', 'agent-runs');
}

// A file of 20,000 characters, for a read that is longer than the transcript limit.
export const LONG_SOURCE_LENGTH = 20000;

export function writeLongSource(fixture: ProjectsLibrary): void {
  writeFileSync(
    join(fixture.library, 'book', 'sources', 'long.md'),
    'a'.repeat(LONG_SOURCE_LENGTH),
  );
}

// The mock steps of a list call, then a read of the given path, then the text. turnIndex counts the assistant
// messages of a request: firstTurn is the index of the list call's request (0 for a run with no history).
export function listThenReadSteps(
  readPath: string,
  finalDeltas: string[],
  firstTurn = 0,
): unknown[] {
  return [
    {
      match: { endpoint: 'chat', turnIndex: firstTurn },
      reply: {
        kind: 'toolCalls',
        calls: [{ name: 'list_files', argumentChunks: ['{}'] }],
      },
    },
    {
      match: { endpoint: 'chat', turnIndex: firstTurn + 1 },
      reply: {
        kind: 'toolCalls',
        calls: [
          {
            name: 'read_file',
            argumentChunks: [JSON.stringify({ path: readPath })],
          },
        ],
      },
    },
    {
      match: { endpoint: 'chat', turnIndex: firstTurn + 2 },
      reply: { kind: 'stream', deltas: finalDeltas },
    },
  ];
}

// The tool messages of one request, in order.
export function toolMessagesOf(body: ChatBody): WireMessage[] {
  return body.messages.filter((message) => message.role === 'tool');
}
