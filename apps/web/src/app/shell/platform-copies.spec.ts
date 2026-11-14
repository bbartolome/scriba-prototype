import {
  HEALTHZ_ROUTE,
  healthzSchema,
  VERSION_ROUTE,
  versionInfoSchema,
} from '@bbartolome/scriba-contracts/platform';
import { describe, expect, it } from 'vitest';
import { HEALTHZ_PATH } from './sse-envelope';
import { healthzCopy, VERSION_PATH, versionInfoCopy } from './platform-copies';

const acceptedVersion: unknown[] = [
  {
    version: '1.2.3',
    revision: 'abc1234',
    builtAt: '2026-11-14T00:00:00Z',
    composeVersion: 1,
  },
  {
    version: '1.2.3',
    revision: 'abc1234',
    builtAt: '2026-11-14T00:00:00Z',
    composeVersion: 0,
  },
];

const refusedVersion: unknown[] = [
  {
    version: '',
    revision: 'abc1234',
    builtAt: '2026-11-14T00:00:00Z',
    composeVersion: 1,
  },
  {
    version: '1.2.3',
    revision: 'abc1234',
    builtAt: '2026-11-14T00:00:00Z',
    composeVersion: 1.5,
  },
  {
    version: '1.2.3',
    revision: 'abc1234',
    builtAt: '2026-11-14T00:00:00Z',
  },
  {
    version: '1.2.3',
    revision: '',
    builtAt: '2026-11-14T00:00:00Z',
    composeVersion: 1,
  },
  {
    version: '1.2.3',
    revision: 'abc1234',
    builtAt: '',
    composeVersion: 1,
  },
  {
    version: '1.2.3',
    revision: 'abc1234',
    composeVersion: 1,
  },
  {
    version: '1.2.3',
    revision: 'abc1234',
    builtAt: '2026-11-14T00:00:00Z',
    composeVersion: 2 ** 53,
  },
];

const acceptedHealth: unknown[] = [{ status: 'ok', version: '1.2.3' }];

const refusedHealth: unknown[] = [
  { status: 'down', version: '1.2.3' },
  { status: 'ok', version: '' },
  { status: 'ok' },
];

describe('platform copies', () => {
  it('the paths and the schemas agree with the contract', () => {
    expect(VERSION_PATH).toBe(VERSION_ROUTE);
    expect(HEALTHZ_PATH).toBe(HEALTHZ_ROUTE);

    for (const sample of acceptedVersion) {
      expect(versionInfoSchema.safeParse(sample).success).toBe(true);
      expect(versionInfoCopy.safeParse(sample).success).toBe(true);
    }
    for (const sample of refusedVersion) {
      expect(versionInfoSchema.safeParse(sample).success).toBe(false);
      expect(versionInfoCopy.safeParse(sample).success).toBe(false);
    }

    for (const sample of acceptedHealth) {
      expect(healthzSchema.safeParse(sample).success).toBe(true);
      expect(healthzCopy.safeParse(sample).success).toBe(true);
    }
    for (const sample of refusedHealth) {
      expect(healthzSchema.safeParse(sample).success).toBe(false);
      expect(healthzCopy.safeParse(sample).success).toBe(false);
    }
  });
});
