import { describe, expect, it } from 'vitest';
import {
  ECHO_ROUTE,
  EVENTS_ROUTE,
  HEALTHZ_ROUTE,
  HTTP_METHOD_CONVENTION,
  PLATFORM_ERROR_CODES,
  PLATFORM_ERROR_STATUS,
  SCRIBA_ENV_DEFAULTS,
  SETTINGS_SECTION_KEYS,
  SSE_HEARTBEAT_MS,
  SSE_RETRY_MS,
  VERSION_ROUTE,
  echoRequestSchema,
  errorBodySchema,
  errorCodeSchema,
  healthzSchema,
  platformEventSchema,
  settingsEnvelopeSchema,
  sseEnvelopeSchema,
  versionInfoSchema,
} from '../src/platform/index.js';

const NOW = '2026-11-11T12:00:00.000Z';

describe('SSE envelope', () => {
  it('accepts a publishing module with a kebab-case type', () => {
    const result = sseEnvelopeSchema.safeParse({
      module: 'platform',
      type: 'node-status',
      data: {},
    });
    expect(result.success).toBe(true);
  });

  it.each(['shell', 'genre-packs', 'nope'])(
    'rejects module %s',
    (moduleSlug) => {
      const result = sseEnvelopeSchema.safeParse({
        module: moduleSlug,
        type: 'node-status',
        data: {},
      });
      expect(result.success).toBe(false);
    },
  );

  it('rejects a dotted type', () => {
    const result = sseEnvelopeSchema.safeParse({
      module: 'platform',
      type: 'node.status',
      data: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects a base envelope with no data key', () => {
    const result = sseEnvelopeSchema.safeParse({
      module: 'platform',
      type: 'node-status',
    });
    expect(result.success).toBe(false);
  });
});

describe('platform SSE members', () => {
  it('accepts a valid hello member', () => {
    const result = platformEventSchema.safeParse({
      module: 'platform',
      type: 'hello',
      data: { streamId: 'stream-1', version: '0.0.0-dev', serverTime: NOW },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid echo member', () => {
    const result = platformEventSchema.safeParse({
      module: 'platform',
      type: 'echo',
      data: { seq: 1, sentAt: NOW },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a hello member without data', () => {
    const result = platformEventSchema.safeParse({
      module: 'platform',
      type: 'hello',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an echo member with seq 0', () => {
    const result = platformEventSchema.safeParse({
      module: 'platform',
      type: 'echo',
      data: { seq: 0, sentAt: NOW },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a member of another module', () => {
    const result = platformEventSchema.safeParse({
      module: 'providers',
      type: 'hello',
      data: { streamId: 'stream-1', version: '0.0.0-dev', serverTime: NOW },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown platform type', () => {
    const result = platformEventSchema.safeParse({
      module: 'platform',
      type: 'node-status',
      data: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('error body', () => {
  it('accepts a platform error with a prefixed code', () => {
    const result = errorBodySchema.safeParse({
      error: { code: 'PLATFORM_NOT_FOUND', message: 'Not found' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional structured details', () => {
    const result = errorBodySchema.safeParse({
      error: {
        code: 'PLATFORM_VALIDATION_FAILED',
        message: 'Invalid body',
        details: [{ path: ['count'], message: 'Too small' }],
      },
    });
    expect(result.success).toBe(true);
  });

  it.each(['platform_not_found', 'NOT_FOUND', 'WIDGET_BROKEN'])(
    'rejects code %s',
    (code) => {
      const result = errorBodySchema.safeParse({
        error: { code, message: 'x' },
      });
      expect(result.success).toBe(false);
    },
  );

  it('gives every platform code a valid code and an HTTP status', () => {
    for (const code of Object.values(PLATFORM_ERROR_CODES)) {
      expect(errorCodeSchema.safeParse(code).success).toBe(true);
    }
    expect(Object.keys(PLATFORM_ERROR_STATUS).sort()).toEqual(
      Object.values(PLATFORM_ERROR_CODES).sort(),
    );
    expect(PLATFORM_ERROR_STATUS.PLATFORM_NOT_FOUND).toBe(404);
  });
});

describe('echo request', () => {
  it('accepts count 3 and intervalMs 1000', () => {
    expect(
      echoRequestSchema.safeParse({ count: 3, intervalMs: 1000 }).success,
    ).toBe(true);
  });

  it('rejects count 0', () => {
    expect(
      echoRequestSchema.safeParse({ count: 0, intervalMs: 0 }).success,
    ).toBe(false);
  });
});

describe('healthz and version info', () => {
  it('accepts a healthz body', () => {
    expect(
      healthzSchema.safeParse({ status: 'ok', version: '0.0.0-dev' }).success,
    ).toBe(true);
  });

  it('rejects a healthz status other than ok', () => {
    expect(
      healthzSchema.safeParse({ status: 'down', version: '0.0.0-dev' }).success,
    ).toBe(false);
  });

  it('accepts a version info body', () => {
    const result = versionInfoSchema.safeParse({
      version: '1.2.3',
      revision: 'abc1234',
      builtAt: NOW,
      composeVersion: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects version info without composeVersion', () => {
    const result = versionInfoSchema.safeParse({
      version: '1.2.3',
      revision: 'abc1234',
      builtAt: NOW,
    });
    expect(result.success).toBe(false);
  });
});

describe('settings envelope', () => {
  const section = { schemaVersion: 1 };
  const body = {
    schemaVersion: 1,
    projects: section,
    providers: section,
    tools: section,
    agent: section,
    setupAuth: section,
  };

  it('accepts schemaVersion 1 with the five sections', () => {
    expect(settingsEnvelopeSchema.safeParse(body).success).toBe(true);
  });

  it('rejects schemaVersion 2', () => {
    expect(
      settingsEnvelopeSchema.safeParse({ ...body, schemaVersion: 2 }).success,
    ).toBe(false);
  });

  it('rejects an unknown top-level key', () => {
    expect(
      settingsEnvelopeSchema.safeParse({ ...body, extra: section }).success,
    ).toBe(false);
  });

  it('rejects a section without an integer schemaVersion', () => {
    expect(
      settingsEnvelopeSchema.safeParse({ ...body, tools: {} }).success,
    ).toBe(false);
  });

  it('has exactly the section keys the constant lists, plus schemaVersion', () => {
    expect(Object.keys(settingsEnvelopeSchema.shape).sort()).toEqual(
      ['schemaVersion', ...SETTINGS_SECTION_KEYS].sort(),
    );
  });
});

describe('stream, route and method constants', () => {
  it('exports the route and stream values', () => {
    expect(EVENTS_ROUTE).toBe('/events');
    expect(ECHO_ROUTE).toBe('/api/platform/echo');
    expect(HEALTHZ_ROUTE).toBe('/healthz');
    expect(VERSION_ROUTE).toBe('/api/platform/version');
    expect(SSE_RETRY_MS).toBe(3000);
    expect(SSE_HEARTBEAT_MS).toBe(15000);
  });

  it('reads are GET and commands are POST', () => {
    expect(HTTP_METHOD_CONVENTION).toEqual({ read: 'GET', command: 'POST' });
  });
});

describe('SCRIBA_ENV_DEFAULTS', () => {
  it('lists the 14 SCRIBA_* names and no TS_* names', () => {
    const names = Object.keys(SCRIBA_ENV_DEFAULTS);
    expect(names).toHaveLength(14);
    expect(names.every((name) => name.startsWith('SCRIBA_'))).toBe(true);
  });

  it('keeps the setup URL template as text and leaves the compose version to the installer', () => {
    expect(SCRIBA_ENV_DEFAULTS.SCRIBA_SETUP_URL_BASE).toBe(
      'http://127.0.0.1:${SCRIBA_PORT}',
    );
    expect(SCRIBA_ENV_DEFAULTS.SCRIBA_COMPOSE_VERSION).toBeNull();
  });
});
