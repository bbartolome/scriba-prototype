import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import {
  CONNECTION_TEST_ROUTE,
  KEY_SET_ROUTE,
  PROVIDER_DEFAULTS,
  PROVIDERS_ROUTE,
  connectionTestResultSchema,
  type ConnectionTestResult,
  type ModelChoice,
  type OpenAICompatibleConfig,
} from '@bbartolome/scriba-contracts/providers';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from './invariant-sweep';
import {
  recordsOf,
  resetScenario,
  startMockOpenAI,
  type MockOpenAI,
  type MockOpenAIRecord,
} from './providers-client.kit';
import { captureStdout, secretsFile } from './secrets.kit';
import { makeLibrary, settingsFilePath } from './settings.kit';

const KEY = 'sk-test-abcdefgh1234WXYZ';
const KEY_TEST = 'sk-test-testonly5678QRST';

// The hints of the test's table (MPR-07 plan, section 1b, D5), exact text.
const H1 =
  'Is Ollama running on the host, and listening on all interfaces? On Linux, start it with OLLAMA_HOST=0.0.0.0. Outside Docker, try http://localhost:11434/v1 as the base URL.';
const H2 =
  'The server could not be reached. Check the base URL and that the server is running.';
const H3 =
  'The provider did not answer in time. Check the base URL and the timeout setting.';
const H4 =
  'The provider rejected the key. Check the key. If the key is right, the account may be out of credit.';
const H6 =
  "The provider's answer was not usable. Check the base URL. A hosted account that is out of credit may get this answer too.";
const H7 =
  'The provider refused the request: rate limited, or out of credit. Wait, or add credit.';
const H8 = 'The provider does not know this model. Pick one from the list.';
const H9 = 'Pull a model on the host with `ollama pull <model>`.';
const H10 = 'The provider lists no models. Check the model id.';
const H11 = 'Set a model id for this provider.';

const LISTED_IDS = ['qwen2.5', 'gemma3', 'llama3.1'];

// The seven scenarios of the `listed` mock, written to a temp directory in beforeAll.
const LISTED_SCENARIOS = [
  'listed-chat-ok',
  'listed-unknown-model',
  'empty-unknown-model',
  'models-html',
  'listed-chat-402',
  'listed-chat-429',
  'listed-models-delayed',
] as const;

const BUNDLED = resolve(
  __dirname,
  '../../../e2e/fixtures/mock-openai/scenarios',
);

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

let mock: MockOpenAI;
let listedMock: MockOpenAI;
let scenariosDir: string;

// The reply body of the first step of a bundled scenario.
function bundledBody(name: string): unknown {
  const text = readFileSync(join(BUNDLED, `${name}.json`), 'utf8');
  const data = JSON.parse(text) as { steps: { reply: { body: unknown } }[] };
  return data.steps[0]?.reply.body;
}

function modelsStep(): Record<string, unknown> {
  return {
    match: { endpoint: 'models' },
    reply: {
      kind: 'status',
      status: 200,
      body: {
        object: 'list',
        data: LISTED_IDS.map((id) => ({
          id,
          object: 'model',
          owned_by: 'scriba-mock',
        })),
      },
    },
  };
}

function emptyModelsStep(): Record<string, unknown> {
  return {
    match: { endpoint: 'models' },
    reply: { kind: 'status', status: 200, body: { object: 'list', data: [] } },
  };
}

function chatStatusStep(
  status: number,
  body: unknown,
): Record<string, unknown> {
  return {
    match: { endpoint: 'chat' },
    reply: { kind: 'status', status, body },
  };
}

