import { readFileSync, rmSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { stringify } from 'yaml';
import {
  EFFECTIVE_MODEL_ROUTE,
  PROVIDER_DEFAULTS,
  PROVIDER_ERROR_STATUS,
  PROVIDER_PRESETS,
  type ModelChoice,
  type OpenAICompatibleConfig,
} from '@bbartolome/scriba-contracts/providers';
import { COMPOSED_MODULES } from '../src/app.module';
import { collectStream, streamChat } from '../src/modules/providers/client';
import { isOllamaProvider } from '../src/modules/providers/providers.module';
import { createTestApp, type TestApp } from './create-test-app';
import { sessionCookie, type Reply } from './guard-request';
import {
  RESOLVE_TEST_PATH,
  ResolutionKitModule,
  getJson,
} from './providers-resolution.kit';
import {
  recordsOf,
  resetScenario,
  startMockOpenAI,
  type MockOpenAI,
} from './providers-client.kit';
import { makeLibrary, settingsFilePath } from './settings.kit';

const SCENARIOS = [
  'models-non-empty',
  'models-empty',
  'models-failing',
  'text-stream',
];

// The effective-model response (GET /api/providers/effective-model).
interface ResolveBody {
  choice: ModelChoice;
  source: string;
  contextSize: number;
  warning?: string;
}

// The test-only resolve route, which carries the stored config (criterion C4 only).
interface KitResolveBody {
  config: OpenAICompatibleConfig;
  model: string;
  contextSize: number;
  source: string;
  warning?: string;
}

interface ErrorBody {
  error: { code: string; message: string; details?: { hint?: string } };
}

let mock: MockOpenAI;

beforeAll(async () => {
  mock = await startMockOpenAI();
});

afterAll(async () => {
  await mock.close();
});

beforeEach(async () => {
  for (const scenario of SCENARIOS) {
    await resetScenario(mock, scenario);
  }
});

// A keyless provider whose base URL is one scenario of the mock.
function mockProvider(
  id: string,
  scenario: string,
  model: string,
): OpenAICompatibleConfig {
  return {
    id,
    kind: 'openai-compatible',
    baseURL: `${mock.baseUrl}/scenario/${scenario}/v1`,
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

// The Ollama preset's pull line: the hint that names `ollama pull`.
function presetPullLine(): string {
  const line = PROVIDER_PRESETS.find(
    (preset) => preset.id === 'ollama',
  )?.hints.find((hint) => hint.includes('ollama pull'));
  if (line === undefined) {
    throw new Error('The Ollama preset has no pull line.');
  }
  return line;
}

// Makes a library with the given settings.yaml, runs the callback, and removes the library.
async function withLibrary(
  text: string,
  run: (library: string) => Promise<void>,
): Promise<void> {
  const library = makeLibrary(text);
  try {
    await run(library);
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
}

// Boots the composed app with the resolution kit on the library, runs the callback with a session cookie,
// and closes the app.
async function withApp(
  library: string,
  run: (app: TestApp, cookie: string) => Promise<void>,
): Promise<void> {
  const app = await createTestApp({
    libraryDir: library,
    modules: [...COMPOSED_MODULES, ResolutionKitModule],
  });
  try {
    const cookie = await sessionCookie(app, library);
    await run(app, cookie);
  } finally {
    await app.close();
  }
}

async function resolveBody(
  app: TestApp,
  cookie: string,
  query = '',
): Promise<ResolveBody> {
  const reply = await getJson(app, cookie, `${EFFECTIVE_MODEL_ROUTE}${query}`);
  expect(reply.status).toBe(200);
  return JSON.parse(reply.body) as ResolveBody;
}

function errorOf(reply: Reply): ErrorBody['error'] {
  return (JSON.parse(reply.body) as ErrorBody).error;
}

it('C1: an empty app-default model and an empty provider model resolve to the first listed model as auto, and settings.yaml does not change', async () => {
  await withLibrary(
    settingsWith([mockProvider('mock', 'models-non-empty', '')], {
      providerId: 'mock',
      model: '',
    }),
    async (library) => {
      await withApp(library, async (app, cookie) => {
        const before = readFileSync(settingsFilePath(library), 'utf8');
        const body = await resolveBody(app, cookie);
        expect(body.choice.model).toBe('qwen2.5');
        expect(body.source).toBe('auto');
        expect(body.contextSize).toBe(64000);
        expect(body.choice.providerId).toBe('mock');
        const after = readFileSync(settingsFilePath(library), 'utf8');
        expect(after).toBe(before);
        expect(after).not.toContain('auto');
      });
      const records = await recordsOf(mock, 'models-non-empty');
      expect(records.map((record) => record.endpoint)).toEqual(['models']);
    },
  );
});

it("C2: a provider model wins over auto, and the app default's model wins over the provider's", async () => {
  // (i) The app default has no model, so the provider's model applies and no listing runs.
  await withLibrary(
    settingsWith([mockProvider('mock', 'models-non-empty', 'llama3.1')], {
      providerId: 'mock',
      model: '',
    }),
    async (library) => {
      await withApp(library, async (app, cookie) => {
        const body = await resolveBody(app, cookie);
        expect(body.choice.model).toBe('llama3.1');
        expect(body.source).toBe('app');
      });
      expect(await recordsOf(mock, 'models-non-empty')).toEqual([]);
    },
  );

  await resetScenario(mock, 'models-non-empty');

  // (ii) The app default's model wins over the provider's model.
  await withLibrary(
    settingsWith([mockProvider('mock', 'models-non-empty', 'llama3.1')], {
      providerId: 'mock',
      model: 'gemma3',
    }),
    async (library) => {
      await withApp(library, async (app, cookie) => {
        const body = await resolveBody(app, cookie);
        expect(body.choice.model).toBe('gemma3');
        expect(body.source).toBe('app');
      });
      expect(await recordsOf(mock, 'models-non-empty')).toEqual([]);
    },
  );
});

it('C3: an empty Ollama model list gives PROVIDER_NOT_CONFIGURED with the pull hint', async () => {
  await withLibrary(
    settingsWith([mockProvider('ollama', 'models-empty', '')], {
      providerId: 'ollama',
      model: '',
    }),
    async (library) => {
      await withApp(library, async (app, cookie) => {
        const reply = await getJson(app, cookie, EFFECTIVE_MODEL_ROUTE);
        expect(reply.status).toBe(
          PROVIDER_ERROR_STATUS.PROVIDER_NOT_CONFIGURED,
        );
        const error = errorOf(reply);
        expect(error.code).toBe('PROVIDER_NOT_CONFIGURED');
        expect(error.details).toEqual({ hint: presetPullLine() });
      });
      const records = await recordsOf(mock, 'models-empty');
      expect(records.map((record) => record.endpoint)).toEqual(['models']);
    },
  );
});

it('C4: a chat whose target comes from resolving a project id sends the resolved model in the body', async () => {
  await withLibrary(
    settingsWith([mockProvider('mock', 'text-stream', 'llama3.1')], {
      providerId: 'mock',
      model: 'gemma3',
    }),
    async (library) => {
      await withApp(library, async (app, cookie) => {
        const reply = await getJson(
          app,
          cookie,
          `${RESOLVE_TEST_PATH}?projectId=p-1`,
        );
        expect(reply.status).toBe(200);
        const body = JSON.parse(reply.body) as KitResolveBody;
        expect(body.model).toBe('gemma3');
        const stream = streamChat(
          { config: body.config, model: body.model },
          { messages: [{ role: 'user', content: 'hi' }] },
        );
        const collected = await collectStream(stream);
        expect(collected.text).toBe('Hello world');
      });
      const records = await recordsOf(mock, 'text-stream');
      expect(records.map((record) => record.endpoint)).toEqual(['chat']);
      expect(records[0]?.body).toMatchObject({ model: 'gemma3' });
    },
  );
});

it('E1: with no app default, or an app default naming a missing provider, resolution gives PROVIDER_NOT_CONFIGURED and sends no request', async () => {
  // (a) The app default is null.
  await withLibrary(
    settingsWith([mockProvider('mock', 'models-non-empty', '')], null),
    async (library) => {
      await withApp(library, async (app, cookie) => {
        const reply = await getJson(app, cookie, EFFECTIVE_MODEL_ROUTE);
        expect(reply.status).toBe(
          PROVIDER_ERROR_STATUS.PROVIDER_NOT_CONFIGURED,
        );
        expect(errorOf(reply).code).toBe('PROVIDER_NOT_CONFIGURED');
      });
      expect(await recordsOf(mock, 'models-non-empty')).toEqual([]);
    },
  );

  await resetScenario(mock, 'models-non-empty');

  // (b) The app default names a provider that is not in the list.
  await withLibrary(
    settingsWith([mockProvider('mock', 'models-non-empty', '')], {
      providerId: 'ghost',
      model: '',
    }),
    async (library) => {
      await withApp(library, async (app, cookie) => {
        const reply = await getJson(app, cookie, EFFECTIVE_MODEL_ROUTE);
        expect(reply.status).toBe(
          PROVIDER_ERROR_STATUS.PROVIDER_NOT_CONFIGURED,
        );
        expect(errorOf(reply).code).toBe('PROVIDER_NOT_CONFIGURED');
      });
      expect(await recordsOf(mock, 'models-non-empty')).toEqual([]);
    },
  );
});

it('E2: the model list is sorted, a rejected list is a coded 502, and an unknown provider is 404', async () => {
  await withLibrary(
    settingsWith(
      [
        mockProvider('mock', 'models-non-empty', ''),
        mockProvider('mock-failing', 'models-failing', ''),
      ],
      { providerId: 'mock', model: '' },
    ),
    async (library) => {
      await withApp(library, async (app, cookie) => {
        const before = readFileSync(settingsFilePath(library), 'utf8');

        const listed = await getJson(app, cookie, '/api/providers/mock/models');
        expect(listed.status).toBe(200);
        expect(JSON.parse(listed.body)).toEqual({
          models: ['gemma3', 'llama3.1', 'qwen2.5'],
        });

        const rejected = await getJson(
          app,
          cookie,
          '/api/providers/mock-failing/models',
        );
        expect(rejected.status).toBe(502);
        expect(errorOf(rejected).code).toBe('PROVIDER_UNAUTHORIZED');

        const unknown = await getJson(
          app,
          cookie,
          '/api/providers/no-such-provider/models',
        );
        expect(unknown.status).toBe(404);
        expect(errorOf(unknown).code).toBe('PROVIDER_NOT_FOUND');

        expect(readFileSync(settingsFilePath(library), 'utf8')).toBe(before);
      });
      const rejectedRecords = await recordsOf(mock, 'models-failing');
      expect(rejectedRecords.map((record) => record.endpoint)).toEqual([
        'models',
      ]);
    },
  );
});

it('E3: the pull hint goes only to Ollama, by port 11434 or by an id that starts with ollama', async () => {
  // Route, negative: a provider that is not Ollama gets no hint.
  await withLibrary(
    settingsWith([mockProvider('lm-studio', 'models-empty', '')], {
      providerId: 'lm-studio',
      model: '',
    }),
    async (library) => {
      await withApp(library, async (app, cookie) => {
        const reply = await getJson(app, cookie, EFFECTIVE_MODEL_ROUTE);
        expect(reply.status).toBe(
          PROVIDER_ERROR_STATUS.PROVIDER_NOT_CONFIGURED,
        );
        const error = errorOf(reply);
        expect(error.code).toBe('PROVIDER_NOT_CONFIGURED');
        expect(error.details).toBeUndefined();
      });
    },
  );

  // Function output: the port form, the id form, and a non-Ollama provider.
  expect(
    isOllamaProvider({
      id: 'local-llm',
      baseURL: 'http://host.docker.internal:11434/v1',
    }),
  ).toBe(true);
  expect(
    isOllamaProvider({
      id: 'ollama-lab',
      baseURL: 'http://127.0.0.1:1234/v1',
    }),
  ).toBe(true);
  expect(
    isOllamaProvider({
      id: 'lm-studio',
      baseURL: 'http://host.docker.internal:1234/v1',
    }),
  ).toBe(false);
});
