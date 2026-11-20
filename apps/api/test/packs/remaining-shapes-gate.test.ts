import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { stringify } from 'yaml';
import {
  AGENT_RUNS_ROUTE,
  agentLoopEventSchema,
  type AgentLoopEvent,
} from '@bbartolome/scriba-contracts/agent-loop';
import { PROVIDER_DEFAULTS } from '@bbartolome/scriba-contracts/providers';
import { ACTIVE_PROJECT_ROUTE } from '@bbartolome/scriba-contracts/project-store';
import {
  FUNCTIONS_ROUTE,
  TOOLS_ROUTE,
  TOOL_ENABLED_ROUTE,
  TOOL_ROUTE,
  functionListSchema,
  toolDetailSchema,
  toolListSchema,
  type ToolList,
} from '@bbartolome/scriba-contracts/tool-registry';
import { createTestApp, type TestApp } from '../create-test-app';
import { send, sessionCookie, type Reply } from '../guard-request';
import {
  LOOPBACK_HOST,
  LOOPBACK_ORIGIN,
  observeEvents,
  type Observer,
} from '../invariant-sweep';
import { makeLibrary } from '../settings.kit';
import {
  buildProjectsLibrary,
  type ProjectsLibrary,
} from '../project-store-projects.kit';
import { recordsOf, startMockOpenAI } from '../providers-client.kit';
import { dataOf } from '../sse';
import { PACKS_ROOT } from './golden.kit';

// The phase checklist of GNP-24: the fourteen tools of the phase, the two that ship enabled and the twelve that ship disabled.
const ENABLED = ['throughline_check', 'remix'];
const DISABLED = [
  'named_concept',
  'comparison_set',
  'objection_handler',
  'contrast',
  'profile',
  'zoom',
  'reader_challenge',
  'framework_builder',
  'method_first',
  'timeline',
  'flashback',
  'stockdale_tension',
];
const PHASE = [...ENABLED, ...DISABLED];

type ToolRow = ToolList['tools'][number];

function call(
  app: TestApp,
  cookie: string,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie,
    method,
    path,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function toolRows(app: TestApp, cookie: string): Promise<ToolRow[]> {
  const reply = await call(app, cookie, 'GET', TOOLS_ROUTE);
  expect(reply.status).toBe(200);
  return toolListSchema.parse(JSON.parse(reply.body)).tools;
}

async function functionNames(app: TestApp, cookie: string): Promise<string[]> {
  const reply = await call(app, cookie, 'GET', FUNCTIONS_ROUTE);
  expect(reply.status).toBe(200);
  return functionListSchema
    .parse(JSON.parse(reply.body) as unknown)
    .functions.map((entry) => entry.function.name);
}

// The agent-loop events read from the stream, up to and including a run-ended.
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

// The settings of one project library: `book` active, and one mock provider at the given base URL.
function settingsText(providerBaseURL: string): string {
  return stringify({
    schemaVersion: 1,
    projects: { schemaVersion: 1, active: 'book' },
    providers: {
      schemaVersion: 1,
      list: [
        {
          id: 'mock',
          kind: 'openai-compatible',
          baseURL: providerBaseURL,
          model: 'mock-model',
          ...PROVIDER_DEFAULTS,
        },
      ],
      appDefault: { providerId: 'mock', model: 'mock-model' },
    },
  });
}

it('C1: the fourteen phase tools are valid, the twelve nonfiction shapes ship disabled, and throughline_check and remix ship enabled', async () => {
  const library = makeLibrary();
  let app: TestApp | undefined;
  try {
    app = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PACKS_DIR: PACKS_ROOT },
    });
    const cookie = await sessionCookie(app, library);
    const tools = await toolRows(app, cookie);
    for (const name of PHASE) {
      const row = tools.find((tool) => tool.name === name);
      expect(row, name).toBeDefined();
      expect(row?.valid, name).toBe(true);
      expect(row?.error ?? null, name).toBeNull();
      expect(row?.enabled, name).toBe(ENABLED.includes(name));
    }
  } finally {
    await app?.close();
    rmSync(library, { recursive: true, force: true });
  }
});

it('C4: enabling each disabled shape through the Tool registry makes it callable by the agent and available as a canvas node', async () => {
  const scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-gnp24-gate-'));
  writeFileSync(
    join(scenariosDir, 'enabled.json'),
    JSON.stringify({
      steps: [
        {
          match: { endpoint: 'chat' },
          reply: { kind: 'stream', deltas: ['Done.'] },
        },
      ],
    }),
  );
  const mock = await startMockOpenAI({ scenariosDir });
  const fixture: ProjectsLibrary = buildProjectsLibrary({
    settings: settingsText(`${mock.baseUrl}/scenario/enabled/v1`),
  });
  let app: TestApp | undefined;
  let stream: Observer | undefined;
  try {
    app = await createTestApp({
      libraryDir: fixture.library,
      env: { SCRIBA_PACKS_DIR: PACKS_ROOT },
    });
    const cookie = await sessionCookie(app, fixture.library);
    const activated = await call(app, cookie, 'POST', ACTIVE_PROJECT_ROUTE, {
      projectId: 'book',
    });
    expect(activated.status).toBe(200);

    for (const name of DISABLED) {
      // Before the enable: the row is disabled and the agent is not offered the tool.
      const before = (await toolRows(app, cookie)).find(
        (tool) => tool.name === name,
      );
      expect(before, name).toBeDefined();
      expect(before?.enabled, name).toBe(false);
      expect(await functionNames(app, cookie), name).not.toContain(name);

      const enable = await call(
        app,
        cookie,
        'POST',
        TOOL_ENABLED_ROUTE.replace(':name', name),
        { enabled: true },
      );
      expect(enable.status, name).toBe(200);
      const enabled = (await toolRows(app, cookie)).find(
        (tool) => tool.name === name,
      );
      expect(enabled, name).toMatchObject({ enabled: true, valid: true });

      // After the enable: the agent is offered the tool.
      expect(await functionNames(app, cookie), name).toContain(name);

      // The canvas palette condition (enabled and valid) and the ready-node condition (non-null spec and views).
      const detailReply = await call(
        app,
        cookie,
        'GET',
        TOOL_ROUTE.replace(':name', name),
      );
      expect(detailReply.status, name).toBe(200);
      const detail = toolDetailSchema.parse(JSON.parse(detailReply.body));
      expect(detail.spec, name).not.toBeNull();
      expect(detail.views, name).toBeTruthy();
    }

    // The agent clause, once for all twelve: the chat request of one run offers every name.
    stream = await observeEvents(app.baseUrl, LOOPBACK_HOST, cookie);
    const started = await call(app, cookie, 'POST', AGENT_RUNS_ROUTE, {
      intent: 'Say done',
    });
    expect(started.status).toBe(200);
    await readUntilEnded(stream);

    const [firstChat] = chatBodies(await recordsOf(mock, 'enabled'));
    expect(firstChat).toBeDefined();
    const offered = (firstChat?.tools ?? []).map((tool) => tool.function.name);
    for (const name of DISABLED) {
      expect(offered, name).toContain(name);
    }
  } finally {
    await stream?.close();
    await app?.close();
    await mock.close();
    rmSync(scenariosDir, { recursive: true, force: true });
    fixture.remove();
  }
});

interface ChatBody {
  tools?: Array<{ type: string; function: { name: string } }>;
}

function chatBodies(records: Array<{ body: unknown }>): ChatBody[] {
  return records.map((record) => record.body as ChatBody);
}
