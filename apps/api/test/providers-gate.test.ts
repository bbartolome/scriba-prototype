import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { stringify } from 'yaml';
import {
  APP_DEFAULT_ROUTE,
  CONNECTION_TEST_ROUTE,
  EFFECTIVE_MODEL_ROUTE,
  KEY_CLEAR_ROUTE,
  KEY_SET_ROUTE,
  MODELS_ROUTE,
  PRESETS_ROUTE,
  PROVIDER_DEFAULTS,
  PROVIDER_DELETE_ROUTE,
  PROVIDER_UPDATE_ROUTE,
  PROVIDERS_ROUTE,
  type ConnectionTestResult,
  type ModelChoice,
  type OpenAICompatibleConfig,
} from '@bbartolome/scriba-contracts/providers';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from './invariant-sweep';
import {
  recordsOf,
  startMockOpenAI,
  type MockOpenAI,
} from './providers-client.kit';
import { captureStdout, stripAnsi } from './secrets.kit';
import { makeLibrary, settingsFilePath } from './settings.kit';

const KEY = 'sk-test-abcdefgh1234WXYZ';
const KEY_HINT = 'WXYZ';
const OLLAMA_URL = 'http://host.docker.internal:11434/v1';
const NO_SUCH_PROVIDER = 'no-such-provider';
// The keyless placeholder the client sends in Authorization (openai-compatible-client.ts line 27).
const KEYLESS_AUTHORIZATION = 'Bearer scriba-keyless';
const SECRECY_MODELS = ['qwen2.5', 'gemma3', 'llama3.1'];

interface ErrorBody {
  error: { code: string; message: string };
}

interface RoutePair {
  method: 'GET' | 'POST';
  path: string;
}

// The twelve method and path pairs of providers.controller.ts. The test checks that each is on the app.
const CONTROLLER_ROUTES: RoutePair[] = [
  { method: 'GET', path: PROVIDERS_ROUTE },
  { method: 'POST', path: PROVIDERS_ROUTE },
  { method: 'GET', path: PRESETS_ROUTE },
  { method: 'GET', path: APP_DEFAULT_ROUTE },
  { method: 'POST', path: APP_DEFAULT_ROUTE },
  { method: 'POST', path: PROVIDER_UPDATE_ROUTE },
  { method: 'POST', path: PROVIDER_DELETE_ROUTE },
  { method: 'GET', path: MODELS_ROUTE },
  { method: 'POST', path: KEY_SET_ROUTE },
  { method: 'POST', path: KEY_CLEAR_ROUTE },
  { method: 'GET', path: EFFECTIVE_MODEL_ROUTE },
  { method: 'POST', path: CONNECTION_TEST_ROUTE },
];

function errorCodeOf(reply: Reply): string {
  return (JSON.parse(reply.body) as ErrorBody).error.code;
}

// A keyless provider with the defaults of PROVIDER_DEFAULTS.
function keyless(
  id: string,
  baseURL: string,
  model = '',
): OpenAICompatibleConfig {
  return {
    id,
    kind: 'openai-compatible',
    baseURL,
    model,
    ...PROVIDER_DEFAULTS,
  };
}

// A settings.yaml holding only the providers section. The other sections are written at boot.
function settingsWith(
  list: OpenAICompatibleConfig[],
  appDefault: ModelChoice | null,
): string {
  return stringify({
    schemaVersion: 1,
    providers: { schemaVersion: 1, list, appDefault },
  });
}

function get(app: TestApp, cookie: string, path: string): Promise<Reply> {
  return send(app.baseUrl, { host: LOOPBACK_HOST, cookie, path });
}

// A POST with the loopback Origin, as the guard requires for a mutation. No body when `body` is undefined.
function post(
  app: TestApp,
  cookie: string,
  path: string,
  body?: unknown,
): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie,
    method: 'POST',
    path,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// A models reply body in the shape the mock serves for /v1/models.
