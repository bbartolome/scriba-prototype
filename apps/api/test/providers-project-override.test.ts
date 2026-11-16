import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { stringify } from 'yaml';
import {
  AGENT_RUNS_ROUTE,
  AGENT_RUN_STOP_ROUTE,
  agentStartResponseSchema,
} from '@bbartolome/scriba-contracts/agent-loop';
import { ACTIVE_PROJECT_ROUTE } from '@bbartolome/scriba-contracts/project-store';
import {
  EFFECTIVE_MODEL_ROUTE,
  PROJECT_MODEL_CLEAR_ROUTE,
  PROJECT_MODEL_ROUTE,
  PROVIDER_DEFAULTS,
  PROVIDER_DELETE_ROUTE,
  effectiveModelSchema,
  type EffectiveModel,
  type ModelChoice,
  type OpenAICompatibleConfig,
} from '@bbartolome/scriba-contracts/providers';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from './invariant-sweep';
import { startMockOpenAI, type MockOpenAI } from './providers-client.kit';
import { makeLibrary } from './settings.kit';
import { getProjects, listedProjects } from './project-store-projects.kit';

// The book's project.yaml before any override: a comment, the three required keys, and an export block.
const BOOK_YAML = [
  '# A book in progress.',
  'schemaVersion: 1',
  'title: Book # working title',
  'genrePack: nonfiction',
  'export:',
  '  template: default',
  '',
].join('\n');

// The three sample lines of a project with no override (the nonfiction sample has the same shape).
const SECOND_YAML = 'schemaVersion: 1\ntitle: Second\ngenrePack: nonfiction\n';

// The override that the book holds after a set of gemma3 on provider mock.
const BOOK_WITH_GEMMA3 = `${BOOK_YAML}model:\n  providerId: mock\n  model: gemma3\n`;

const APP_DEFAULT: ModelChoice = { providerId: 'mock', model: 'llama3.1' };

// The warning of D3: a fixed text that names no id.
const DELETED_WARNING =
  "The project's model provider was deleted, so the app default is used.";

const STALL_STEPS = [
  {
    match: { endpoint: 'chat' },
    delayMs: 5000,
    reply: { kind: 'stream', deltas: ['late'] },
  },
];

let scenariosDir: string;
let mock: MockOpenAI;

beforeAll(async () => {
  // Only the stall scenario is needed. The O tests resolve with a non-empty model, so they make no network call;
  // only the agent start in O6 reaches the provider, and the stall keeps that run active until it is stopped.
  scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-mpr12-scenarios-'));
  writeFileSync(
    join(scenariosDir, 'stall.json'),
    JSON.stringify({ steps: STALL_STEPS }),
  );
  mock = await startMockOpenAI({ scenariosDir });
});

afterAll(async () => {
  await mock.close();
  rmSync(scenariosDir, { recursive: true, force: true });
});

// A keyless provider on the mock's stall scenario, with the defaults of PROVIDER_DEFAULTS.
function provider(id: string, model: string): OpenAICompatibleConfig {
  return {
    id,
    kind: 'openai-compatible',
    baseURL: `${mock.baseUrl}/scenario/stall/v1`,
    model,
    ...PROVIDER_DEFAULTS,
  };
}

// A settings.yaml with the given providers and the app default. The projects section is left out, so no project
// is active until a test activates one.
function settingsText(list: OpenAICompatibleConfig[]): string {
  return stringify({
    schemaVersion: 1,
    providers: { schemaVersion: 1, list, appDefault: APP_DEFAULT },
  });
}

interface Harness {
  app: TestApp;
  cookie: string;
  library: string;
}

function writeProject(library: string, folder: string, text: string): void {
  mkdirSync(join(library, folder), { recursive: true });
  writeFileSync(join(library, folder, 'project.yaml'), text);
}

