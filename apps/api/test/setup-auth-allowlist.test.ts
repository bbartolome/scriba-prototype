import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { VERSION_ROUTE } from '@bbartolome/scriba-contracts/platform';
import {
  ALLOWLIST_ROUTE,
  IDENTITY_ROUTE,
  SETUP_STATUS_ROUTE,
} from '@bbartolome/scriba-contracts/setup-auth';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import {
  startFakeLocalApi,
  type FakeLocalApi,
  type LocalApiFixture,
} from './localapi-fake';

// The tailnet name of the running-certs fixture, whose owner is ADA. BOB is a shared-in login that is not the owner.
const TAILNET_NAME = 'scriba-1.tail1234.ts.net';
const TAILNET_ORIGIN = `https://${TAILNET_NAME}`;
const ADA = 'ada@example.com';
const BOB = 'bob@example.com';
const LOOPBACK_HOST = '127.0.0.1:8080';
const LOOPBACK_ORIGIN = 'http://127.0.0.1:8080';
const STATIC_ROOT = resolve(__dirname, 'fixtures/static');
const TEST_TIMEOUT_MS = 30000;

// Boots the composed app on a fake LocalAPI of one fixture, against a temp library that is removed on every path.
async function withApp(
  fixture: LocalApiFixture,
  body: (app: TestApp, library: string, fake: FakeLocalApi) => Promise<void>,
): Promise<void> {
  const fake = await startFakeLocalApi(fixture);
  const library = mkdtempSync(join(tmpdir(), 'scriba-allowlist-'));
  let app: TestApp | undefined;
  try {
    app = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
      env: { SCRIBA_TS_SOCKET: fake.socketPath },
    });
    await body(app, library, fake);
  } finally {
    try {
      await app?.close();
    } finally {
      await fake.close();
      rmSync(library, { recursive: true, force: true });
    }
  }
}

function codeOf(reply: Reply): string | undefined {
  return (JSON.parse(reply.body) as { error?: { code?: string } }).error?.code;
}

// The Serve login header for a tailnet request.
function as(login: string): Record<string, string> {
  return { 'Tailscale-User-Login': login };
}

it(
  'criterion 1: with the allowlist on, a tailnet login that is not listed gets 403 AUTH_TAILNET_NOT_ALLOWED on version, identity and status, and a listed login gets 200',
  async () => {
    await withApp('running-certs', async (app, library) => {
      const cookie = await sessionCookie(app, library);
      const on = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: ALLOWLIST_ROUTE,
        method: 'POST',
        body: JSON.stringify({ enabled: true, logins: [ADA] }),
        origin: LOOPBACK_ORIGIN,
        cookie,
      });
      expect(on.status).toBe(200);
      expect(JSON.parse(on.body)).toEqual({ enabled: true, logins: [ADA] });

      // The unlisted login is refused on every route, public routes included (plan D7).
      for (const path of [VERSION_ROUTE, IDENTITY_ROUTE, SETUP_STATUS_ROUTE]) {
        const refused = await send(app.baseUrl, {
          host: TAILNET_NAME,
          path,
          headers: as(BOB),
        });
        expect(refused.status).toBe(403);
        expect(codeOf(refused)).toBe('AUTH_TAILNET_NOT_ALLOWED');
      }

      const listed = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: VERSION_ROUTE,
        headers: as(ADA),
      });
      expect(listed.status).toBe(200);
    });
  },
  TEST_TIMEOUT_MS,
);

it(
  'criterion 2: enabling from a tailnet login the new list would not include gets 403 SETUP_ALLOWLIST_LOCKOUT and writes nothing; enabling with an empty list seeds the owner, from the tailnet and from loopback',
  async () => {
    await withApp('running-certs', async (app, library) => {
      const cookie = await sessionCookie(app, library);

      // Start: the allowlist is off and the list is empty (the default).
      // 1. BOB tries to turn it on. The new list would not hold BOB, so the change is refused and nothing is written.
      const lockout = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: ALLOWLIST_ROUTE,
        method: 'POST',
        body: JSON.stringify({ enabled: true }),
        origin: TAILNET_ORIGIN,
        headers: as(BOB),
      });
      expect(lockout.status).toBe(403);
      expect(codeOf(lockout)).toBe('SETUP_ALLOWLIST_LOCKOUT');
      const unchanged = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: ALLOWLIST_ROUTE,
        cookie,
      });
      expect(JSON.parse(unchanged.body)).toEqual({
        enabled: false,
        logins: [],
      });

      // 2. ADA turns it on with an empty list. The owner is seeded from ownerLogin.
      const seeded = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: ALLOWLIST_ROUTE,
        method: 'POST',
        body: JSON.stringify({ enabled: true }),
        origin: TAILNET_ORIGIN,
        headers: as(ADA),
      });
      expect(seeded.status).toBe(200);
      expect(JSON.parse(seeded.body)).toEqual({ enabled: true, logins: [ADA] });

      // 3. ADA replaces the list with one that leaves ADA out, while the list is on. Refused (plan C3).
      const selfExclude = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: ALLOWLIST_ROUTE,
        method: 'POST',
        body: JSON.stringify({ logins: [BOB] }),
        origin: TAILNET_ORIGIN,
        headers: as(ADA),
      });
      expect(selfExclude.status).toBe(403);
      expect(codeOf(selfExclude)).toBe('SETUP_ALLOWLIST_LOCKOUT');
      const stillAda = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: ALLOWLIST_ROUTE,
        cookie,
      });
      expect(JSON.parse(stillAda.body)).toEqual({
        enabled: true,
        logins: [ADA],
      });

      // 4. ADA turns it off. Turning off over the tailnet is never refused.
      const off = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: ALLOWLIST_ROUTE,
        method: 'POST',
        body: JSON.stringify({ enabled: false }),
        origin: TAILNET_ORIGIN,
        headers: as(ADA),
      });
      expect(off.status).toBe(200);
      expect(JSON.parse(off.body)).toEqual({ enabled: false, logins: [ADA] });

      // 5. Loopback empties the list while it is off.
      const emptied = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: ALLOWLIST_ROUTE,
        method: 'POST',
        body: JSON.stringify({ logins: [] }),
        origin: LOOPBACK_ORIGIN,
        cookie,
      });
      expect(emptied.status).toBe(200);
      expect(JSON.parse(emptied.body)).toEqual({ enabled: false, logins: [] });

      // 6. Loopback turns it on with an empty list. The owner is seeded from the loopback request too.
      const seededFromLoopback = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: ALLOWLIST_ROUTE,
        method: 'POST',
        body: JSON.stringify({ enabled: true }),
        origin: LOOPBACK_ORIGIN,
        cookie,
      });
      expect(seededFromLoopback.status).toBe(200);
      expect(JSON.parse(seededFromLoopback.body)).toEqual({
        enabled: true,
        logins: [ADA],
      });
    });
  },
  TEST_TIMEOUT_MS,
);

