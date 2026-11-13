import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import type {
  Allowlist,
  BackendState,
  ComposeVersionStatus,
  HandshakeQuery,
  Identity,
  Preferences,
  SetupAuthSection,
  SetupStatus,
  SetupStep,
  SetupStepState,
  StepUpdate,
  TailscaleStatus,
} from '../src/setup-auth/index.js';
import {
  ALLOWLIST_ROUTE,
  HANDSHAKE_ROUTE,
  IDENTITY_ROUTE,
  PREFERENCES_ROUTE,
  SETUP_AUTH_ERROR_CODES,
  SETUP_AUTH_ERROR_STATUS,
  SETUP_AUTH_EXAMPLES,
  SETUP_CONTINUE_ROUTE,
  SETUP_STATUS_ROUTE,
  SETUP_STEP_KEYS,
  SETUP_STEP_ROUTE,
  SIGN_OUT_ROUTE,
  TAILSCALE_STATUS_ROUTE,
  allowlistSchema,
  allowlistUpdateSchema,
  backendStateSchema,
  composeVersionStatusSchema,
  handshakeQuerySchema,
  identitySchema,
  preferencesSchema,
  setupAuthSectionSchema,
  setupStatusSchema,
  setupStepKeySchema,
  setupStepStateSchema,
  setupStepsSchema,
  stepUpdateSchema,
  tailscaleStatusSchema,
} from '../src/setup-auth/index.js';
import { errorCodeSchema } from '../src/platform/index.js';

// Structural type, so the test does not depend on which copy of zod provides the schema types.
interface AnySchema {
  safeParse(value: unknown): { success: boolean };
}

const ACCEPTED: Array<[string, AnySchema, unknown]> = [
  ['identityLoopback', identitySchema, SETUP_AUTH_EXAMPLES.identityLoopback],
  ['identityTailnet', identitySchema, SETUP_AUTH_EXAMPLES.identityTailnet],
  [
    'tailscaleNeedsLogin',
    tailscaleStatusSchema,
    SETUP_AUTH_EXAMPLES.tailscaleNeedsLogin,
  ],
  [
    'tailscaleRunning',
    tailscaleStatusSchema,
    SETUP_AUTH_EXAMPLES.tailscaleRunning,
  ],
  [
    'tailscaleUnavailable',
    tailscaleStatusSchema,
    SETUP_AUTH_EXAMPLES.tailscaleUnavailable,
  ],
  ['setupStatus', setupStatusSchema, SETUP_AUTH_EXAMPLES.setupStatus],
  ['composeOk', composeVersionStatusSchema, SETUP_AUTH_EXAMPLES.composeOk],
  [
    'composeMismatch',
    composeVersionStatusSchema,
    SETUP_AUTH_EXAMPLES.composeMismatch,
  ],
  [
    'composeUnknown',
    composeVersionStatusSchema,
    SETUP_AUTH_EXAMPLES.composeUnknown,
  ],
  ['stepUpdateDone', stepUpdateSchema, SETUP_AUTH_EXAMPLES.stepUpdateDone],
  [
    'stepUpdateSkipped',
    stepUpdateSchema,
    SETUP_AUTH_EXAMPLES.stepUpdateSkipped,
  ],
  ['preferences', preferencesSchema, SETUP_AUTH_EXAMPLES.preferences],
  ['preferencesEmpty', preferencesSchema, SETUP_AUTH_EXAMPLES.preferencesEmpty],
  ['allowlist', allowlistSchema, SETUP_AUTH_EXAMPLES.allowlist],
  ['allowlistUpdate with one field', allowlistUpdateSchema, { enabled: false }],
  [
    'setupAuthSection',
    setupAuthSectionSchema,
    SETUP_AUTH_EXAMPLES.setupAuthSection,
  ],
  ['handshakeQuery', handshakeQuerySchema, SETUP_AUTH_EXAMPLES.handshakeQuery],
];

