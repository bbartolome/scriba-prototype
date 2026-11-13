import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import type {
  AppDefault,
  ConnectionTestError,
  ConnectionTestRequest,
  ConnectionTestResult,
  ConnectionTestStage,
  EffectiveModel,
  EffectiveModelQuery,
  EffectiveModelSource,
  KeyClearRequest,
  KeySetRequest,
  ModelChoice,
  ModelList,
  OpenAICompatibleConfig,
  OpenAICompatibleInput,
  OpenAICompatibleRead,
  Preset,
  PresetList,
  ProviderConfig,
  ProviderConfigInput,
  ProviderCreate,
  ProviderErrorCode,
  ProviderList,
  ProviderRead,
  ProviderUpdate,
  ProvidersSection,
} from '../src/providers/index.js';
import {
  APP_DEFAULT_ROUTE,
  appDefaultSchema,
  CONNECTION_TEST_ROUTE,
  connectionTestErrorSchema,
  connectionTestRequestSchema,
  connectionTestResultSchema,
  connectionTestStageSchema,
  EFFECTIVE_MODEL_ROUTE,
  effectiveModelQuerySchema,
  effectiveModelSchema,
  effectiveModelSourceSchema,
  KEY_CLEAR_ROUTE,
  KEY_SET_ROUTE,
  keyClearRequestSchema,
  keySetRequestSchema,
  MODELS_ROUTE,
  modelChoiceSchema,
  modelListSchema,
  openaiCompatibleInputSchema,
  openaiCompatibleReadSchema,
  openaiCompatibleSchema,
  PRESETS_ROUTE,
  PROJECT_MODEL_CLEAR_ROUTE,
  PROJECT_MODEL_ROUTE,
  PROVIDER_DEFAULTS,
  PROVIDER_DELETE_ROUTE,
  PROVIDER_ERROR_CODE_VALUES,
  PROVIDER_ERROR_CODES,
  PROVIDER_ERROR_STATUS,
  PROVIDER_PRESET_IDS,
  PROVIDER_PRESETS,
  PROVIDER_UPDATE_ROUTE,
  PROVIDERS_EXAMPLES,
  PROVIDERS_ROUTE,
  providerConfigInputSchema,
  providerConfigSchema,
  providerCreateSchema,
  providerErrorCodeSchema,
  providerListSchema,
  providerReadSchema,
  providerUpdateSchema,
  presetListSchema,
  presetSchema,
  providersSectionSchema,
} from '../src/providers/index.js';
import { errorCodeSchema } from '../src/platform/index.js';

// Deep keys of a type, through objects, arrays, optional and nullable properties, and unions.
type DeepKeys<T> = T extends readonly (infer E)[]
  ? DeepKeys<E>
  : T extends object
    ? { [K in keyof T & string]-?: K | DeepKeys<NonNullable<T[K]>> }[keyof T &
        string]
    : never;

// Every response type of the slice (SD19 and SD17).
type ResponseTypes =
  | ProviderRead
  | ProviderList
  | Preset
  | PresetList
  | ModelChoice
  | AppDefault
  | EffectiveModel
  | ModelList
  | ConnectionTestResult
  | ConnectionTestError
  | ProvidersSection;

// Key names at any depth of a Zod schema. Walks objects, arrays, optional, nullable and union wrappers.
function keyNamesDeep(schema: z.core.$ZodType): string[] {
  if (schema instanceof z.ZodObject)
    return Object.entries(schema.shape).flatMap(([name, child]) => [
      name,
      ...keyNamesDeep(child as z.core.$ZodType),
    ]);
  if (schema instanceof z.ZodArray) return keyNamesDeep(schema.element);
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable)
    return keyNamesDeep(schema.unwrap());
  if (schema instanceof z.ZodUnion) return schema.options.flatMap(keyNamesDeep);
  return [];
}

const RESPONSE_SCHEMAS = {
  providerReadSchema,
  providerListSchema,
  presetSchema,
  presetListSchema,
  modelChoiceSchema,
  appDefaultSchema,
  effectiveModelSchema,
  modelListSchema,
  connectionTestResultSchema,
  providersSectionSchema,
};