// The scenario files the `listed` mock serves. Every file is {steps: [...]}, as the mock reads them.
function scenarioFiles(): Record<string, { steps: Record<string, unknown>[] }> {
  const unknownModelBody = bundledBody('unknown-model');
  return {
    'listed-chat-ok': {
      steps: [
        modelsStep(),
        {
          match: { endpoint: 'chat' },
          reply: { kind: 'stream', deltas: ['ok'] },
        },
      ],
    },
    'listed-unknown-model': {
      steps: [modelsStep(), chatStatusStep(404, unknownModelBody)],
    },
    'empty-unknown-model': {
      steps: [emptyModelsStep(), chatStatusStep(404, unknownModelBody)],
    },
    'models-html': {
      steps: [
        {
          match: { endpoint: 'models' },
          reply: {
            kind: 'status',
            status: 200,
            headers: { 'content-type': 'text/html' },
            body: bundledBody('html-200'),
          },
        },
      ],
    },
    'listed-chat-402': {
      steps: [
        modelsStep(),
        chatStatusStep(402, {
          error: {
            message: 'You exceeded your current quota.',
            type: 'insufficient_quota',
            code: 'insufficient_quota',
          },
        }),
      ],
    },
    'listed-chat-429': {
      steps: [
        modelsStep(),
        chatStatusStep(429, {
          error: {
            message: 'Rate limit reached.',
            type: 'requests',
            code: 'rate_limit_exceeded',
          },
        }),
      ],
    },
    'listed-models-delayed': {
      steps: [{ ...modelsStep(), delayMs: 2000 }],
    },
  };
}

function writeScenarios(directory: string): void {
  for (const [name, file] of Object.entries(scenarioFiles())) {
    writeFileSync(join(directory, `${name}.json`), JSON.stringify(file));
  }
}

beforeAll(async () => {
  mock = await startMockOpenAI();
  scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-mpr07-'));
  writeScenarios(scenariosDir);
  listedMock = await startMockOpenAI({ scenariosDir });
});

