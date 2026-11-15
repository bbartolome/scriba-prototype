import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import {
  SETUP_CONTINUE_ROUTE,
  SETUP_STATUS_ROUTE,
  setupStatusSchema,
  type SetupStatus,
} from '@bbartolome/scriba-contracts/setup-auth';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';

// The port 8080 fixes the Host, the Origin and the cookie name (scriba_setup_8080).
const PORT = '8080';
const HOST = `127.0.0.1:${PORT}`;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const STATIC_ROOT = resolve(__dirname, 'fixtures/static');
const EXPECTED = Number(
  readFileSync(
    resolve(__dirname, '..', '..', '..', 'deploy', 'compose-version'),
    'utf8',
  ).trim(),
);

// Boots the composed app on a temp library with the given env, and runs the body. The app is closed, and the
// library removed, on every path.
async function withApp<T>(
  env: Record<string, string>,
  body: (app: TestApp, library: string) => Promise<T>,
): Promise<T> {
  const library = mkdtempSync(join(tmpdir(), 'scriba-compose-status-'));
  try {
    const app = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
      env: { SCRIBA_PORT: PORT, ...env },
    });
    try {
      return await body(app, library);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
}

// The 200 body of a status route. Every such body must pass the contract schema.
function statusOf(reply: Reply): SetupStatus {
  expect(reply.status).toBe(200);
  const body: unknown = JSON.parse(reply.body);
  expect(setupStatusSchema.safeParse(body).success).toBe(true);
  return body as SetupStatus;
}

async function getStatus(app: TestApp, cookie: string): Promise<SetupStatus> {
  return statusOf(
    await send(app.baseUrl, { host: HOST, path: SETUP_STATUS_ROUTE, cookie }),
  );
}

// A bodiless POST: Origin is the app's own, and Content-Length is 0.
async function postContinue(
  app: TestApp,
  cookie: string,
): Promise<SetupStatus> {
  return statusOf(
    await send(app.baseUrl, {
      host: HOST,
      path: SETUP_CONTINUE_ROUTE,
      method: 'POST',
      origin: ORIGIN,
      cookie,
      headers: { 'Content-Length': '0' },
    }),
  );
}

it('unset: the compose state is unknown, with the expected version and no actual', async () => {
  await withApp({}, async (app, library) => {
    const cookie = await sessionCookie(app, library);
    const status = await getStatus(app, cookie);
    // toStrictEqual also fails when `actual` is present with the value undefined.
    expect(status.compose).toStrictEqual({
      state: 'unknown',
      expected: EXPECTED,
    });
  });
});

it('older: mismatch with the expected and the actual version', async () => {
  await withApp(
    { SCRIBA_COMPOSE_VERSION: String(EXPECTED - 1) },
    async (app, library) => {
      const cookie = await sessionCookie(app, library);
      const status = await getStatus(app, cookie);
      expect(status.compose).toStrictEqual({
        state: 'mismatch',
        expected: EXPECTED,
        actual: EXPECTED - 1,
      });
    },
  );
});

it('equal: ok with the expected and the actual version', async () => {
  await withApp(
    { SCRIBA_COMPOSE_VERSION: String(EXPECTED) },
    async (app, library) => {
      const cookie = await sessionCookie(app, library);
      const status = await getStatus(app, cookie);
      expect(status.compose).toStrictEqual({
        state: 'ok',
        expected: EXPECTED,
        actual: EXPECTED,
      });
    },
  );
});

it('newer: mismatch, like any difference from the expected version', async () => {
  await withApp(
    { SCRIBA_COMPOSE_VERSION: String(EXPECTED + 1) },
    async (app, library) => {
      const cookie = await sessionCookie(app, library);
      const status = await getStatus(app, cookie);
      expect(status.compose).toStrictEqual({
        state: 'mismatch',
        expected: EXPECTED,
        actual: EXPECTED + 1,
      });
    },
  );
});

it('Continue answers the same compose state as GET', async () => {
  await withApp(
    { SCRIBA_COMPOSE_VERSION: String(EXPECTED - 1) },
    async (app, library) => {
      const cookie = await sessionCookie(app, library);
      const posted = await postContinue(app, cookie);
      const got = await getStatus(app, cookie);
      const compose = {
        state: 'mismatch',
        expected: EXPECTED,
        actual: EXPECTED - 1,
      };
      expect(posted.complete).toBe(true);
      expect(posted.compose).toStrictEqual(compose);
      expect(got.compose).toStrictEqual(compose);
    },
  );
});