const REQUEST_SCHEMAS = {
  keySetRequestSchema,
  keyClearRequestSchema,
  providerCreateSchema,
  providerUpdateSchema,
  providerConfigInputSchema,
  connectionTestRequestSchema,
  effectiveModelQuerySchema,
};

// Each example key with the schema it must pass. Typed as a Record, so a key with no row fails to compile.
const EXAMPLE_SCHEMAS: Record<keyof typeof PROVIDERS_EXAMPLES, z.ZodType> = {
  ollamaProvider: providerConfigSchema,
  openRouterProvider: providerConfigSchema,
  ollamaRead: providerReadSchema,
  openRouterRead: providerReadSchema,
  createFromPreset: providerCreateSchema,
  createFromLabel: providerCreateSchema,
  updateModel: providerUpdateSchema,
  providerList: providerListSchema,
  seededSection: providersSectionSchema,
  presetList: presetListSchema,
  appDefault: appDefaultSchema,
  appDefaultUnset: appDefaultSchema,
  modelChoice: modelChoiceSchema,
  effectiveModelApp: effectiveModelSchema,
  effectiveModelProject: effectiveModelSchema,
  effectiveModelWarning: effectiveModelSchema,
  effectiveModelQuery: effectiveModelQuerySchema,
  modelList: modelListSchema,
  keySetRequest: keySetRequestSchema,
  keyClearRequest: keyClearRequestSchema,
  connectionTestById: connectionTestRequestSchema,
  connectionTestByDraft: connectionTestRequestSchema,
  connectionTestOk: connectionTestResultSchema,
  connectionTestUnreachable: connectionTestResultSchema,
};

const ROUTES = [
  PROVIDERS_ROUTE,
  PRESETS_ROUTE,
  APP_DEFAULT_ROUTE,
  PROVIDER_UPDATE_ROUTE,
  PROVIDER_DELETE_ROUTE,
  MODELS_ROUTE,
  KEY_SET_ROUTE,
  KEY_CLEAR_ROUTE,
  CONNECTION_TEST_ROUTE,
  EFFECTIVE_MODEL_ROUTE,
  PROJECT_MODEL_ROUTE,
  PROJECT_MODEL_CLEAR_ROUTE,
];

const ollamaProvider = PROVIDERS_EXAMPLES.ollamaProvider;
const OLLAMA_URL = PROVIDER_PRESETS[0].baseURL;