afterAll(async () => {
  await listedMock.close();
  await mock.close();
  rmSync(scenariosDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await resetScenario(mock, 'models-failing');
  for (const name of LISTED_SCENARIOS) {
    await resetScenario(listedMock, name);
  }
});

// The base URL of one `listed` scenario, with the /v1 suffix the client adds its paths to.
function listedAt(scenario: string): string {
  return `${listedMock.baseUrl}/scenario/${scenario}/v1`;
}

// A base URL whose server has been started and closed, so a connection to it is refused (D9).
async function closedBaseUrl(): Promise<string> {
  const gone = await startMockOpenAI({ scenariosDir });
  const baseURL = `${gone.baseUrl}/scenario/listed-chat-ok/v1`;
  await gone.close();
  return baseURL;
}

// A keyless provider with the defaults of PROVIDER_DEFAULTS, and the model given (empty by default).
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

function settingsOf(library: string): {
  providers: { list: Record<string, unknown>[] };
} {
  return parse(readFileSync(settingsFilePath(library), 'utf8')) as {
    providers: { list: Record<string, unknown>[] };
  };
}

function keysOf(library: string): Record<string, string> {
  const doc = parse(readFileSync(secretsFile(library), 'utf8')) as {
    keys: Record<string, string>;
  };
  return doc.keys;
}

function errorOf(reply: Reply): ErrorBody['error'] {
  return (JSON.parse(reply.body) as ErrorBody).error;
}

// The result of a 200 test. The body must parse with the contract's result schema.
function resultOf(reply: Reply): ConnectionTestResult {
  return connectionTestResultSchema.parse(JSON.parse(reply.body));
}

function get(app: TestApp, cookie: string, path: string): Promise<Reply> {
  return send(app.baseUrl, { host: LOOPBACK_HOST, cookie, path });
}

// A POST with the loopback Origin, as the guard requires for a mutation.
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

function testConnection(
  app: TestApp,
  cookie: string,
  body: unknown,
): Promise<Reply> {
  return post(app, cookie, CONNECTION_TEST_ROUTE, body);
}

// Makes a library with the given settings.yaml (or the seeded one), boots the composed app on it, runs the
// callback with a session cookie, and removes the library.
async function withApp(
  settingsText: string | undefined,
  run: (app: TestApp, cookie: string, library: string) => Promise<void>,
): Promise<void> {
  const library = makeLibrary(settingsText);
  try {
    const app = await createTestApp({ libraryDir: library });
    try {
      const cookie = await sessionCookie(app, library);
      await run(app, cookie, library);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
}

// The chat records and the models records of one scenario, in arrival order.
async function chatRecords(
  server: MockOpenAI,
  scenario: string,
): Promise<MockOpenAIRecord[]> {
  const records = await recordsOf(server, scenario);
  return records.filter((record) => record.endpoint === 'chat');
}

async function modelsRecords(
  server: MockOpenAI,
  scenario: string,
): Promise<MockOpenAIRecord[]> {
  const records = await recordsOf(server, scenario);
  return records.filter((record) => record.endpoint === 'models');
}

it('C1: against the mock, an unreachable Ollama fails at reach with the Ollama hint, a 401 fails at list with the key hint, an unknown model fails at chat, and a listed model succeeds with ok, latencyMs and modelCount', async () => {
  const down = await closedBaseUrl();
  await withApp(
    settingsWith(
      [
        keyless('ollama', down),
        keyless('mock-401', `${mock.baseUrl}/scenario/models-failing/v1`),
        keyless(
          'mock-listed-missing',
          listedAt('listed-unknown-model'),
          'missing-model',
        ),
        keyless('mock-listed', listedAt('listed-chat-ok')),
      ],
      null,
    ),
    async (app, cookie) => {
      // (a) an unreachable Ollama fails at reach with the Ollama hint.
      const unreachable = await testConnection(app, cookie, {
        providerId: 'ollama',
      });
      expect(unreachable.status).toBe(200);
      expect(resultOf(unreachable)).toMatchObject({
        ok: false,
        stage: 'reach',
        error: { code: 'PROVIDER_UNREACHABLE', hint: H1 },
      });

      // (b) a 401 fails at list with the key hint, and no chat request is made.
      const denied = await testConnection(app, cookie, {
        providerId: 'mock-401',
      });
      expect(denied.status).toBe(200);
      const deniedResult = resultOf(denied);
      expect(deniedResult).toMatchObject({
        ok: false,
        stage: 'list',
        error: { code: 'PROVIDER_UNAUTHORIZED', hint: H4 },
      });
      expect(deniedResult.modelCount).toBeUndefined();
      expect(await chatRecords(mock, 'models-failing')).toHaveLength(0);

      // (c) an unknown model fails at chat, after the list stage counted three models.
      const missing = await testConnection(app, cookie, {
        providerId: 'mock-listed-missing',
      });
      expect(missing.status).toBe(200);
      expect(resultOf(missing)).toMatchObject({
        ok: false,
        stage: 'chat',
        modelCount: 3,
        error: { code: 'PROVIDER_MODEL_NOT_FOUND', hint: H8 },
      });

      // (d) a listed model succeeds with ok, latencyMs and modelCount. The chat uses the first listed id.
      const listed = await testConnection(app, cookie, {
        providerId: 'mock-listed',
      });
      expect(listed.status).toBe(200);
      const listedResult = resultOf(listed);
      expect(listedResult).toMatchObject({
        ok: true,
        stage: 'chat',
        modelCount: 3,
      });
      expect(Number.isInteger(listedResult.latencyMs)).toBe(true);
      expect(listedResult.latencyMs).toBeGreaterThanOrEqual(0);
      const chat = await chatRecords(listedMock, 'listed-chat-ok');
      expect(chat).toHaveLength(1);
      const sent = chat[0]?.body as { model: string; max_tokens: number };
      expect(sent.model).toBe('qwen2.5');
      expect(sent.max_tokens).toBe(1);
    },
  );
});

it('C2: a draft with a test-only key is tested with that key, and settings.yaml and secrets.yaml keep their bytes', async () => {
  await withApp(undefined, async (app, cookie, library) => {
    const settingsBefore = readFileSync(settingsFilePath(library), 'utf8');
    const secretsBefore = readFileSync(secretsFile(library), 'utf8');
    const providersBefore = await get(app, cookie, PROVIDERS_ROUTE);

    const draft = {
      kind: 'openai-compatible',
      baseURL: listedAt('listed-chat-ok'),
      model: '',
      ...PROVIDER_DEFAULTS,
    };
    const stdout = captureStdout();
    let reply: Reply;
    try {
      reply = await testConnection(app, cookie, { draft, key: KEY_TEST });
    } finally {
      stdout.stop();
    }

    expect(reply.status).toBe(200);
    expect(resultOf(reply).ok).toBe(true);

    // The files keep their bytes, and the provider list is the same.
    expect(readFileSync(settingsFilePath(library), 'utf8')).toBe(
      settingsBefore,
    );
    expect(readFileSync(secretsFile(library), 'utf8')).toBe(secretsBefore);
    const providersAfter = await get(app, cookie, PROVIDERS_ROUTE);
    expect(JSON.parse(providersAfter.body)).toEqual(
      JSON.parse(providersBefore.body),
    );

    // The list call is the only models request, and it carries the test-only key.
    const models = await modelsRecords(listedMock, 'listed-chat-ok');
    expect(models).toHaveLength(1);
    expect(models[0]?.headers.authorization).toBe(`Bearer ${KEY_TEST}`);

    expect(reply.body).not.toContain(KEY_TEST);
    expect(stdout.text()).not.toContain(KEY_TEST);
  });
});

it('E1: a test-only key for a saved provider replaces its stored key for that test only', async () => {
  await withApp(
    settingsWith([keyless('mock-keyed', listedAt('listed-chat-ok'))], null),
    async (app, cookie, library) => {
      const set = await post(app, cookie, KEY_SET_ROUTE, {
        providerId: 'mock-keyed',
        key: KEY,
      });
      expect(set.status).toBe(200);
      const keyRef = settingsOf(library).providers.list[0]?.keyRef as string;
      const settingsBefore = readFileSync(settingsFilePath(library), 'utf8');
      const secretsBefore = readFileSync(secretsFile(library), 'utf8');

      const stdout = captureStdout();
      let first: Reply;
      let second: Reply;
      let lastModelsAfterFirst: MockOpenAIRecord | undefined;
      let lastModelsAfterSecond: MockOpenAIRecord | undefined;
      try {
        first = await testConnection(app, cookie, {
          providerId: 'mock-keyed',
          key: KEY_TEST,
        });
        lastModelsAfterFirst = (
          await modelsRecords(listedMock, 'listed-chat-ok')
        ).at(-1);
        second = await testConnection(app, cookie, {
          providerId: 'mock-keyed',
        });
        lastModelsAfterSecond = (
          await modelsRecords(listedMock, 'listed-chat-ok')
        ).at(-1);
      } finally {
        stdout.stop();
      }

      // The first call's list request carries the test-only key, and the second carries the stored key.
      expect(lastModelsAfterFirst?.headers.authorization).toBe(
        `Bearer ${KEY_TEST}`,
      );
      expect(lastModelsAfterSecond?.headers.authorization).toBe(
        `Bearer ${KEY}`,
      );

      // Both calls leave the files as they were, and the stored key is still there.
      expect(readFileSync(settingsFilePath(library), 'utf8')).toBe(
        settingsBefore,
      );
      expect(readFileSync(secretsFile(library), 'utf8')).toBe(secretsBefore);
      expect(keysOf(library)[keyRef]).toBe(KEY);

      // No response body and no stdout line carries the stored key.
      expect(first.body).not.toContain(KEY);
      expect(second.body).not.toContain(KEY);
      expect(stdout.text()).not.toContain(KEY);
    },
  );
});

it('E2: an unreachable provider that is not Ollama gets the generic reach hint and no Ollama text', async () => {
  const down = await closedBaseUrl();
  await withApp(
    settingsWith([keyless('mock-down', down)], null),
    async (app, cookie) => {
      const reply = await testConnection(app, cookie, {
        providerId: 'mock-down',
      });
      expect(reply.status).toBe(200);
      const result = resultOf(reply);
      expect(result).toMatchObject({
        ok: false,
        stage: 'reach',
        error: { code: 'PROVIDER_UNREACHABLE', hint: H2 },
      });
      expect(result.error?.hint).not.toContain('Ollama');
    },
  );
});

it('E3: an empty list gives the pull hint for Ollama at chat, and no pull hint for a provider that is not Ollama', async () => {
  const empty = listedAt('empty-unknown-model');
  await withApp(
    settingsWith(
      [
        keyless('ollama-empty', empty, 'missing-model'),
        keyless('ollama-blank', empty),
        keyless('plain-empty', empty, 'missing-model'),
        keyless('plain-blank', empty),
      ],
      null,
    ),
    async (app, cookie) => {
      // Ollama with a model id the empty list does not have: the chat is refused by the server.
      const ollamaEmpty = await testConnection(app, cookie, {
        providerId: 'ollama-empty',
      });
      expect(ollamaEmpty.status).toBe(200);
      expect(resultOf(ollamaEmpty)).toMatchObject({
        ok: false,
        stage: 'chat',
        modelCount: 0,
        error: { code: 'PROVIDER_MODEL_NOT_FOUND', hint: H9 },
      });
      const afterOllamaEmpty = (
        await chatRecords(listedMock, 'empty-unknown-model')
      ).length;
      expect(afterOllamaEmpty).toBe(1);

      // Ollama with no model id: refused before any request, so no chat record is added.
      const ollamaBlank = await testConnection(app, cookie, {
        providerId: 'ollama-blank',
      });
      expect(ollamaBlank.status).toBe(200);
      expect(resultOf(ollamaBlank)).toMatchObject({
        ok: false,
        stage: 'chat',
        modelCount: 0,
        error: { code: 'PROVIDER_NOT_CONFIGURED', hint: H9 },
      });
      expect(
        (await chatRecords(listedMock, 'empty-unknown-model')).length,
      ).toBe(afterOllamaEmpty);

      // A provider that is not Ollama gets the model-id hint, with no pull text.
      const plainEmpty = await testConnection(app, cookie, {
        providerId: 'plain-empty',
      });
      expect(plainEmpty.status).toBe(200);
      const plainEmptyResult = resultOf(plainEmpty);
      expect(plainEmptyResult).toMatchObject({
        ok: false,
        stage: 'chat',
        modelCount: 0,
        error: { code: 'PROVIDER_MODEL_NOT_FOUND', hint: H10 },
      });
      expect(plainEmptyResult.error?.hint).not.toContain('ollama');
      const afterPlainEmpty = (
        await chatRecords(listedMock, 'empty-unknown-model')
      ).length;
      expect(afterPlainEmpty).toBe(afterOllamaEmpty + 1);

      // A provider that is not Ollama and has no model id: refused before any request.
      const plainBlank = await testConnection(app, cookie, {
        providerId: 'plain-blank',
      });
      expect(plainBlank.status).toBe(200);
      expect(resultOf(plainBlank)).toMatchObject({
        ok: false,
        stage: 'chat',
        modelCount: 0,
        error: { code: 'PROVIDER_NOT_CONFIGURED', hint: H11 },
      });
      expect(
        (await chatRecords(listedMock, 'empty-unknown-model')).length,
      ).toBe(afterPlainEmpty);
    },
  );
});

it('E4: bodies that fail the schema or name no provider are refused, and no mock is reached', async () => {
  await withApp(undefined, async (app, cookie) => {
    const draft = {
      kind: 'openai-compatible',
      baseURL: 'not a url',
      model: '',
      ...PROVIDER_DEFAULTS,
    };

    // (i) an invalid draft with a test-only key is a validation failure, and the key is not echoed.
    const badDraft = await testConnection(app, cookie, {
      draft,
      key: KEY_TEST,
    });
    expect(badDraft.status).toBe(400);
    expect(errorOf(badDraft).code).toBe('PLATFORM_VALIDATION_FAILED');
    expect(badDraft.body).not.toContain(KEY_TEST);

    // (ii) an unknown saved id is not found.
    const ghost = await testConnection(app, cookie, { providerId: 'ghost' });
    expect(ghost.status).toBe(404);
    expect(errorOf(ghost).code).toBe('PROVIDER_NOT_FOUND');

    // (iii) both forms at once.
    const both = await testConnection(app, cookie, {
      providerId: 'ollama',
      draft: { ...draft, baseURL: listedAt('listed-chat-ok') },
    });
    expect(both.status).toBe(400);

    // (iv) the sweep's body, which matches neither form.
    const sweep = await testConnection(app, cookie, {
      count: 1,
      intervalMs: 0,
    });
    expect(sweep.status).toBe(400);

    for (const scenario of LISTED_SCENARIOS) {
      expect(await recordsOf(listedMock, scenario)).toHaveLength(0);
    }
  });
});

it('E5: a 200 reply that is not a model list fails at list with the bad-response hint', async () => {
  await withApp(
    settingsWith([keyless('mock-html', listedAt('models-html'))], null),
    async (app, cookie) => {
      const reply = await testConnection(app, cookie, {
        providerId: 'mock-html',
      });
      expect(reply.status).toBe(200);
      const result = resultOf(reply);
      expect(result).toMatchObject({
        ok: false,
        stage: 'list',
        error: { code: 'PROVIDER_BAD_RESPONSE', hint: H6 },
      });
      expect(result.modelCount).toBeUndefined();
    },
  );
});

it('E6: a chat 402 fails at chat with BAD_RESPONSE and the credit hint', async () => {
  await withApp(
    settingsWith([keyless('mock-chat-402', listedAt('listed-chat-402'))], null),
    async (app, cookie) => {
      const reply = await testConnection(app, cookie, {
        providerId: 'mock-chat-402',
      });
      expect(reply.status).toBe(200);
      expect(resultOf(reply)).toMatchObject({
        ok: false,
        stage: 'chat',
        modelCount: 3,
        error: { code: 'PROVIDER_BAD_RESPONSE', hint: H6 },
      });
      expect(await chatRecords(listedMock, 'listed-chat-402')).toHaveLength(1);
    },
  );
});

it('E7: a chat 429 with retries 0 fails at chat with RATE_LIMITED and the rate-limit hint', async () => {
  await withApp(
    settingsWith([keyless('mock-chat-429', listedAt('listed-chat-429'))], null),
    async (app, cookie) => {
      const reply = await testConnection(app, cookie, {
        providerId: 'mock-chat-429',
      });
      expect(reply.status).toBe(200);
      expect(resultOf(reply)).toMatchObject({
        ok: false,
        stage: 'chat',
        modelCount: 3,
        error: { code: 'PROVIDER_RATE_LIMITED', hint: H7 },
      });
      expect(await chatRecords(listedMock, 'listed-chat-429')).toHaveLength(1);
    },
  );
});

it('E8: a models step delayed past a 300 ms timeout fails at reach with TIMEOUT and the timeout hint', async () => {
  await withApp(
    settingsWith(
      [
        {
          ...keyless('mock-slow', listedAt('listed-models-delayed')),
          timeout: 300,
        },
      ],
      null,
    ),
    async (app, cookie) => {
      const reply = await testConnection(app, cookie, {
        providerId: 'mock-slow',
      });
      expect(reply.status).toBe(200);
      const result = resultOf(reply);
      expect(result).toMatchObject({
        ok: false,
        stage: 'reach',
        error: { code: 'PROVIDER_TIMEOUT', hint: H3 },
      });
      expect(result.modelCount).toBeUndefined();

      const records = await recordsOf(listedMock, 'listed-models-delayed');
      expect(records.filter((r) => r.endpoint === 'models')).toHaveLength(1);
      expect(records.filter((r) => r.endpoint === 'chat')).toHaveLength(0);
    },
  );
});
