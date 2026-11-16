import {
  ACTIVE_PROJECT_ROUTE,
  activeProjectSchema,
} from '@bbartolome/scriba-contracts/project-store';
import {
  APP_DEFAULT_ROUTE,
  appDefaultSchema,
  CONNECTION_TEST_ROUTE,
  connectionTestResultSchema,
  EFFECTIVE_MODEL_ROUTE,
  EFFECTIVE_MODEL_SOURCES,
  effectiveModelSchema,
  KEY_CLEAR_ROUTE,
  KEY_SET_ROUTE,
  MODELS_ROUTE,
  modelListSchema,
  PRESETS_ROUTE,
  presetListSchema,
  PROJECT_MODEL_CLEAR_ROUTE,
  PROJECT_MODEL_ROUTE,
  projectModelResponseSchema,
  PROVIDER_DEFAULTS,
  PROVIDER_DELETE_ROUTE,
  PROVIDER_ERROR_CODE_VALUES,
  PROVIDER_ERROR_CODES,
  PROVIDER_PRESETS,
  PROVIDER_UPDATE_ROUTE,
  PROVIDERS_EXAMPLES,
  PROVIDERS_ROUTE,
  providerListSchema,
  providerReadSchema,
} from '@bbartolome/scriba-contracts/providers';
import { describe, expect, it } from 'vitest';
import type { ResponseSchema } from '../../shell/api-client';
import {
  ACTIVE_PROJECT_PATH,
  activeProjectCopy,
  APP_DEFAULT_PATH,
  appDefaultCopy,
  CONNECTION_TEST_PATH,
  connectionTestResultCopy,
  DEFAULT_IN_USE_CODE,
  EFFECTIVE_MODEL_PATH,
  EFFECTIVE_MODEL_SOURCE_NAMES,
  effectiveModelCopy,
  emptyBodyCopy,
  isOllamaProvider,
  KEY_CLEAR_PATH,
  KEY_SET_PATH,
  MODELS_PATH,
  modelListCopy,
  NOT_FOUND_CODE,
  OLLAMA_CONTEXT_NOTE,
  OLLAMA_PULL_NOTE,
  PRESETS_PATH,
  presetListCopy,
  PROJECT_MODEL_CLEAR_PATH,
  PROJECT_MODEL_PATH,
  projectModelResponseCopy,
  PROVIDER_DEFAULTS_COPY,
  PROVIDER_DELETE_PATH,
  PROVIDER_ERROR_CODE_NAMES,
  PROVIDER_UPDATE_PATH,
  PROVIDERS_PATH,
  providerListCopy,
  providerPath,
  providerReadCopy,
} from './providers-copies';

// Parity: each guard must agree with its contract schema on every fixture.

interface Checker {
  safeParse(data: unknown): { success: boolean; data?: unknown };
}