describe('type level', () => {
  it('no response type carries a key at any depth', () => {
    expectTypeOf<
      Extract<DeepKeys<ResponseTypes>, 'key' | 'apiKey'>
    >().toEqualTypeOf<never>();
  });

  it('the helper finds a key at depth (positive control)', () => {
    expectTypeOf<
      Extract<DeepKeys<{ a: { b: [{ key: string }] } }>, 'key'>
    >().toEqualTypeOf<'key'>();
  });

  it('each exported type equals the inferred type of its schema', () => {
    expectTypeOf<ProviderConfig>().toEqualTypeOf<
      z.infer<typeof providerConfigSchema>
    >();
    expectTypeOf<OpenAICompatibleConfig>().toEqualTypeOf<
      z.infer<typeof openaiCompatibleSchema>
    >();
    expectTypeOf<OpenAICompatibleInput>().toEqualTypeOf<
      z.infer<typeof openaiCompatibleInputSchema>
    >();
    expectTypeOf<OpenAICompatibleRead>().toEqualTypeOf<
      z.infer<typeof openaiCompatibleReadSchema>
    >();
    expectTypeOf<ProviderConfigInput>().toEqualTypeOf<
      z.infer<typeof providerConfigInputSchema>
    >();
    expectTypeOf<ProviderRead>().toEqualTypeOf<
      z.infer<typeof providerReadSchema>
    >();
    expectTypeOf<ProviderList>().toEqualTypeOf<
      z.infer<typeof providerListSchema>
    >();
    expectTypeOf<ProviderCreate>().toEqualTypeOf<
      z.infer<typeof providerCreateSchema>
    >();
    expectTypeOf<ProviderUpdate>().toEqualTypeOf<
      z.infer<typeof providerUpdateSchema>
    >();
    expectTypeOf<Preset>().toEqualTypeOf<z.infer<typeof presetSchema>>();
    expectTypeOf<PresetList>().toEqualTypeOf<
      z.infer<typeof presetListSchema>
    >();
    expectTypeOf<ModelChoice>().toEqualTypeOf<
      z.infer<typeof modelChoiceSchema>
    >();
    expectTypeOf<AppDefault>().toEqualTypeOf<
      z.infer<typeof appDefaultSchema>
    >();
    expectTypeOf<EffectiveModelSource>().toEqualTypeOf<
      z.infer<typeof effectiveModelSourceSchema>
    >();
    expectTypeOf<EffectiveModel>().toEqualTypeOf<
      z.infer<typeof effectiveModelSchema>
    >();
    expectTypeOf<EffectiveModelQuery>().toEqualTypeOf<
      z.infer<typeof effectiveModelQuerySchema>
    >();
    expectTypeOf<ModelList>().toEqualTypeOf<z.infer<typeof modelListSchema>>();
    expectTypeOf<ConnectionTestStage>().toEqualTypeOf<
      z.infer<typeof connectionTestStageSchema>
    >();
    expectTypeOf<ConnectionTestError>().toEqualTypeOf<
      z.infer<typeof connectionTestErrorSchema>
    >();
    expectTypeOf<ConnectionTestRequest>().toEqualTypeOf<
      z.infer<typeof connectionTestRequestSchema>
    >();
    expectTypeOf<ConnectionTestResult>().toEqualTypeOf<
      z.infer<typeof connectionTestResultSchema>
    >();
    expectTypeOf<KeySetRequest>().toEqualTypeOf<
      z.infer<typeof keySetRequestSchema>
    >();
    expectTypeOf<KeyClearRequest>().toEqualTypeOf<
      z.infer<typeof keyClearRequestSchema>
    >();
    expectTypeOf<ProvidersSection>().toEqualTypeOf<
      z.infer<typeof providersSectionSchema>
    >();
    expectTypeOf<ProviderErrorCode>().toEqualTypeOf<
      z.infer<typeof providerErrorCodeSchema>
    >();
  });
});

describe('runtime walk', () => {
  it('no response schema holds a key field at any depth', () => {
    for (const [name, schema] of Object.entries(RESPONSE_SCHEMAS)) {
      const names = keyNamesDeep(schema);
      expect(names, name).not.toContain('key');
      expect(names, name).not.toContain('apiKey');
    }
  });

  it('the walk finds a nested key (positive control)', () => {
    expect(
      keyNamesDeep(z.object({ a: z.array(z.object({ key: z.string() })) })),
    ).toContain('key');
  });

  it('only the key requests carry a key, at any depth', () => {
    const withKey = Object.entries(REQUEST_SCHEMAS)
      .filter(([, schema]) => keyNamesDeep(schema).includes('key'))
      .map(([name]) => name)
      .sort();
    expect(withKey).toEqual([
      'connectionTestRequestSchema',
      'keySetRequestSchema',
    ]);
  });
});

describe('config schema', () => {
  it('rejects an unknown kind', () => {
    expect(
      providerConfigSchema.safeParse({ ...ollamaProvider, kind: 'anthropic' })
        .success,
    ).toBe(false);
  });

  it('rejects a non-URL baseURL', () => {
    expect(
      providerConfigSchema.safeParse({
        ...ollamaProvider,
        baseURL: 'not a url',
      }).success,
    ).toBe(false);
  });

  it('rejects a negative timeout', () => {
    expect(
      providerConfigSchema.safeParse({ ...ollamaProvider, timeout: -1 })
        .success,
    ).toBe(false);
  });

  it('rejects a negative retries', () => {
    expect(
      providerConfigSchema.safeParse({ ...ollamaProvider, retries: -1 })
        .success,
    ).toBe(false);
  });

  it('rejects a non-integer timeout', () => {
    expect(
      providerConfigSchema.safeParse({ ...ollamaProvider, timeout: 1.5 })
        .success,
    ).toBe(false);
  });

  it('rejects a non-integer retries', () => {
    expect(
      providerConfigSchema.safeParse({ ...ollamaProvider, retries: 1.5 })
        .success,
    ).toBe(false);
  });

  it('accepts the seeded Ollama provider', () => {
    expect(providerConfigSchema.safeParse(ollamaProvider).success).toBe(true);
  });

  it('the input member has no id and no keyRef', () => {
    const keys = Object.keys(providerConfigInputSchema.options[0].shape);
    expect(keys).not.toContain('id');
    expect(keys).not.toContain('keyRef');
  });
});