// A temp library with the book and the second project, the composed app on it, and a session cookie. The library is
// removed after the callback, in every case.
async function withApp(
  list: OpenAICompatibleConfig[],
  run: (h: Harness) => Promise<void>,
): Promise<void> {
  const library = makeLibrary(settingsText(list));
  try {
    writeProject(library, 'book', BOOK_YAML);
    writeProject(library, 'second', SECOND_YAML);
    const app = await createTestApp({ libraryDir: library });
    try {
      const cookie = await sessionCookie(app, library);
      await run({ app, cookie, library });
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
}

// One GET with the loopback Host and the session cookie.
function get(h: Harness, path: string): Promise<Reply> {
  return send(h.app.baseUrl, { host: LOOPBACK_HOST, cookie: h.cookie, path });
}

// One POST with the loopback Origin the guard expects. No body when `body` is undefined.
function post(h: Harness, path: string, body?: unknown): Promise<Reply> {
  return send(h.app.baseUrl, {
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie: h.cookie,
    method: 'POST',
    path,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function activate(h: Harness, projectId: string): Promise<void> {
  const reply = await post(h, ACTIVE_PROJECT_ROUTE, { projectId });
  expect(reply.status).toBe(200);
}

// The effective model of a project, read through the route and checked against its contract.
async function effectiveOf(
  h: Harness,
  projectId: string,
): Promise<EffectiveModel> {
  const reply = await get(h, `${EFFECTIVE_MODEL_ROUTE}?projectId=${projectId}`);
  expect(reply.status).toBe(200);
  return effectiveModelSchema.parse(JSON.parse(reply.body));
}

function bookYaml(h: Harness): string {
  return readFileSync(join(h.library, 'book', 'project.yaml'), 'utf8');
}

function deletePath(id: string): string {
  return PROVIDER_DELETE_ROUTE.replace(':id', id);
}

it('O1: a set writes only the model key of project.yaml, and the next resolution for the project uses it (criterion 1)', async () => {
  await withApp([provider('mock', 'llama3.1')], async (h) => {
    await activate(h, 'book');
    const set = await post(h, PROJECT_MODEL_ROUTE, {
      providerId: 'mock',
      model: 'gemma3',
    });
    expect(set.status).toBe(200);
    expect(JSON.parse(set.body)).toEqual({
      projectModel: { providerId: 'mock', model: 'gemma3' },
    });

    // The bytes before the key are the fixture's; the model key is appended at the end.
    expect(bookYaml(h)).toBe(BOOK_WITH_GEMMA3);

    const effective = await effectiveOf(h, 'book');
    expect(effective.choice).toEqual({ providerId: 'mock', model: 'gemma3' });
    expect(effective.source).toBe('project');
    expect(effective.warning).toBeUndefined();
  });
});

it('O2: a clear returns the project to the app default, and a second clear changes nothing (criterion 2)', async () => {
  await withApp([provider('mock', 'llama3.1')], async (h) => {
    await activate(h, 'book');
    const set = await post(h, PROJECT_MODEL_ROUTE, {
      providerId: 'mock',
      model: 'gemma3',
    });
    expect(set.status).toBe(200);

    const clear = await post(h, PROJECT_MODEL_CLEAR_ROUTE);
    expect(clear.status).toBe(200);
    expect(JSON.parse(clear.body)).toEqual({ projectModel: null });
    expect(bookYaml(h)).toBe(BOOK_YAML);

    const effective = await effectiveOf(h, 'book');
    expect(effective.choice).toEqual(APP_DEFAULT);
    expect(effective.source).toBe('app');

    const again = await post(h, PROJECT_MODEL_CLEAR_ROUTE);
    expect(again.status).toBe(200);
    expect(JSON.parse(again.body)).toEqual({ projectModel: null });
    expect(bookYaml(h)).toBe(BOOK_YAML);
  });
});

it('O3: an override that names a deleted provider resolves to the app default with a warning, and the file keeps the id (criterion 3)', async () => {
  await withApp(
    [provider('mock', 'llama3.1'), provider('other', 'm1')],
    async (h) => {
      await activate(h, 'book');
      const set = await post(h, PROJECT_MODEL_ROUTE, {
        providerId: 'other',
        model: 'm1',
      });
      expect(set.status).toBe(200);

      const deleted = await post(h, deletePath('other'));
      expect(deleted.status).toBe(204);

      const effective = await effectiveOf(h, 'book');
      expect(effective.choice).toEqual(APP_DEFAULT);
      expect(effective.source).toBe('app');
      expect(effective.warning).toBe(DELETED_WARNING);

      // The fallback is a read. The file still names the deleted id.
      expect(bookYaml(h)).toBe(
        `${BOOK_YAML}model:\n  providerId: other\n  model: m1\n`,
      );
    },
  );
});

it('O4: switching the active project changes the effective model (criterion 4)', async () => {
  await withApp([provider('mock', 'llama3.1')], async (h) => {
    await activate(h, 'book');
    const set = await post(h, PROJECT_MODEL_ROUTE, {
      providerId: 'mock',
      model: 'gemma3',
    });
    expect(set.status).toBe(200);
    const bookActive = await effectiveOf(h, 'book');
    expect(bookActive.choice).toEqual({ providerId: 'mock', model: 'gemma3' });
    expect(bookActive.source).toBe('project');

    // With second active, the book has no override in effect: its resolution is the app default.
    await activate(h, 'second');
    const secondActive = await effectiveOf(h, 'second');
    expect(secondActive.choice).toEqual(APP_DEFAULT);
    expect(secondActive.source).toBe('app');
    const bookInactive = await effectiveOf(h, 'book');
    expect(bookInactive.choice).toEqual(APP_DEFAULT);
    expect(bookInactive.source).toBe('app');

    await activate(h, 'book');
    const bookAgain = await effectiveOf(h, 'book');
    expect(bookAgain.choice).toEqual({ providerId: 'mock', model: 'gemma3' });
    expect(bookAgain.source).toBe('project');
  });
});

it('O5: a project.yaml with no override validates, is listed ok, and resolves to the app default (criterion 5)', async () => {
  await withApp([provider('mock', 'llama3.1')], async (h) => {
    const list = listedProjects(await getProjects(h.app, h.cookie));
    expect(list).toContainEqual(
      expect.objectContaining({ id: 'second', status: 'ok' }),
    );

    await activate(h, 'second');
    const effective = await effectiveOf(h, 'second');
    expect(effective.choice).toEqual(APP_DEFAULT);
    expect(effective.source).toBe('app');
  });
});

it('O6: an override that names a deleted provider does not refuse an agent start with AGENT_NO_PROVIDER (extra, hasChoice)', async () => {
  await withApp(
    [provider('mock', 'llama3.1'), provider('other', 'm1')],
    async (h) => {
      await activate(h, 'book');
      const set = await post(h, PROJECT_MODEL_ROUTE, {
        providerId: 'other',
        model: 'm1',
      });
      expect(set.status).toBe(200);
      const deleted = await post(h, deletePath('other'));
      expect(deleted.status).toBe(204);

      // The app default is valid, so the start is accepted. The stall keeps the run active until it is stopped.
      const start = await post(h, AGENT_RUNS_ROUTE, { intent: 'Hello' });
      expect(start.status).toBe(200);
      const { runId } = agentStartResponseSchema.parse(JSON.parse(start.body));

      const stop = await post(h, AGENT_RUN_STOP_ROUTE, { runId });
      expect(stop.status).toBe(200);
    },
  );
});

it("O7: an override with an empty model resolves to the provider's own model, with source project (extra, D12)", async () => {
  await withApp([provider('mock', 'llama3.1')], async (h) => {
    await activate(h, 'book');
    const set = await post(h, PROJECT_MODEL_ROUTE, {
      providerId: 'mock',
      model: '',
    });
    expect(set.status).toBe(200);

    const effective = await effectiveOf(h, 'book');
    expect(effective.choice).toEqual({ providerId: 'mock', model: 'llama3.1' });
    expect(effective.source).toBe('project');
  });
});