describe('providers copies', () => {
  it('P1 the route constants, the defaults and the codes agree with the contract', () => {
    expect(PROVIDERS_PATH).toBe(PROVIDERS_ROUTE);
    expect(PRESETS_PATH).toBe(PRESETS_ROUTE);
    expect(APP_DEFAULT_PATH).toBe(APP_DEFAULT_ROUTE);
    expect(PROVIDER_UPDATE_PATH).toBe(PROVIDER_UPDATE_ROUTE);
    expect(PROVIDER_DELETE_PATH).toBe(PROVIDER_DELETE_ROUTE);
    expect(MODELS_PATH).toBe(MODELS_ROUTE);
    expect(KEY_SET_PATH).toBe(KEY_SET_ROUTE);
    expect(KEY_CLEAR_PATH).toBe(KEY_CLEAR_ROUTE);

    expect(PROVIDER_DEFAULTS_COPY).toEqual(PROVIDER_DEFAULTS);
    expect(DEFAULT_IN_USE_CODE).toBe(PROVIDER_ERROR_CODES.DEFAULT_IN_USE);
    expect(NOT_FOUND_CODE).toBe(PROVIDER_ERROR_CODES.NOT_FOUND);

    const templates = [PROVIDER_UPDATE_PATH, PROVIDER_DELETE_PATH, MODELS_PATH];
    const paths = [
      PROVIDERS_PATH,
      PRESETS_PATH,
      APP_DEFAULT_PATH,
      PROVIDER_UPDATE_PATH,
      PROVIDER_DELETE_PATH,
      MODELS_PATH,
      KEY_SET_PATH,
      KEY_CLEAR_PATH,
    ];
    for (const path of paths) {
      const holes = path.split(':id').length - 1;
      expect(holes).toBe(templates.includes(path) ? 1 : 0);
    }

    expect(providerPath(PROVIDER_UPDATE_PATH, 'a b')).toBe(
      '/api/providers/a%20b/update',
    );
    expect(providerPath(PROVIDER_DELETE_PATH, 'a b')).toBe(
      '/api/providers/a%20b/delete',
    );
    expect(providerPath(MODELS_PATH, 'a b')).toBe(
      '/api/providers/a%20b/models',
    );
  });

  it('P2 each guard agrees with its contract schema on accepted and refused fixtures', () => {
    const readBase = PROVIDERS_EXAMPLES.ollamaRead;

    const cases: {
      name: string;
      copy: ResponseSchema<unknown>;
      schema: Checker;
      accepted: unknown[];
      refused: unknown[];
    }[] = [
      {
        name: 'providerReadCopy',
        copy: providerReadCopy,
        schema: providerReadSchema,
        accepted: [
          PROVIDERS_EXAMPLES.ollamaRead,
          PROVIDERS_EXAMPLES.openRouterRead,
          { ...readBase, keySet: true },
          { ...readBase, keySet: true, keyHint: 'x' },
          { ...readBase, keySet: true, keyHint: 'wxyz' },
          { ...readBase, baseURL: 'ftp://example.test' },
          { ...readBase, baseURL: '  https://example.test/v1  ' },
          { ...readBase, baseURL: 'https://exa\nmple.test/v1' },
          { ...readBase, baseURL: '\u00a0https://example.test/v1' },
          { ...readBase, maxTokens: 2 ** 53 - 1 },
          { ...readBase, key: 'sk-extra-field' },
        ],
        refused: [
          { ...readBase, keySet: undefined },
          { ...readBase, keySet: true, keyHint: '12345' },
          { ...readBase, kind: 'other' },
          { ...readBase, baseURL: 'not a url' },
          { ...readBase, baseURL: '' },
          { ...readBase, contextSize: 0 },
          { ...readBase, maxTokens: 1.5 },
          { ...readBase, maxTokens: 2 ** 53 },
          { ...readBase, timeout: -1 },
          { ...readBase, retries: 1.5 },
          { ...readBase, temperature: '0.7' },
          { ...readBase, id: 'Bad Id' },
          { ...readBase, keyRef: '' },
        ],
      },
      {
        name: 'providerListCopy',
        copy: providerListCopy,
        schema: providerListSchema,
        accepted: [PROVIDERS_EXAMPLES.providerList, { providers: [] }],
        refused: [{ providers: 'x' }],
      },
      {
        name: 'presetListCopy',
        copy: presetListCopy,
        schema: presetListSchema,
        accepted: [PROVIDERS_EXAMPLES.presetList],
        refused: [
          {
            presets: [
              {
                id: 'x',
                label: 'X',
                baseURL: 'https://example.test/v1',
                hints: [],
              },
            ],
          },
        ],
      },
      {
        name: 'appDefaultCopy',
        copy: appDefaultCopy,
        schema: appDefaultSchema,
        accepted: [
          PROVIDERS_EXAMPLES.appDefault,
          PROVIDERS_EXAMPLES.appDefaultUnset,
        ],
        refused: [{}, { appDefault: { providerId: '', model: '' } }],
      },
      {
        name: 'modelListCopy',
        copy: modelListCopy,
        schema: modelListSchema,
        accepted: [PROVIDERS_EXAMPLES.modelList, { models: [] }],
        refused: [{ models: [1] }],
      },
    ];

    let accepted = 0;
    let refused = 0;
    for (const testCase of cases) {
      for (const fixture of testCase.accepted) {
        const copyResult = testCase.copy.safeParse(fixture);
        const schemaResult = testCase.schema.safeParse(fixture);
        expect(copyResult.success, testCase.name).toBe(true);
        expect(schemaResult.success, testCase.name).toBe(true);
        if (copyResult.success && schemaResult.success) {
          expect(copyResult.data, testCase.name).toEqual(schemaResult.data);
        }
        accepted += 1;
      }
      for (const fixture of testCase.refused) {
        expect(testCase.copy.safeParse(fixture).success, testCase.name).toBe(
          false,
        );
        expect(testCase.schema.safeParse(fixture).success, testCase.name).toBe(
          false,
        );
        refused += 1;
      }
    }
    expect(accepted).toBe(18);
    expect(refused).toBe(18);

    // A 204 has no schema in the contract. The copy accepts an empty body and nothing else.
    expect(emptyBodyCopy.safeParse(null).success).toBe(true);
    expect(emptyBodyCopy.safeParse(undefined).success).toBe(true);
    expect(emptyBodyCopy.safeParse({}).success).toBe(false);
  });

  it('P3 the connection-test route, the result guard, the error codes, the Ollama notes and the Ollama rule agree with the contract', () => {
    expect(CONNECTION_TEST_PATH).toBe(CONNECTION_TEST_ROUTE);
    expect(PROVIDER_ERROR_CODE_NAMES).toEqual(PROVIDER_ERROR_CODE_VALUES);

    const ok = PROVIDERS_EXAMPLES.connectionTestOk;
    const accepted: unknown[] = [
      ok,
      PROVIDERS_EXAMPLES.connectionTestUnreachable,
      { ok: true, stage: 'chat', latencyMs: 300, modelCount: 0 },
      {
        ok: false,
        stage: 'list',
        latencyMs: 5,
        error: {
          code: 'PROVIDER_UNAUTHORIZED',
          message: 'The provider rejected the request.',
        },
      },
      { ...ok, extra: 'not in the contract' },
    ];
    const refused: unknown[] = [
      { ...ok, stage: 'stream' },
      { ...ok, latencyMs: -1 },
      { ...ok, latencyMs: Number.NaN },
      { ...ok, modelCount: 1.5 },
      { ...ok, error: null },
      {
        ok: false,
        stage: 'reach',
        latencyMs: 1,
        error: { code: 'PROVIDER_NOPE', message: 'x' },
      },
      {
        ok: false,
        stage: 'reach',
        latencyMs: 1,
        error: { code: 'UNREACHABLE', message: 'x' },
      },
      {
        ok: false,
        stage: 'reach',
        latencyMs: 1,
        error: {
          code: 'PROVIDER_UNREACHABLE',
          message: 'x',
          hint: 3,
        },
      },
      { stage: 'chat', latencyMs: 1 },
    ];
    for (const fixture of accepted) {
      const copyResult = connectionTestResultCopy.safeParse(fixture);
      const schemaResult = connectionTestResultSchema.safeParse(fixture);
      expect(copyResult.success).toBe(true);
      expect(schemaResult.success).toBe(true);
      if (copyResult.success && schemaResult.success) {
        expect(copyResult.data).toEqual(schemaResult.data);
      }
    }
    for (const fixture of refused) {
      expect(connectionTestResultCopy.safeParse(fixture).success).toBe(false);
      expect(connectionTestResultSchema.safeParse(fixture).success).toBe(false);
    }

    // The notes are the Ollama preset's own sentences, so the text has one source.
    const ollama = PROVIDER_PRESETS.find((preset) => preset.id === 'ollama');
    const contextHint =
      ollama?.hints.find((hint) => hint.startsWith('Context length')) ?? '';
    const pullHint =
      ollama?.hints.find((hint) => hint.includes('ollama pull')) ?? '';
    expect(contextHint).not.toBe('');
    expect(OLLAMA_CONTEXT_NOTE.startsWith(contextHint)).toBe(true);
    expect(pullHint).not.toBe('');
    expect(OLLAMA_PULL_NOTE).toBe(pullHint);

    // The rule rows: the server's table (providers-resolution.test.ts lines 371 to 390) and the preset.
    const rows: [{ id: string; baseURL: string }, boolean][] = [
      [{ id: 'ollama', baseURL: 'http://host.docker.internal:11434/v1' }, true],
      [
        { id: 'local-llm', baseURL: 'http://host.docker.internal:11434/v1' },
        true,
      ],
      [{ id: 'ollama-lab', baseURL: 'http://127.0.0.1:1234/v1' }, true],
      [
        { id: 'lm-studio', baseURL: 'http://host.docker.internal:1234/v1' },
        false,
      ],
      [{ id: 'openrouter', baseURL: 'https://openrouter.ai/api/v1' }, false],
    ];
    for (const [config, expected] of rows) {
      expect(isOllamaProvider(config), config.id).toBe(expected);
    }
  });

  it('P4 the project-model paths, the active and effective-model guards and the source names agree with the contract', () => {
    expect(ACTIVE_PROJECT_PATH).toBe(ACTIVE_PROJECT_ROUTE);
    expect(EFFECTIVE_MODEL_PATH).toBe(EFFECTIVE_MODEL_ROUTE);
    expect(PROJECT_MODEL_PATH).toBe(PROJECT_MODEL_ROUTE);
    expect(PROJECT_MODEL_CLEAR_PATH).toBe(PROJECT_MODEL_CLEAR_ROUTE);
    expect(EFFECTIVE_MODEL_SOURCE_NAMES).toEqual(EFFECTIVE_MODEL_SOURCES);

    const cases: {
      name: string;
      copy: ResponseSchema<unknown>;
      schema: Checker;
      accepted: unknown[];
      refused: unknown[];
    }[] = [
      {
        name: 'activeProjectCopy',
        copy: activeProjectCopy,
        schema: activeProjectSchema,
        accepted: [{ active: null }, { active: 'b' }],
        refused: [{ active: '' }, {}, { active: 3 }],
      },
      {
        name: 'effectiveModelCopy',
        copy: effectiveModelCopy,
        schema: effectiveModelSchema,
        accepted: [
          {
            choice: { providerId: 'mock', model: 'gemma3' },
            source: 'project',
            contextSize: 64000,
          },
          {
            choice: { providerId: 'mock', model: '' },
            source: 'auto',
            contextSize: 1,
            warning: 'A warning.',
          },
          {
            choice: { providerId: 'mock', model: 'x' },
            source: 'app',
            contextSize: 4096,
            extra: 1,
          },
        ],
        refused: [
          {
            choice: { providerId: 'mock', model: 'x' },
            source: 'other',
            contextSize: 64000,
          },
          {
            choice: { providerId: 'mock', model: 'x' },
            source: 'app',
            contextSize: 0,
          },
          {
            choice: { providerId: '', model: 'x' },
            source: 'app',
            contextSize: 64000,
          },
          {
            choice: { providerId: 'mock', model: 3 },
            source: 'app',
            contextSize: 64000,
          },
          {
            choice: { providerId: 'mock', model: 'x' },
            source: 'app',
            contextSize: 64000,
            warning: 3,
          },
          { source: 'app', contextSize: 64000 },
        ],
      },
      {
        name: 'projectModelResponseCopy',
        copy: projectModelResponseCopy,
        schema: projectModelResponseSchema,
        accepted: [
          { projectModel: null },
          { projectModel: { providerId: 'mock', model: 'gemma3' } },
        ],
        refused: [
          { projectModel: { providerId: '' } },
          {},
          { projectModel: { providerId: 'mock' } },
        ],
      },
    ];
    for (const testCase of cases) {
      for (const fixture of testCase.accepted) {
        expect(testCase.copy.safeParse(fixture).success, testCase.name).toBe(
          true,
        );
        expect(testCase.schema.safeParse(fixture).success, testCase.name).toBe(
          true,
        );
      }
      for (const fixture of testCase.refused) {
        expect(testCase.copy.safeParse(fixture).success, testCase.name).toBe(
          false,
        );
        expect(testCase.schema.safeParse(fixture).success, testCase.name).toBe(
          false,
        );
      }
    }
  });
});