describe('read view', () => {
  it('accepts keySet and a four-character keyHint', () => {
    expect(
      providerReadSchema.safeParse(PROVIDERS_EXAMPLES.ollamaRead).success,
    ).toBe(true);
    expect(
      providerReadSchema.safeParse({
        ...PROVIDERS_EXAMPLES.ollamaRead,
        keyHint: 'abcde',
      }).success,
    ).toBe(false);
  });
});

describe('responses', () => {
  it('rejects a source other than project, app or auto', () => {
    const base = PROVIDERS_EXAMPLES.effectiveModelApp;
    expect(
      effectiveModelSchema.safeParse({ ...base, source: 'other' }).success,
    ).toBe(false);
    expect(
      effectiveModelSchema.safeParse({ ...base, source: 'auto' }).success,
    ).toBe(true);
  });

  it('app default accepts null and the set example', () => {
    expect(appDefaultSchema.safeParse({ appDefault: null }).success).toBe(true);
    expect(
      appDefaultSchema.safeParse(PROVIDERS_EXAMPLES.appDefault).success,
    ).toBe(true);
  });
});

describe('connection test', () => {
  it('accepts one form, rejects both or neither', () => {
    const byId = { providerId: 'ollama' };
    const byDraft = { draft: PROVIDERS_EXAMPLES.connectionTestByDraft.draft };
    expect(connectionTestRequestSchema.safeParse(byId).success).toBe(true);
    expect(connectionTestRequestSchema.safeParse(byDraft).success).toBe(true);
    expect(
      connectionTestRequestSchema.safeParse({ ...byId, ...byDraft }).success,
    ).toBe(false);
    expect(connectionTestRequestSchema.safeParse({}).success).toBe(false);
  });

  it('rejects an error code outside the PROVIDER codes', () => {
    const result = {
      ...PROVIDERS_EXAMPLES.connectionTestUnreachable,
      error: { code: 'PLATFORM_NOT_FOUND', message: 'x' },
    };
    expect(connectionTestResultSchema.safeParse(result).success).toBe(false);
  });
});

describe('create body', () => {
  const base = PROVIDERS_EXAMPLES.createFromLabel;
  // The example with one key removed.
  const without = (body: object, key: string) =>
    Object.fromEntries(Object.entries(body).filter(([k]) => k !== key));

  it('accepts a label, and a preset id without a label', () => {
    expect(providerCreateSchema.safeParse(base).success).toBe(true);
    expect(
      providerCreateSchema.safeParse({
        ...PROVIDERS_EXAMPLES.createFromPreset,
        presetId: 'ollama',
      }).success,
    ).toBe(true);
  });

  it('rejects a body with neither a presetId nor a label', () => {
    expect(providerCreateSchema.safeParse(without(base, 'label')).success).toBe(
      false,
    );
  });

  it('rejects an empty label', () => {
    expect(providerCreateSchema.safeParse({ ...base, label: '' }).success).toBe(
      false,
    );
  });

  it('rejects a label without an ASCII letter or digit', () => {
    expect(
      providerCreateSchema.safeParse({ ...base, label: '!!!' }).success,
    ).toBe(false);
  });

  it('rejects a presetId outside the four ids', () => {
    expect(
      providerCreateSchema.safeParse({
        ...PROVIDERS_EXAMPLES.createFromPreset,
        presetId: '!!!',
      }).success,
    ).toBe(false);
  });

  it('stays a ZodObject, so the key walk reaches its fields', () => {
    expect(providerCreateSchema).toBeInstanceOf(z.ZodObject);
  });

  it('the preset ids are the ids of PROVIDER_PRESETS', () => {
    expect([...PROVIDER_PRESET_IDS]).toEqual(PROVIDER_PRESETS.map((p) => p.id));
  });
});

