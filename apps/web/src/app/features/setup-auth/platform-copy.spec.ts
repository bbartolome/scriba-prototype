import {
  VERSION_ROUTE,
  versionInfoSchema,
} from '@bbartolome/scriba-contracts/platform';
import { describe, expect, it } from 'vitest';
import { VERSION_PATH, versionInfoCopy } from './platform-copy';

// The samples of shell/platform-copies.spec.ts, plus a negative composeVersion. `z.number().int()`
// accepts negatives, so the negative sample is accepted by both the contract and the copy.
const accepted: unknown[] = [
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
  {
    version: '1.2.3',
    revision: 'abc1234',
    builtAt: '2026-11-14T00:00:00Z',
    composeVersion: -1,
  },
];

const refused: unknown[] = [
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

describe('P1 the settings platform copy', () => {
  it('P1 the settings platform copy agrees with the contract', () => {
    expect(VERSION_PATH).toBe(VERSION_ROUTE);

    for (const sample of accepted) {
      expect(versionInfoSchema.safeParse(sample).success).toBe(true);
      expect(versionInfoCopy.safeParse(sample).success).toBe(true);
    }
    for (const sample of refused) {
      expect(versionInfoSchema.safeParse(sample).success).toBe(false);
      expect(versionInfoCopy.safeParse(sample).success).toBe(false);
    }
    for (const sample of [...accepted, ...refused]) {
      expect(versionInfoCopy.safeParse(sample).success).toBe(
        versionInfoSchema.safeParse(sample).success,
      );
    }
  });
});
