import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Type } from '@nestjs/common';
import { expect, it } from 'vitest';
import { VERSION_ROUTE } from '@bbartolome/scriba-contracts/platform';
import { COMPOSED_MODULES } from '../src/app.module';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie } from './guard-request';
import {
  EventPublishingGetProbeModule,
  MutatingGetProbeModule,
} from './invariant-probe';
import {
  EVENT_WAIT_MS,
  LOOPBACK_HOST,
  observeEvents,
  seedFixtures,
  sweepGetHead,
  type Violation,
} from './invariant-sweep';

const STATIC_ROOT = resolve(__dirname, 'fixtures/static');
const SWEEP_TIMEOUT_MS = 60000;

function tempLibrary(): string {
  return mkdtempSync(join(tmpdir(), 'scriba-invariant-'));
}

// Boots an app on a fresh library, runs the body with its cookie, then closes the app and removes the library.
async function withApp<T>(
  modules: Type<unknown>[] | undefined,
  body: (app: TestApp, cookie: string, library: string) => Promise<T>,
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
      return await body(app, cookie, library);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
}

// Test 1: GET and HEAD never mutate. Its controls show that the cookie and the handshake's success branch are real.
it(
  'GET and HEAD to every enumerated route leave the library and the event stream unchanged',
  async () => {
    await withApp(undefined, async (app, cookie, library) => {
      const version = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: VERSION_ROUTE,
        cookie,
      });
      expect(version.status).toBe(200);
      const setupUrl = new URL(
        readFileSync(join(library, '.scriba', 'setup-url'), 'utf8').trim(),
      );
      const handshake = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: `${setupUrl.pathname}${setupUrl.search}`,
      });
      expect(handshake.status).toBe(303);

      const observer = await observeEvents(app.baseUrl, LOOPBACK_HOST, cookie);
      let violations: Violation[];
      try {
        violations = await sweepGetHead(app, cookie, library, observer);
      } finally {
        await observer.close();
      }
      expect(violations).toEqual([]);
    });
  },
  SWEEP_TIMEOUT_MS,
);

// Control N1: a GET that writes to the library is reported by the verdict of test 1.
it(
  'a mutating GET in a test-only module is reported by the verdict of test 1',
  async () => {
    await withApp(
      [...COMPOSED_MODULES, MutatingGetProbeModule],
      async (app, cookie, library) => {
        const observer = await observeEvents(
          app.baseUrl,
          LOOPBACK_HOST,
          cookie,
        );
        let violations: Violation[];
        try {
          violations = await sweepGetHead(app, cookie, library, observer);
        } finally {
          await observer.close();
        }
        expect(violations).toEqual([
          {
            kind: 'library-changed',
            method: 'GET',
            path: '/api/invariant-probe/mutating-get',
          },
        ]);
        const probe = await send(app.baseUrl, {
          host: LOOPBACK_HOST,
          path: '/api/invariant-probe/mutating-get',
          cookie,
        });
        expect(probe.status).toBe(200);
      },
    );
  },
  SWEEP_TIMEOUT_MS,
);

// Control N4: a GET that publishes an event is reported by the verdict of test 1.
it(
  'a GET that publishes an event is reported by the verdict of test 1',
  async () => {
    await withApp(
      [...COMPOSED_MODULES, EventPublishingGetProbeModule],
      async (app, cookie, library) => {
        const observer = await observeEvents(
          app.baseUrl,
          LOOPBACK_HOST,
          cookie,
        );
        try {
          const violations = await sweepGetHead(app, cookie, library, observer);
          expect(violations).toEqual([
            {
              kind: 'event-emitted',
              method: 'GET',
              path: '/api/invariant-probe/publishing-get',
            },
          ]);
          // The control: the probe answers, and its event reaches the observer during that request.
          const probe = await send(app.baseUrl, {
            host: LOOPBACK_HOST,
            path: '/api/invariant-probe/publishing-get',
            cookie,
          });
          expect(probe.status).toBe(200);
          const blocks = await observer.take(EVENT_WAIT_MS);
          expect(
            blocks.some((block) => block.includes('"type":"probe-published"')),
          ).toBe(true);
        } finally {
          await observer.close();
        }
      },
    );
  },
  SWEEP_TIMEOUT_MS,
);