describe('presets', () => {
  it('lists the four presets in unit order', () => {
    expect(
      PROVIDER_PRESETS.map((p) => [p.id, p.baseURL, p.keyRequired]),
    ).toEqual([
      ['ollama', 'http://host.docker.internal:11434/v1', false],
      ['lm-studio', 'http://host.docker.internal:1234/v1', false],
      ['openai', 'https://api.openai.com/v1', true],
      ['openrouter', 'https://openrouter.ai/api/v1', true],
    ]);
  });

  it('every preset validates', () => {
    expect(presetSchema.array().safeParse(PROVIDER_PRESETS).success).toBe(true);
  });
});

describe('defaults', () => {
  it('the defaults are the five unit values', () => {
    expect(PROVIDER_DEFAULTS).toEqual({
      temperature: 0.7,
      contextSize: 64000,
      maxTokens: 4096,
      timeout: 120000,
      retries: 2,
    });
  });
});

describe('seeded section', () => {
  const section = PROVIDERS_EXAMPLES.seededSection;

  it('validates', () => {
    expect(providersSectionSchema.safeParse(section).success).toBe(true);
  });

  it('has one keyless Ollama provider and an Ollama default', () => {
    expect(section.list).toHaveLength(1);
    const [seeded] = section.list;
    expect(seeded.id).toBe('ollama');
    expect(seeded.baseURL).toBe(OLLAMA_URL);
    expect(seeded).toMatchObject(PROVIDER_DEFAULTS);
    expect(seeded).not.toHaveProperty('keyRef');
    expect(section.appDefault).toEqual({ providerId: 'ollama', model: '' });
  });
});

describe('example payloads are accepted', () => {
  it('the table has a row for each example key and no other row', () => {
    expect(Object.keys(EXAMPLE_SCHEMAS).sort()).toEqual(
      Object.keys(PROVIDERS_EXAMPLES).sort(),
    );
  });

  it.each(Object.keys(PROVIDERS_EXAMPLES))(
    'accepts the %s example through its schema',
    (key) => {
      const example =
        PROVIDERS_EXAMPLES[key as keyof typeof PROVIDERS_EXAMPLES];
      expect(
        EXAMPLE_SCHEMAS[key as keyof typeof PROVIDERS_EXAMPLES].safeParse(
          example,
        ).success,
      ).toBe(true);
    },
  );
});

describe('error codes', () => {
  it.each(Object.values(PROVIDER_ERROR_CODES))(
    'accepts %s through errorCodeSchema',
    (code) => {
      expect(errorCodeSchema.safeParse(code).success).toBe(true);
    },
  );

  it('the value tuple matches the codes', () => {
    expect([...PROVIDER_ERROR_CODE_VALUES].sort()).toEqual(
      Object.values(PROVIDER_ERROR_CODES).sort(),
    );
  });

  it('the status table has one key per code', () => {
    expect(Object.keys(PROVIDER_ERROR_STATUS).sort()).toEqual(
      [...Object.values(PROVIDER_ERROR_CODES)].sort(),
    );
    expect(PROVIDER_ERROR_STATUS.PROVIDER_DEFAULT_IN_USE).toBe(409);
    expect(PROVIDER_ERROR_STATUS.PROVIDER_UNAUTHORIZED).toBe(502);
  });

  it("each of the ten statuses matches the Navigator's table", () => {
    expect(PROVIDER_ERROR_STATUS).toEqual({
      PROVIDER_UNREACHABLE: 502,
      PROVIDER_UNAUTHORIZED: 502,
      PROVIDER_MODEL_NOT_FOUND: 502,
      PROVIDER_TIMEOUT: 504,
      PROVIDER_RATE_LIMITED: 503,
      PROVIDER_BAD_RESPONSE: 502,
      PROVIDER_ABORTED: 409,
      PROVIDER_NOT_CONFIGURED: 409,
      PROVIDER_DEFAULT_IN_USE: 409,
      PROVIDER_NOT_FOUND: 404,
    });
  });

  it('no PROVIDER code maps to 401', () => {
    expect(Object.values(PROVIDER_ERROR_STATUS)).not.toContain(401);
  });
});

describe('routes and constants', () => {
  it('every route is under /api/providers and unique', () => {
    for (const route of ROUTES) {
      expect(
        route === '/api/providers' || route.startsWith('/api/providers/'),
      ).toBe(true);
    }
    expect(new Set(ROUTES).size).toBe(ROUTES.length);
  });
});
