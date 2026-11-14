import {
  APP_DEFAULT_ROUTE,
  appDefaultSchema,
  KEY_CLEAR_ROUTE,
  KEY_SET_ROUTE,
  MODELS_ROUTE,
  modelListSchema,
  PRESETS_ROUTE,
  presetListSchema,
  PROVIDER_DEFAULTS,
  PROVIDER_DELETE_ROUTE,
  PROVIDER_ERROR_CODES,
  PROVIDER_UPDATE_ROUTE,
  PROVIDERS_EXAMPLES,
  PROVIDERS_ROUTE,
  providerListSchema,
  providerReadSchema,
} from '@bbartolome/scriba-contracts/providers';
import { describe, expect, it } from 'vitest';
import type { ResponseSchema } from '../../shell/api-client';
import {
  APP_DEFAULT_PATH,
  appDefaultCopy,
  DEFAULT_IN_USE_CODE,
  emptyBodyCopy,
  KEY_CLEAR_PATH,
  KEY_SET_PATH,
  MODELS_PATH,
  modelListCopy,
  NOT_FOUND_CODE,
  PRESETS_PATH,
  presetListCopy,
  PROVIDER_DEFAULTS_COPY,
  PROVIDER_DELETE_PATH,
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
});
