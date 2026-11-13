import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Type } from '@nestjs/common';
import { expect, it } from 'vitest';
import { VERSION_ROUTE } from '@bbartolome/scriba-contracts/platform';
import { COMPOSED_MODULES } from '../src/app.module';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie } from './guard-request';
import {
  PublicGetProbeModule,
  UnguardedPostProbeModule,
} from './invariant-probe';
import {
  LOOPBACK_HOST,
  LOOPBACK_ORIGIN,
  seedFixtures,
  sweepMutations,
} from './invariant-sweep';

const STATIC_ROOT = resolve(__dirname, 'fixtures/static');

function tempLibrary(): string {
  return mkdtempSync(join(tmpdir(), 'scriba-invariant-'));
}

// Boots an app on a fresh library, runs the body with its cookie, then closes the app and removes the library.
async function withApp<T>(
  modules: Type<unknown>[] | undefined,
  body: (app: TestApp, cookie: string) => Promise<T>,
): Promise<T> {
  const library = tempLibrary();
  try {
    seedFixtures(library);
    const app = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
      modules,
    });
    try {
      const cookie = await sessionCookie(app, library);
      return await body(app, cookie);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
}

// Test 2: mutations are guarded, and the public set is the fixed list. Its control shows that the cookie is real.
it('every mutation route refuses a request without a credential, a missing or foreign Origin, or a foreign Host; every other route answers 401 without a credential; the fixed public routes answer as their fixed behaviour', async () => {
  await withApp(undefined, async (app, cookie) => {
    // The coverage step: the static fallback template is the literal the fixed list names.
    expect(app.routes()).toContainEqual({ method: 'GET', path: '{*any}' });

    const version = await send(app.baseUrl, {
      host: LOOPBACK_HOST,
      path: VERSION_ROUTE,
      cookie,
    });
    expect(version.status).toBe(200);

    expect(await sweepMutations(app, cookie)).toEqual([]);
  });
});

// Control N2: an unguarded POST in a test-only module is reported by the verdict of test 2.
it('an unguarded POST in a test-only module is reported by the verdict of test 2', async () => {
  await withApp(
    [...COMPOSED_MODULES, UnguardedPostProbeModule],
    async (app, cookie) => {
      expect(await sweepMutations(app, cookie)).toEqual([
        {
          kind: 'no-credential-401',
          method: 'POST',
          path: '/api/invariant-probe/unguarded-post',
        },
      ]);
      const probe = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        method: 'POST',
        path: '/api/invariant-probe/unguarded-post',
        origin: LOOPBACK_ORIGIN,
      });
      expect(probe.status).toBe(202);
    },
  );
});

// Control N3: a GET outside the fixed list in a test-only module is reported by the verdict of test 2.
it('a GET outside the fixed list in a test-only module is reported by the verdict of test 2', async () => {
  await withApp(
    [...COMPOSED_MODULES, PublicGetProbeModule],
    async (app, cookie) => {
      expect(await sweepMutations(app, cookie)).toEqual([
        {
          kind: 'no-credential-401',
          method: 'GET',
          path: '/api/invariant-probe/public-get',
        },
      ]);
      const probe = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: '/api/invariant-probe/public-get',
      });
      expect(probe.status).toBe(200);
    },
  );
});