it(
  'criterion 3: with the allowlist on, loopback with the cookie still gets 200 on version, status, identity and the allowlist, and may change the list; a tailnet login that is not listed is still refused',
  async () => {
    await withApp('running-certs', async (app, library) => {
      const cookie = await sessionCookie(app, library);

      // 1. Loopback turns the allowlist on with the owner listed.
      const on = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: ALLOWLIST_ROUTE,
        method: 'POST',
        body: JSON.stringify({ enabled: true, logins: [ADA] }),
        origin: LOOPBACK_ORIGIN,
        cookie,
      });
      expect(on.status).toBe(200);

      // 2. Control: the unlisted tailnet login is refused.
      const refused = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: VERSION_ROUTE,
        headers: as(BOB),
      });
      expect(refused.status).toBe(403);
      expect(codeOf(refused)).toBe('AUTH_TAILNET_NOT_ALLOWED');

      // 3. Loopback with the cookie is admitted on every route, and the identity is loopback.
      const version = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: VERSION_ROUTE,
        cookie,
      });
      expect(version.status).toBe(200);
      const status = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: SETUP_STATUS_ROUTE,
        cookie,
      });
      expect(status.status).toBe(200);
      const identity = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: IDENTITY_ROUTE,
        cookie,
      });
      expect(identity.status).toBe(200);
      expect(JSON.parse(identity.body)).toEqual({ via: 'loopback' });
      const list = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: ALLOWLIST_ROUTE,
        cookie,
      });
      expect(list.status).toBe(200);

      // 4. Loopback replaces the list with one that leaves the owner out. Allowed: the lockout rule covers the tailnet only (plan D3).
      const leaveOwnerOut = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: ALLOWLIST_ROUTE,
        method: 'POST',
        body: JSON.stringify({ logins: [BOB] }),
        origin: LOOPBACK_ORIGIN,
        cookie,
      });
      expect(leaveOwnerOut.status).toBe(200);

      // 5. The owner is now refused over the tailnet, and loopback still works.
      const ownerRefused = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: VERSION_ROUTE,
        headers: as(ADA),
      });
      expect(ownerRefused.status).toBe(403);
      expect(codeOf(ownerRefused)).toBe('AUTH_TAILNET_NOT_ALLOWED');
      const loopbackStill = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: VERSION_ROUTE,
        cookie,
      });
      expect(loopbackStill.status).toBe(200);
    });
  },
  TEST_TIMEOUT_MS,
);

it(
  'E1: with no owner login known, enabling from loopback with an empty list leaves the list empty and on, and loopback with the cookie still works',
  async () => {
    await withApp('logged-out', async (app, library) => {
      const cookie = await sessionCookie(app, library);

      // 1. No owner login is known, so there is nothing to seed (plan open point 2).
      const enabled = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: ALLOWLIST_ROUTE,
        method: 'POST',
        body: JSON.stringify({ enabled: true }),
        origin: LOOPBACK_ORIGIN,
        cookie,
      });
      expect(enabled.status).toBe(200);
      expect(JSON.parse(enabled.body)).toEqual({ enabled: true, logins: [] });

      // 2. Loopback with the cookie still works.
      const version = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: VERSION_ROUTE,
        cookie,
      });
      expect(version.status).toBe(200);

      // 3. The stored state is on with an empty list.
      const list = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: ALLOWLIST_ROUTE,
        cookie,
      });
      expect(JSON.parse(list.body)).toEqual({ enabled: true, logins: [] });
    });
  },
  TEST_TIMEOUT_MS,
);
