import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

// Every test builds its own temp library, its own mock scenario folder, and its own app, and removes them all.

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
  const scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-agl03-run-'));
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

const READ_SUMMARY =
  'Expected arguments for read_file: path (string, required).';
const WITHDRAWN = 'This tool is unavailable for the rest of this agent run.';

const LIST_THEN_READ_THEN_TEXT = [
  {
    match: { endpoint: 'chat', turnIndex: 0 },
    reply: {
      kind: 'toolCalls',
      calls: [{ name: 'list_files', argumentChunks: ['{}'] }],
    },
  },
  {
    match: { endpoint: 'chat', turnIndex: 1 },
    reply: {
      kind: 'toolCalls',
      calls: [
        {
          name: 'read_file',
          argumentChunks: ['{"path":"sources/outline.md"}'],
        },
      ],
    },
  },
  {
    match: { endpoint: 'chat', turnIndex: 2 },
    reply: { kind: 'stream', deltas: ['The outline ', 'is short.'] },
  },
];

it('C1: a list, read and text turn ends completed', async () => {
  const h = await openHarness('turns', LIST_THEN_READ_THEN_TEXT, (url) => ({
    providerBaseURL: url,
  }));
  try {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      await startRun(h, { intent: 'Summarize my outline' });
      const events = await readUntilEnded(stream);

      expect(events.map((event) => event.type)).toEqual([
        'run-started',
        'tool-call-started',
        'tool-call-args',
        'tool-call-result',
        'tool-call-started',
        'tool-call-args',
        'tool-call-result',
        'token-delta',
        'token-delta',
        'run-ended',
      ]);
      expect(events.map((event) => event.data.seq)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      ]);
      expect(events[1]).toMatchObject({
        type: 'tool-call-started',
        data: { name: 'list_files', family: 'project' },
      });
      expect(events[2]).toMatchObject({
        type: 'tool-call-args',
        data: { valid: true },
      });
      expect(events[4]).toMatchObject({
        type: 'tool-call-started',
        data: { name: 'read_file', family: 'project' },
      });
      expect(events[5]).toMatchObject({
        type: 'tool-call-args',
        data: { valid: true },
      });
      expect(events[9]).toMatchObject({
        type: 'run-ended',
        data: { reason: 'completed', pendingChangeIds: [] },
      });

      // Each card's three events share one callId, and the two cards have different ids.
      const callIdOf = (event: AgentLoopEvent): string =>
        (event.data as { callId: string }).callId;
      const firstCall = callIdOf(events[1]);
      const secondCall = callIdOf(events[4]);
      expect(firstCall).not.toBe(secondCall);
      expect([callIdOf(events[2]), callIdOf(events[3])]).toEqual([
        firstCall,
        firstCall,
      ]);
      expect([callIdOf(events[5]), callIdOf(events[6])]).toEqual([
        secondCall,
        secondCall,
      ]);

      // The third request carries the two assistant calls and their tool results, under the same ids.
      const records = await recordsOf(h.mock, 'turns');
      expect(records).toHaveLength(3);
      const third = chatBodies(records)[2];
      const assistantCallIds = third.messages
        .filter((message) => message.role === 'assistant')
        .flatMap((message) =>
          (message.tool_calls ?? []).map((call) => call.id),
        );
      expect(assistantCallIds).toEqual([firstCall, secondCall]);
      const toolCallIds = third.messages
        .filter((message) => message.role === 'tool')
        .map((message) => message.tool_call_id);
      expect(toolCallIds).toEqual([firstCall, secondCall]);
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('C2: a looping mock ends at step 12 and Continue starts a fresh cap', async () => {
  const h = await openHarness(
    'loop',
    [
      {
        match: { endpoint: 'chat' },
        reply: {
          kind: 'toolCalls',
          calls: [{ name: 'list_files', argumentChunks: ['{}'] }],
        },
      },
    ],
    (url) => ({ providerBaseURL: url }),
  );
  try {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      const first = await startRun(h, { intent: 'List things forever' });
      const events = await readUntilEnded(stream);
      const last = events.length - 1;
      expect(events[last - 1]).toMatchObject({
        type: 'step-cap-reached',
        data: { step: 12, cap: 12 },
      });
      expect(events[last]).toMatchObject({
        type: 'run-ended',
        data: { reason: 'capped' },
      });
      expect(await recordsOf(h.mock, 'loop')).toHaveLength(12);

      const second = await startRun(h, {
        intent: 'Continue',
        conversationId: first.conversationId,
      });
      expect(second.conversationId).toBe(first.conversationId);
      expect(second.runId).not.toBe(first.runId);
      const more = await readUntilEnded(stream);
      expect(more[more.length - 1]).toMatchObject({
        type: 'run-ended',
        data: { reason: 'capped', runId: second.runId },
      });
      expect(await recordsOf(h.mock, 'loop')).toHaveLength(24);
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('C6: the request has the system prompt, the project summary and the enabled tools', async () => {
  const h = await openHarness(
    'text',
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
      await startRun(h, { intent: 'Say done' });
      await readUntilEnded(stream);

      const [first] = chatBodies(await recordsOf(h.mock, 'text'));
      expect(first.messages[0].role).toBe('system');
      const prompt = String(first.messages[0].content);
      expect(prompt).toContain('pending changes');
      expect(prompt).toContain('[@id]');
      expect(prompt).toContain('confined to the active project');
      expect(first.messages[1].role).toBe('system');
      const summary = String(first.messages[1].content);
      expect(summary).toContain('Project: Book (genre pack: nonfiction).');
      expect(summary).toContain('sources (1 file)');
      expect(toolNamesOf(first)).toEqual([
        'edit_file',
        'list_files',
        'read_file',
        'search_notes',
        'write_file',
      ]);

      // With research on, the offered tools are still the project family's: no research tool exists at M1.
      const put = await post(h, AGENT_SETTINGS_ROUTE, {
        research: { enabled: true },
      });
      expect(put.status).toBe(200);
      await startRun(h, { intent: 'Say done again' });
      await readUntilEnded(stream);
      const records = chatBodies(await recordsOf(h.mock, 'text'));
      expect(records).toHaveLength(2);
      expect(toolNamesOf(records[1])).toEqual([
        'edit_file',
        'list_files',
        'read_file',
        'search_notes',
        'write_file',
      ]);
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('S4: a persistent 503 with retries 0 ends the run error with a readable message', async () => {
  const h = await openHarness(
    'unavailable',
    [
      {
        match: { endpoint: 'chat' },
        reply: { kind: 'status', status: 503, body: { error: 'busy' } },
      },
    ],
    (url) => ({ providerBaseURL: url, providers: providersSection(url, 0) }),
  );
  try {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      await startRun(h, { intent: 'Hello' });
      const events = await readUntilEnded(stream);
      const ended = events[events.length - 1];
      expect(ended).toMatchObject({
        type: 'run-ended',
        data: { reason: 'error', pendingChangeIds: [] },
      });
      const message = (ended.data as { message?: string }).message ?? '';
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toContain('PROVIDER_ABORTED');
      expect(await recordsOf(h.mock, 'unavailable')).toHaveLength(1);
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('R1: a read outside the project is refused, and the outside file never reaches the model', async () => {
  const h = await openHarness(
    'outside',
    [
      {
        match: { endpoint: 'chat', turnIndex: 0 },
        reply: {
          kind: 'toolCalls',
          calls: [
            {
              name: 'read_file',
              argumentChunks: ['{"path":"../outward/secret.md"}'],
            },
          ],
        },
      },
      {
        match: { endpoint: 'chat', turnIndex: 1 },
        reply: { kind: 'stream', deltas: ['I could not read that file.'] },
      },
    ],
    (url) => ({ providerBaseURL: url }),
  );
  try {
    writeFileSync(join(h.fixture.outside, 'secret.md'), 'SECRET-OUTSIDE\n');
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      await startRun(h, { intent: 'Read the secret outside the project' });
      const events = await readUntilEnded(stream);
      expect(events[events.length - 1]).toMatchObject({
        type: 'run-ended',
        data: { reason: 'completed' },
      });

      const records = await recordsOf(h.mock, 'outside');
      expect(records.map((record) => record.step)).toEqual([0, 1]);
      const [, second] = chatBodies(records);
      expect(toolContents(second)).toEqual([
        `path: The path must not contain a ".." segment.\n${READ_SUMMARY}`,
      ]);
      const everything = JSON.stringify(records);
      expect(everything).not.toContain('SECRET-OUTSIDE');
      expect(everything).not.toContain(h.fixture.outside);
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('W1: a third malformed read withdraws read_file from the next request', async () => {
  const readWith = (turnIndex: number, args: string) => ({
    match: { endpoint: 'chat', turnIndex },
    reply: {
      kind: 'toolCalls',
      calls: [{ name: 'read_file', argumentChunks: [args] }],
    },
  });
  const h = await openHarness(
    'withdraw',
    [
      readWith(0, '{"path": '),
      readWith(1, '{}'),
      readWith(2, '{"path": 3}'),
      {
        match: { endpoint: 'chat', turnIndex: 3 },
        reply: { kind: 'stream', deltas: ['I will use list_files instead.'] },
      },
    ],
    (url) => ({ providerBaseURL: url }),
  );
  try {
    const stream = await observeEvents(h.app.baseUrl, LOOPBACK_HOST, h.cookie);
    try {
      await startRun(h, { intent: 'Read until read_file is withdrawn' });
      const events = await readUntilEnded(stream);
      expect(events[events.length - 1]).toMatchObject({
        type: 'run-ended',
        data: { reason: 'completed' },
      });

      const records = await recordsOf(h.mock, 'withdraw');
      expect(records).toHaveLength(4);
      const bodies = chatBodies(records);
      expect(toolContents(bodies[1])).toEqual([
        `arguments: is not valid JSON\n${READ_SUMMARY}`,
      ]);
      expect(toolContents(bodies[2])).toEqual([
        `arguments: is not valid JSON\n${READ_SUMMARY}`,
        `path: is required\n${READ_SUMMARY}`,
      ]);
      expect(toolContents(bodies[3])).toEqual([
        `arguments: is not valid JSON\n${READ_SUMMARY}`,
        `path: is required\n${READ_SUMMARY}`,
        `path: must be a string\n${READ_SUMMARY}\n${WITHDRAWN}`,
      ]);
      expect(toolNamesOf(bodies[2])).toContain('read_file');
      expect(toolNamesOf(bodies[3])).not.toContain('read_file');
      expect(toolNamesOf(bodies[3])).toContain('list_files');
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});