function modelsOf(ids: string[]): unknown {
  return {
    object: 'list',
    data: ids.map((id) => ({ id, object: 'model', owned_by: 'scriba-mock' })),
  };
}

// The 401 body that quotes the key (plan D5). A real provider does not quote a key it never received.
function echoBody(): unknown {
  return { error: { message: `Incorrect API key provided: ${KEY}` } };
}

function writeScenarios(
  directory: string,
  scenarios: Record<string, unknown>,
): void {
  for (const [name, file] of Object.entries(scenarios)) {
    writeFileSync(join(directory, `${name}.json`), JSON.stringify(file));
  }
}

it('G1: every /api/providers route is on the composed app; each refuses a request without a session with 401 AUTH_REQUIRED, and each POST refuses a request with a session and no loopback Origin with 403 AUTH_ORIGIN_REJECTED', async () => {
  const library = makeLibrary();
  try {
    const app = await createTestApp({ libraryDir: library });
    try {
      const cookie = await sessionCookie(app, library);

      // (a) Every controller pair is mounted. Presence only: MPR-12 adds routes to the same list.
      const routes = app.routes();
      for (const route of CONTROLLER_ROUTES) {
        expect(routes).toContainEqual({
          method: route.method,
          path: route.path,
        });
      }

      // (b) and (c) Each pair, with the id replaced, is behind the guard.
      for (const route of CONTROLLER_ROUTES) {
        const path = route.path.replace(':id', NO_SUCH_PROVIDER);
        const anonymous = await send(app.baseUrl, {
          host: LOOPBACK_HOST,
          method: route.method,
          path,
        });
        expect(anonymous.status, `${route.method} ${path}, no session`).toBe(
          401,
        );
        expect(errorCodeOf(anonymous)).toBe('AUTH_REQUIRED');

        if (route.method === 'POST') {
          const withoutOrigin = await send(app.baseUrl, {
            host: LOOPBACK_HOST,
            method: 'POST',
            path,
            cookie,
          });
          expect(
            withoutOrigin.status,
            `POST ${path}, session and no Origin`,
          ).toBe(403);
          expect(errorCodeOf(withoutOrigin)).toBe('AUTH_ORIGIN_REJECTED');
        }
      }

      // (d) Control: with the session, the same guard lets a GET through.
      const control = await get(app, cookie, PROVIDERS_ROUTE);
      expect(control.status).toBe(200);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

// The two scenarios of the secrecy suite. secrecy-ok serves a model list and a streamed reply.
// secrecy-echo refuses both calls with a 401 whose body quotes the key (plan D5).
function secrecyScenarios(): Record<string, unknown> {
  return {
    'secrecy-ok': {
      steps: [
        {
          match: { endpoint: 'models' },
          reply: {
            kind: 'status',
            status: 200,
            body: modelsOf(SECRECY_MODELS),
          },
        },
        {
          match: { endpoint: 'chat' },
          reply: { kind: 'stream', deltas: ['ok'] },
        },
      ],
    },
    'secrecy-echo': {
      steps: [
        {
          match: { endpoint: 'models' },
          reply: { kind: 'status', status: 401, body: echoBody() },
        },
        {
          match: { endpoint: 'chat' },
          reply: { kind: 'status', status: 401, body: echoBody() },
        },
      ],
    },
  };
}

it('G2: after a key is set and used, no response, no error body, no settings.yaml byte and no stdout line holds it; the mock sees it only in Authorization', async () => {
  const scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-mpr08-secrecy-'));
  writeScenarios(scenariosDir, secrecyScenarios());
  const mock: MockOpenAI = await startMockOpenAI({ scenariosDir });
  const library = makeLibrary(
    settingsWith(
      [
        keyless('ollama', OLLAMA_URL),
        keyless(
          'mock-keyed',
          `${mock.baseUrl}/scenario/secrecy-ok/v1`,
          'llama3.1',
        ),
        keyless('mock-echo', `${mock.baseUrl}/scenario/secrecy-echo/v1`),
      ],
      { providerId: 'mock-keyed', model: 'llama3.1' },
    ),
  );
  // Started before the boot, so the boot's stdout is captured too. Stopped in finally.
  const stdout = captureStdout();
  const bodies: string[] = [];
  let app: TestApp | undefined;
  try {
    app = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_LOG_LEVEL: 'debug' },
    });
    const cookie = await sessionCookie(app, library);

    // (a) The key is set. The read view shows only its last four characters.
    const set = await post(app, cookie, KEY_SET_ROUTE, {
      providerId: 'mock-keyed',
      key: KEY,
    });
    expect(set.status).toBe(200);
    expect(JSON.parse(set.body)).toMatchObject({
      keySet: true,
      keyHint: KEY_HINT,
    });
    bodies.push(set.body);

    // (b) The reads that show the provider, the default and the resolved model all succeed.
    for (const path of [
      PROVIDERS_ROUTE,
      APP_DEFAULT_ROUTE,
      PRESETS_ROUTE,
      EFFECTIVE_MODEL_ROUTE,
      '/api/providers/mock-keyed/models',
    ]) {
      const reply = await get(app, cookie, path);
      expect(reply.status, `GET ${path}`).toBe(200);
      bodies.push(reply.body);
    }

    // (c) The echoing provider refuses the listing. The error names no upstream text.
    const echoed = await get(app, cookie, '/api/providers/mock-echo/models');
    expect(echoed.status).toBe(502);
    expect(errorCodeOf(echoed)).toBe('PROVIDER_UNAUTHORIZED');
    bodies.push(echoed.body);

    // (d) The connection test: a stored provider with the key, a stored provider that echoes, and a draft
    // with a test-only key that echoes.
    const stored = await post(app, cookie, CONNECTION_TEST_ROUTE, {
      providerId: 'mock-keyed',
    });
    expect(stored.status).toBe(200);
    const storedResult = JSON.parse(stored.body) as ConnectionTestResult;
    expect(storedResult).toMatchObject({ ok: true, stage: 'chat' });
    bodies.push(stored.body);

    const echoing = await post(app, cookie, CONNECTION_TEST_ROUTE, {
      providerId: 'mock-echo',
    });
    expect(echoing.status).toBe(200);
    const echoingResult = JSON.parse(echoing.body) as ConnectionTestResult;
    expect(echoingResult).toMatchObject({ ok: false, stage: 'list' });
    expect(echoingResult.error?.code).toBe('PROVIDER_UNAUTHORIZED');
    bodies.push(echoing.body);

    const draft = await post(app, cookie, CONNECTION_TEST_ROUTE, {
      draft: {
        kind: 'openai-compatible',
        baseURL: `${mock.baseUrl}/scenario/secrecy-echo/v1`,
        model: '',
        ...PROVIDER_DEFAULTS,
      },
      key: KEY,
    });
    expect(draft.status).toBe(200);
    const draftResult = JSON.parse(draft.body) as ConnectionTestResult;
    expect(draftResult).toMatchObject({ ok: false, stage: 'list' });
    bodies.push(draft.body);

    // (e) Refusals: a blank provider id is 400, and a draft with an invalid URL is a validation failure.
    const blank = await post(app, cookie, KEY_SET_ROUTE, {
      providerId: '',
      key: KEY,
    });
    expect(blank.status).toBe(400);
    bodies.push(blank.body);

    const invalid = await post(app, cookie, CONNECTION_TEST_ROUTE, {
      draft: {
        kind: 'openai-compatible',
        baseURL: 'not a url',
        model: '',
        ...PROVIDER_DEFAULTS,
      },
      key: KEY,
    });
    expect(invalid.status).toBe(400);
    expect(errorCodeOf(invalid)).toBe('PLATFORM_VALIDATION_FAILED');
    bodies.push(invalid.body);

    // (f) No reply body of (a) to (e) holds the key.
    for (const body of bodies) {
      expect(body).not.toContain(KEY);
    }

    // (g) settings.yaml holds no key. It holds the keyRef (control).
    const settings = readFileSync(settingsFilePath(library), 'utf8');
    expect(settings).not.toContain(KEY);
    expect(settings).toMatch(/^\s*keyRef:/m);

    // (h) Every record of the two scenarios: no header other than Authorization, and no JSON body, holds
    // the key. Each Authorization is the key or the keyless placeholder. At least one carries the key (control).
    const records = [
      ...(await recordsOf(mock, 'secrecy-ok')),
      ...(await recordsOf(mock, 'secrecy-echo')),
    ];
    expect(records.length).toBeGreaterThan(0);
    for (const record of records) {
      for (const [name, value] of Object.entries(record.headers)) {
        if (name !== 'authorization') {
          expect(value, `header ${name}`).not.toContain(KEY);
        }
      }
      expect(JSON.stringify(record.body)).not.toContain(KEY);
      expect([`Bearer ${KEY}`, KEYLESS_AUTHORIZATION]).toContain(
        record.headers.authorization,
      );
    }
    expect(
      records.some(
        (record) => record.headers.authorization === `Bearer ${KEY}`,
      ),
    ).toBe(true);

    // (i) Everything written to stdout, with the colour codes removed. Not empty (control).
    const output = stripAnsi(stdout.text());
    expect(output.length).toBeGreaterThan(0);
    expect(output).not.toContain(KEY);
  } finally {
    stdout.stop();
    await app?.close();
    await mock.close();
    rmSync(library, { recursive: true, force: true });
    rmSync(scenariosDir, { recursive: true, force: true });
  }
});

it('G3: a provider created through the API with a mock scenario URL in the harness form passes the connection test', async () => {
  const scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-mpr08-seam-'));
  writeScenarios(scenariosDir, {
    seam: {
      steps: [
        {
          match: { endpoint: 'models' },
          reply: {
            kind: 'status',
            status: 200,
            body: modelsOf(['seam-model']),
          },
        },
        {
          match: { endpoint: 'chat' },
          reply: { kind: 'stream', deltas: ['ok'] },
        },
      ],
    },
  });
  const mock: MockOpenAI = await startMockOpenAI({ scenariosDir });
  const library = makeLibrary();
  try {
    const app = await createTestApp({ libraryDir: library });
    try {
      const cookie = await sessionCookie(app, library);

      // (a) The create body in the harness form: the scenario's own base URL, the defaults, and a label.
      const created = await post(app, cookie, PROVIDERS_ROUTE, {
        label: 'Seam',
        kind: 'openai-compatible',
        baseURL: `${mock.baseUrl}/scenario/seam/v1`,
        model: '',
        ...PROVIDER_DEFAULTS,
      });
      expect(created.status).toBe(201);
      expect(JSON.parse(created.body)).toMatchObject({
        id: 'seam',
        keySet: false,
      });

      // (b) The connection test reaches the chat stage through the list stage.
      const tested = await post(app, cookie, CONNECTION_TEST_ROUTE, {
        providerId: 'seam',
      });
      expect(tested.status).toBe(200);
      const result = JSON.parse(tested.body) as ConnectionTestResult;
      expect(result).toMatchObject({ ok: true, stage: 'chat', modelCount: 1 });

      // (c) One chat call reached the mock, with the listed model and the one-token test limit.
      const chats = (await recordsOf(mock, 'seam')).filter(
        (record) => record.endpoint === 'chat',
      );
      expect(chats).toHaveLength(1);
      expect(chats[0]?.body).toMatchObject({
        model: 'seam-model',
        max_tokens: 1,
      });
    } finally {
      await app.close();
    }
  } finally {
    await mock.close();
    rmSync(library, { recursive: true, force: true });
    rmSync(scenariosDir, { recursive: true, force: true });
  }
});
