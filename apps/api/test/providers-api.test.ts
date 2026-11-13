import { readFileSync, rmSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import {
  APP_DEFAULT_ROUTE,
  EFFECTIVE_MODEL_ROUTE,
  KEY_CLEAR_ROUTE,
  KEY_SET_ROUTE,
  PRESETS_ROUTE,
  PROVIDER_DEFAULTS,
  PROVIDER_PRESETS,
  PROVIDERS_EXAMPLES,
  PROVIDERS_ROUTE,
  type ModelChoice,
  type OpenAICompatibleConfig,
} from '@bbartolome/scriba-contracts/providers';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import {
  LOOPBACK_HOST,
  LOOPBACK_ORIGIN,
  snapshotLibrary,
} from './invariant-sweep';
import {
  recordsOf,
  resetScenario,
  startMockOpenAI,
  type MockOpenAI,
} from './providers-client.kit';
import {
  captureStdout,
  modeOf,
  scribaFolder,
  secretsFile,
  stripAnsi,
} from './secrets.kit';
import { makeLibrary, settingsFilePath } from './settings.kit';

const KEY = 'sk-test-abcdefgh1234WXYZ';
const OLLAMA_URL = 'http://host.docker.internal:11434/v1';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

interface SettingsDoc {
  providers: {
    list: Record<string, unknown>[];
    appDefault: ModelChoice | null;
  };
}

let mock: MockOpenAI;

beforeAll(async () => {
  mock = await startMockOpenAI();
});

afterAll(async () => {
  await mock.close();
});

beforeEach(async () => {
  await resetScenario(mock, 'models-non-empty');
});

// A keyless provider with the defaults of PROVIDER_DEFAULTS.
function keyless(id: string, baseURL: string): OpenAICompatibleConfig {
  return {
    id,
    kind: 'openai-compatible',
    baseURL,
    model: '',
    ...PROVIDER_DEFAULTS,
  };
}

// A provider whose base URL is the mock's models scenario, so a listing reaches the mock.
function mockKeyed(): OpenAICompatibleConfig {
  return {
    ...keyless('mock-keyed', `${mock.baseUrl}/scenario/models-non-empty/v1`),
    model: 'llama3.1',
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

function settingsOf(library: string): SettingsDoc {
  return parse(readFileSync(settingsFilePath(library), 'utf8')) as SettingsDoc;
}

function keyRefOf(library: string, id: string): string | undefined {
  const entry = settingsOf(library).providers.list.find(
    (provider) => provider.id === id,
  );
  return entry?.keyRef as string | undefined;
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

// The setup of criterion 4 and test E4: mock-keyed is the app default, and KEY is set through the API.
async function withKeyedMock(
  run: (app: TestApp, cookie: string, library: string) => Promise<void>,
): Promise<void> {
  await withApp(
    settingsWith([keyless('ollama', OLLAMA_URL), mockKeyed()], {
      providerId: 'mock-keyed',
      model: 'llama3.1',
    }),
    async (app, cookie, library) => {
      const set = await post(app, cookie, KEY_SET_ROUTE, {
        providerId: 'mock-keyed',
        key: KEY,
      });
      expect(set.status).toBe(200);
      await run(app, cookie, library);
    },
  );
}

it('C1: a key set through the API is stored at 0600 in a 0700 folder, settings.yaml holds only its keyRef, and no response, stdout line or error body contains it', async () => {
  const library = makeLibrary(
    settingsWith([keyless('ollama', OLLAMA_URL), mockKeyed()], {
      providerId: 'mock-keyed',
      model: 'llama3.1',
    }),
  );
  const stdout = captureStdout();
  try {
    const app = await createTestApp({ libraryDir: library });
    try {
      const cookie = await sessionCookie(app, library);

      // (a) The set answers with the read view: keySet and the last four characters.
      const set = await post(app, cookie, KEY_SET_ROUTE, {
        providerId: 'mock-keyed',
        key: KEY,
      });
      expect(set.status).toBe(200);
      expect(JSON.parse(set.body)).toMatchObject({
        id: 'mock-keyed',
        keySet: true,
        keyHint: 'WXYZ',
      });

      // (b) The modes, and the key under the reference that settings names.
      expect(modeOf(scribaFolder(library))).toBe(0o700);
      expect(modeOf(secretsFile(library))).toBe(0o600);
      const keyRef = keyRefOf(library, 'mock-keyed');
      expect(keyRef).toBeDefined();
      expect(keysOf(library)).toEqual({ [keyRef as string]: KEY });

      // (c) settings.yaml holds the reference and not the key.
      const text = readFileSync(settingsFilePath(library), 'utf8');
      expect(text).not.toContain(KEY);
      expect(text).toContain(keyRef as string);

      // (d) Every GET, and the mock's record of the listing.
      const list = await get(app, cookie, PROVIDERS_ROUTE);
      expect(list.status).toBe(200);
      expect(JSON.parse(list.body).providers).toContainEqual(
        expect.objectContaining({
          id: 'mock-keyed',
          keySet: true,
          keyHint: 'WXYZ',
          keyRef,
        }),
      );
      const appDefault = await get(app, cookie, APP_DEFAULT_ROUTE);
      const presets = await get(app, cookie, PRESETS_ROUTE);
      const effective = await get(app, cookie, EFFECTIVE_MODEL_ROUTE);
      const models = await get(app, cookie, '/api/providers/mock-keyed/models');
      for (const reply of [appDefault, presets, effective, models]) {
        expect(reply.status).toBe(200);
      }
      expect(JSON.parse(models.body)).toEqual({
        models: ['gemma3', 'llama3.1', 'qwen2.5'],
      });
      for (const reply of [list, appDefault, presets, effective, models]) {
        expect(reply.body).not.toContain(KEY);
      }
      const [record] = (await recordsOf(mock, 'models-non-empty')).filter(
        (entry) => entry.endpoint === 'models',
      );
      expect(record?.headers.authorization).toBe(`Bearer ${KEY}`);

      // (e) Refusals: a blank provider id is 400, an unknown one is 404, and neither body holds the key.
      const blank = await post(app, cookie, KEY_SET_ROUTE, {
        providerId: '',
        key: KEY,
      });
      expect(blank.status).toBe(400);
      const ghost = await post(app, cookie, KEY_SET_ROUTE, {
        providerId: 'ghost',
        key: KEY,
      });
      expect(ghost.status).toBe(404);
      expect(blank.body).not.toContain(KEY);
      expect(ghost.body).not.toContain(KEY);
    } finally {
      await app.close();
    }
  } finally {
    stdout.stop();
    rmSync(library, { recursive: true, force: true });
  }

  // (f) Nothing written to stdout while the app booted and ran.
  expect(stripAnsi(stdout.text())).not.toContain(KEY);
});

it('C2: clearing the key removes the secret entry and the keyRef, and a second clear changes nothing', async () => {
  await withApp(
    settingsWith(
      [keyless('ollama', OLLAMA_URL), keyless('openrouter', OPENROUTER_URL)],
      { providerId: 'ollama', model: '' },
    ),
    async (app, cookie, library) => {
      const set = await post(app, cookie, KEY_SET_ROUTE, {
        providerId: 'openrouter',
        key: KEY,
      });
      expect(set.status).toBe(200);

      const cleared = await post(app, cookie, KEY_CLEAR_ROUTE, {
        providerId: 'openrouter',
      });
      expect(cleared.status).toBe(200);
      const view = JSON.parse(cleared.body) as Record<string, unknown>;
      expect(view.keySet).toBe(false);
      expect(view).not.toHaveProperty('keyHint');
      expect(view).not.toHaveProperty('keyRef');

      const settingsText = readFileSync(settingsFilePath(library), 'utf8');
      expect(settingsText).not.toContain('keyRef');
      expect(settingsText).not.toContain(KEY);
      expect(keysOf(library)).toEqual({});

      const settingsAfterFirst = readFileSync(settingsFilePath(library));
      const secretsAfterFirst = readFileSync(secretsFile(library));

      const again = await post(app, cookie, KEY_CLEAR_ROUTE, {
        providerId: 'openrouter',
      });
      expect(again.status).toBe(200);
      expect(
        readFileSync(settingsFilePath(library)).equals(settingsAfterFirst),
      ).toBe(true);
      expect(readFileSync(secretsFile(library)).equals(secretsAfterFirst)).toBe(
        true,
      );
    },
  );
});

it('C3: deleting the app-default provider returns 409 and keeps its secret; after the default changes, the delete succeeds and the secret is gone', async () => {
  await withApp(
    settingsWith(
      [keyless('ollama', OLLAMA_URL), keyless('openrouter', OPENROUTER_URL)],
      { providerId: 'openrouter', model: '' },
    ),
    async (app, cookie, library) => {
      expect(
        (
          await post(app, cookie, KEY_SET_ROUTE, {
            providerId: 'openrouter',
            key: KEY,
          })
        ).status,
      ).toBe(200);
      const keyRef = keyRefOf(library, 'openrouter');
      expect(keyRef).toBeDefined();

      const refused = await post(
        app,
        cookie,
        `/api/providers/openrouter/delete`,
      );
      expect(refused.status).toBe(409);
      expect(errorOf(refused).code).toBe('PROVIDER_DEFAULT_IN_USE');

      const listed = JSON.parse((await get(app, cookie, PROVIDERS_ROUTE)).body);
      expect(listed.providers.map((p: { id: string }) => p.id)).toContain(
        'openrouter',
      );
      expect(keysOf(library)).toHaveProperty([keyRef as string], KEY);

      const changed = await post(app, cookie, APP_DEFAULT_ROUTE, {
        providerId: 'ollama',
        model: '',
      });
      expect(changed.status).toBe(200);
      expect(JSON.parse(changed.body)).toEqual({
        appDefault: { providerId: 'ollama', model: '' },
      });

      const deleted = await post(
        app,
        cookie,
        `/api/providers/openrouter/delete`,
      );
      expect(deleted.status).toBe(204);
      expect(deleted.body).toBe('');

      const after = JSON.parse((await get(app, cookie, PROVIDERS_ROUTE)).body);
      expect(after.providers.map((p: { id: string }) => p.id)).toEqual([
        'ollama',
      ]);
      expect(keysOf(library)).not.toHaveProperty([keyRef as string]);
      expect(readFileSync(settingsFilePath(library), 'utf8')).not.toContain(
        'openrouter',
      );
    },
  );
});

it('C4: every GET leaves the library unchanged', async () => {
  await withKeyedMock(async (app, cookie, library) => {
    const before = snapshotLibrary(library);
    const settingsBefore = readFileSync(settingsFilePath(library));
    const secretsBefore = readFileSync(secretsFile(library));

    const paths = [
      PROVIDERS_ROUTE,
      PRESETS_ROUTE,
      APP_DEFAULT_ROUTE,
      EFFECTIVE_MODEL_ROUTE,
      `${EFFECTIVE_MODEL_ROUTE}?projectId=p-1`,
      '/api/providers/mock-keyed/models',
    ];
    for (const path of paths) {
      expect((await get(app, cookie, path)).status).toBe(200);
    }
    const presets = await get(app, cookie, PRESETS_ROUTE);
    expect(JSON.parse(presets.body)).toEqual({ presets: PROVIDER_PRESETS });

    expect(snapshotLibrary(library)).toEqual(before);
    expect(readFileSync(settingsFilePath(library)).equals(settingsBefore)).toBe(
      true,
    );
    expect(readFileSync(secretsFile(library)).equals(secretsBefore)).toBe(true);
  });
});

it('E1: create from a preset returns a read view with keySet false and stores no keyRef; update returns the read view; an unknown id is 404 and writes nothing', async () => {
  await withApp(undefined, async (app, cookie, library) => {
    const created = await post(
      app,
      cookie,
      PROVIDERS_ROUTE,
      PROVIDERS_EXAMPLES.createFromPreset,
    );
    expect(created.status).toBe(201);
    const view = JSON.parse(created.body) as Record<string, unknown>;
    expect(view.id).toBe('openrouter');
    expect(view.keySet).toBe(false);
    expect(view).not.toHaveProperty('keyRef');
    expect(view).not.toHaveProperty('keyHint');

    const stored = settingsOf(library).providers.list.find(
      (provider) => provider.id === 'openrouter',
    );
    expect(stored).toBeDefined();
    expect(stored).not.toHaveProperty('presetId');
    expect(stored).not.toHaveProperty('label');
    expect(stored).not.toHaveProperty('keyRef');

    const updated = await post(
      app,
      cookie,
      '/api/providers/openrouter/update',
      PROVIDERS_EXAMPLES.updateModel,
    );
    expect(updated.status).toBe(200);
    expect(JSON.parse(updated.body)).toMatchObject({
      id: 'openrouter',
      model: 'llama3.1',
    });

    const before = readFileSync(settingsFilePath(library));
    const unknown = await post(
      app,
      cookie,
      '/api/providers/no-such/update',
      PROVIDERS_EXAMPLES.updateModel,
    );
    expect(unknown.status).toBe(404);
    expect(errorOf(unknown).code).toBe('PROVIDER_NOT_FOUND');
    expect(readFileSync(settingsFilePath(library)).equals(before)).toBe(true);
  });
});

it('E2: the key hint is absent for a key of four characters and is the last four for five or more', async () => {
  await withApp(
    settingsWith(
      [keyless('ollama', OLLAMA_URL), keyless('openrouter', OPENROUTER_URL)],
      { providerId: 'ollama', model: '' },
    ),
    async (app, cookie) => {
      const short = await post(app, cookie, KEY_SET_ROUTE, {
        providerId: 'ollama',
        key: 'ABCD',
      });
      expect(short.status).toBe(200);
      const shortView = JSON.parse(short.body) as Record<string, unknown>;
      expect(shortView.keySet).toBe(true);
      expect(shortView).not.toHaveProperty('keyHint');

      const long = await post(app, cookie, KEY_SET_ROUTE, {
        providerId: 'openrouter',
        key: 'ABCDE',
      });
      expect(long.status).toBe(200);
      expect(JSON.parse(long.body)).toMatchObject({
        keySet: true,
        keyHint: 'BCDE',
      });
      expect(long.body).not.toContain('ABCDE');
    },
  );
});

it('E3: a key, keySet or keyRef sent in a create or update body is never stored', async () => {
  await withApp(undefined, async (app, cookie, library) => {
    const extras = {
      key: 'sk-leak-ZZZZ1111',
      keySet: true,
      keyRef: 'x-ref',
    };
    const created = await post(app, cookie, PROVIDERS_ROUTE, {
      ...PROVIDERS_EXAMPLES.createFromPreset,
      ...extras,
    });
    expect(created.status).toBe(201);
    let text = readFileSync(settingsFilePath(library), 'utf8');
    expect(text).not.toContain('sk-leak');
    expect(text).not.toContain('x-ref');
    expect(text).not.toContain('keySet');

    const updated = await post(
      app,
      cookie,
      '/api/providers/openrouter/update',
      {
        ...PROVIDERS_EXAMPLES.updateModel,
        ...extras,
      },
    );
    expect(updated.status).toBe(200);
    text = readFileSync(settingsFilePath(library), 'utf8');
    expect(text).not.toContain('sk-leak');
    expect(text).not.toContain('x-ref');
    expect(text).not.toContain('keySet');
  });
});

it('E4: the effective-model response carries only choice, source and contextSize, and no key', async () => {
  await withKeyedMock(async (app, cookie) => {
    const reply = await get(app, cookie, EFFECTIVE_MODEL_ROUTE);
    expect(reply.status).toBe(200);
    const body = JSON.parse(reply.body) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual([
      'choice',
      'contextSize',
      'source',
    ]);
    expect(body.choice).toEqual({
      providerId: 'mock-keyed',
      model: 'llama3.1',
    });
    expect(body.source).toBe('app');
    expect(body.contextSize).toBe(PROVIDER_DEFAULTS.contextSize);
    expect(reply.body).not.toContain(KEY);
    expect(await recordsOf(mock, 'models-non-empty')).toEqual([]);
  });
});

it('E5: a body that fails its schema is 400 PLATFORM_VALIDATION_FAILED and writes nothing', async () => {
  await withApp(undefined, async (app, cookie, library) => {
    const settingsBefore = readFileSync(settingsFilePath(library));
    const secretsBefore = readFileSync(secretsFile(library));

    // A create body with neither presetId nor label. The spread sets presetId to undefined, so JSON drops it.
    const noIdBase = {
      ...PROVIDERS_EXAMPLES.createFromPreset,
      presetId: undefined,
    };
    const create = await post(app, cookie, PROVIDERS_ROUTE, noIdBase);
    expect(create.status).toBe(400);
    expect(errorOf(create).code).toBe('PLATFORM_VALIDATION_FAILED');

    const nullDefault = await post(app, cookie, APP_DEFAULT_ROUTE, null);
    expect(nullDefault.status).toBe(400);
    expect(errorOf(nullDefault).code).toBe('PLATFORM_VALIDATION_FAILED');

    const blankKey = await post(app, cookie, KEY_SET_ROUTE, {
      providerId: '',
      key: KEY,
    });
    expect(blankKey.status).toBe(400);
    expect(errorOf(blankKey).code).toBe('PLATFORM_VALIDATION_FAILED');

    expect(readFileSync(settingsFilePath(library)).equals(settingsBefore)).toBe(
      true,
    );
    expect(readFileSync(secretsFile(library)).equals(secretsBefore)).toBe(true);
  });
});

it('E6: the app default cannot name an unknown provider, and the default stays as it was', async () => {
  await withApp(undefined, async (app, cookie) => {
    const ghost = await post(app, cookie, APP_DEFAULT_ROUTE, {
      providerId: 'ghost',
      model: '',
    });
    expect(ghost.status).toBe(404);
    expect(errorOf(ghost).code).toBe('PROVIDER_NOT_FOUND');

    const current = await get(app, cookie, APP_DEFAULT_ROUTE);
    expect(JSON.parse(current.body)).toEqual({
      appDefault: { providerId: 'ollama', model: '' },
    });
  });
});

it('E7: a key set for an unknown provider is 404 and writes no secret', async () => {
  await withApp(undefined, async (app, cookie, library) => {
    const settingsBefore = readFileSync(settingsFilePath(library));
    const secretsBefore = readFileSync(secretsFile(library));

    const reply = await post(app, cookie, KEY_SET_ROUTE, {
      providerId: 'ghost',
      key: KEY,
    });
    expect(reply.status).toBe(404);
    expect(errorOf(reply).code).toBe('PROVIDER_NOT_FOUND');

    expect(readFileSync(settingsFilePath(library)).equals(settingsBefore)).toBe(
      true,
    );
    expect(readFileSync(secretsFile(library)).equals(secretsBefore)).toBe(true);
  });
});