const REJECTED: Array<[string, AnySchema, unknown]> = [
  ['identity with an unknown via', identitySchema, { via: 'peer' }],
  ['tailnet identity with no login', identitySchema, { via: 'tailnet' }],
  [
    'tailnet identity with an empty login',
    identitySchema,
    { via: 'tailnet', login: '' },
  ],
  ['backend state Connected', backendStateSchema, 'Connected'],
  ['backend state in lower case', backendStateSchema, 'running'],
  [
    'tailscale status with an unknown BackendState',
    tailscaleStatusSchema,
    { available: true, backendState: 'Connected' },
  ],
  [
    'dnsName with a trailing dot',
    tailscaleStatusSchema,
    {
      available: true,
      backendState: 'Running',
      dnsName: 'scriba.tail1234.ts.net.',
    },
  ],
  [
    'authURL that is not a URL',
    tailscaleStatusSchema,
    { available: true, backendState: 'NeedsLogin', authURL: 'not-a-url' },
  ],
  [
    'steps with an unknown step state',
    setupStepsSchema,
    {
      access: 'started',
      tailscale: 'pending',
      providers: 'pending',
      preferences: 'pending',
      firstProject: 'pending',
    },
  ],
  [
    'steps with no firstProject',
    setupStepsSchema,
    {
      access: 'done',
      tailscale: 'pending',
      providers: 'pending',
      preferences: 'pending',
    },
  ],
  [
    'setup status with a compose state of broken',
    setupStatusSchema,
    {
      ...SETUP_AUTH_EXAMPLES.setupStatus,
      compose: { state: 'broken', expected: 3 },
    },
  ],
  [
    'compose expected that is not an integer',
    composeVersionStatusSchema,
    { state: 'ok', expected: 1.5 },
  ],
  ['step update to pending', stepUpdateSchema, { state: 'pending' }],
  [
    'setupAuth section with schemaVersion 2',
    setupAuthSectionSchema,
    { ...SETUP_AUTH_EXAMPLES.setupAuthSection, schemaVersion: 2 },
  ],
  [
    'allowlist with a non-string login',
    allowlistSchema,
    { enabled: true, logins: [1] },
  ],
  [
    'allowlist update with a non-boolean enabled',
    allowlistUpdateSchema,
    { enabled: 'yes' },
  ],
  ['handshake with an empty token', handshakeQuerySchema, { token: '' }],
];

describe('example payloads are accepted', () => {
  it.each(ACCEPTED)('accepts %s', (_name, schema, payload) => {
    expect(schema.safeParse(payload).success).toBe(true);
  });
});

describe('malformed payloads are rejected', () => {
  it.each(REJECTED)('rejects %s', (_name, schema, payload) => {
    expect(schema.safeParse(payload).success).toBe(false);
  });
});

describe('error codes', () => {
  it.each(Object.values(SETUP_AUTH_ERROR_CODES))(
    'accepts %s through errorCodeSchema',
    (code) => {
      expect(errorCodeSchema.safeParse(code).success).toBe(true);
    },
  );

  it('rejects a bare SETUP_ prefix', () => {
    expect(errorCodeSchema.safeParse('SETUP_').success).toBe(false);
  });
});

describe('shape and constant details', () => {
  it('strips unknown keys instead of refusing them', () => {
    expect(
      identitySchema.parse({ via: 'loopback', extra: true }),
    ).toStrictEqual({ via: 'loopback' });
  });

  it('keeps every route under /api/setup-auth/ and unique', () => {
    const routes = [
      SETUP_STATUS_ROUTE,
      SETUP_CONTINUE_ROUTE,
      SETUP_STEP_ROUTE,
      HANDSHAKE_ROUTE,
      IDENTITY_ROUTE,
      SIGN_OUT_ROUTE,
      TAILSCALE_STATUS_ROUTE,
      ALLOWLIST_ROUTE,
      PREFERENCES_ROUTE,
    ];
    expect(routes.filter((r) => !r.startsWith('/api/setup-auth/'))).toEqual([]);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('the steps object has exactly the step keys', () => {
    expect(Object.keys(setupStatusSchema.shape.steps.shape)).toEqual([
      ...SETUP_STEP_KEYS,
    ]);
  });

  it('the status table has one key for each error code', () => {
    expect(Object.keys(SETUP_AUTH_ERROR_STATUS).sort()).toEqual(
      Object.values(SETUP_AUTH_ERROR_CODES).sort(),
    );
  });
});

describe('exported types match their schemas', () => {
  it('names each shape type', () => {
    expectTypeOf<Identity>().toEqualTypeOf<z.infer<typeof identitySchema>>();
    expectTypeOf<BackendState>().toEqualTypeOf<
      z.infer<typeof backendStateSchema>
    >();
    expectTypeOf<TailscaleStatus>().toEqualTypeOf<
      z.infer<typeof tailscaleStatusSchema>
    >();
    expectTypeOf<SetupStep>().toEqualTypeOf<
      z.infer<typeof setupStepKeySchema>
    >();
    expectTypeOf<SetupStepState>().toEqualTypeOf<
      z.infer<typeof setupStepStateSchema>
    >();
    expectTypeOf<ComposeVersionStatus>().toEqualTypeOf<
      z.infer<typeof composeVersionStatusSchema>
    >();
    expectTypeOf<SetupStatus>().toEqualTypeOf<
      z.infer<typeof setupStatusSchema>
    >();
    expectTypeOf<StepUpdate>().toEqualTypeOf<
      z.infer<typeof stepUpdateSchema>
    >();
    expectTypeOf<Preferences>().toEqualTypeOf<
      z.infer<typeof preferencesSchema>
    >();
    expectTypeOf<Allowlist>().toEqualTypeOf<z.infer<typeof allowlistSchema>>();
    expectTypeOf<SetupAuthSection>().toEqualTypeOf<
      z.infer<typeof setupAuthSectionSchema>
    >();
    expectTypeOf<HandshakeQuery>().toEqualTypeOf<
      z.infer<typeof handshakeQuerySchema>
    >();
  });
});
