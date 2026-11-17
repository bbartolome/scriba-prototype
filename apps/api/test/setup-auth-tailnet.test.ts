import { mkdtempSync, rmSync } from 'node:fs';
import { networkInterfaces, tmpdir } from 'node:os';
import { isIPv4 } from 'node:net';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import {
  ECHO_ROUTE,
  VERSION_ROUTE,
} from '@bbartolome/scriba-contracts/platform';
import {
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

// The tailnet name of the running-certs fixture, and the login the Serve header carries.
const TAILNET_NAME = 'scriba-1.tail1234.ts.net';
const TAILNET_ORIGIN = `https://${TAILNET_NAME}`;
const LOGIN = 'ada@example.com';
const LOGIN_HEADER = { 'Tailscale-User-Login': LOGIN };
const LOOPBACK_HOST = '127.0.0.1:8080';
const STATIC_ROOT = resolve(__dirname, 'fixtures/static');
const ECHO_BODY = JSON.stringify({ count: 1, intervalMs: 0 });
const CSP = "frame-ancestors 'none'";
const TEST_TIMEOUT_MS = 30000;

// Boots the composed app on a fake LocalAPI of one fixture, against a temp library that is removed on every path.
async function withApp(
  fixture: LocalApiFixture,
  body: (app: TestApp, library: string, fake: FakeLocalApi) => Promise<void>,
  listenHost?: string,
): Promise<void> {
  const fake = await startFakeLocalApi(fixture);
  const library = mkdtempSync(join(tmpdir(), 'scriba-tailnet-'));
  let app: TestApp | undefined;
  try {
    app = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
      listenHost,
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

// The first IPv4 address of this machine that is not internal and not in the tailnet range 100.64.0.0/10 (plan D16).
function nonTailnetIPv4(): string | undefined {
  for (const infos of Object.values(networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.internal || !isIPv4(info.address)) continue;
      const [first, second] = info.address.split('.').map(Number);
      const inTailnetRange =
        first === 100 && second !== undefined && second >= 64 && second <= 127;
      if (!inTailnetRange) return info.address;
    }
  }
  return undefined;
}

it(
  'criterion 1: on the tailnet Host with a login from a loopback peer, version, identity, setup status and an https-Origin echo POST succeed with no cookie',
  async () => {
    await withApp('running-certs', async (app) => {
      const version = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: VERSION_ROUTE,
        headers: LOGIN_HEADER,
      });
      expect(version.status).toBe(200);

      const identity = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: IDENTITY_ROUTE,
        headers: LOGIN_HEADER,
      });
      expect(identity.status).toBe(200);
      expect(JSON.parse(identity.body)).toEqual({
        via: 'tailnet',
        login: LOGIN,
      });

      const status = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: SETUP_STATUS_ROUTE,
        headers: LOGIN_HEADER,
      });
      expect(status.status).toBe(200);

      const echo = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: ECHO_ROUTE,
        method: 'POST',
        body: ECHO_BODY,
        origin: TAILNET_ORIGIN,
        headers: LOGIN_HEADER,
      });
      expect(echo.status).toBe(202);
    });
  },
  TEST_TIMEOUT_MS,
);

it(
  'criterion 2: the header is ignored on a loopback Host (401), and from a non-loopback peer on the tailnet Host it is not trusted',
  async () => {
    const address = nonTailnetIPv4();
    if (address === undefined) {
      throw new Error(
        'criterion 2 needs a non-internal IPv4 address outside 100.64.0.0/10 on this machine (plan D16); none was found.',
      );
    }
    await withApp(
      'running-certs',
      async (app) => {
        const port = new URL(app.baseUrl).port;
        const remote = `http://${address}:${port}`;

        // (a) The header on a loopback Host, from a loopback peer, with no cookie: 401.
        const loopback = await send(app.baseUrl, {
          host: LOOPBACK_HOST,
          path: VERSION_ROUTE,
          headers: LOGIN_HEADER,
        });
        expect(loopback.status).toBe(401);
        expect(codeOf(loopback)).toBe('AUTH_REQUIRED');

        // (b) The tailnet Host from a non-loopback peer: the header is not trusted, so 403.
        const untrusted = await send(remote, {
          host: TAILNET_NAME,
          path: VERSION_ROUTE,
          headers: LOGIN_HEADER,
        });
        expect(untrusted.status).toBe(403);
        expect(codeOf(untrusted)).toBe('AUTH_TAILNET_IDENTITY_MISSING');

        // (c) Control: the same tailnet request from a loopback peer is admitted.
        const control = await send(app.baseUrl, {
          host: TAILNET_NAME,
          path: VERSION_ROUTE,
          headers: LOGIN_HEADER,
        });
        expect(control.status).toBe(200);
      },
      '0.0.0.0',
    );
  },
  TEST_TIMEOUT_MS,
);

it(
  'criterion 3: a tailnet POST with an http:// Origin gets 403 AUTH_ORIGIN_REJECTED, and the https:// control gets 202',
  async () => {
    await withApp('running-certs', async (app) => {
      const refused = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: ECHO_ROUTE,
        method: 'POST',
        body: ECHO_BODY,
        origin: `http://${TAILNET_NAME}`,
        headers: LOGIN_HEADER,
      });
      expect(refused.status).toBe(403);
      expect(codeOf(refused)).toBe('AUTH_ORIGIN_REJECTED');
      expect(refused.headers['content-security-policy']).toBe(CSP);

      const control = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: ECHO_ROUTE,
        method: 'POST',
        body: ECHO_BODY,
        origin: TAILNET_ORIGIN,
        headers: LOGIN_HEADER,
      });
      expect(control.status).toBe(202);
    });
  },
  TEST_TIMEOUT_MS,
);

it(
  'criterion 4: a tailnet request with no login header gets 403 AUTH_TAILNET_IDENTITY_MISSING, with or without a valid loopback cookie, and the header control gets 200',
  async () => {
    await withApp('running-certs', async (app, library) => {
      const bare = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: VERSION_ROUTE,
      });
      expect(bare.status).toBe(403);
      expect(codeOf(bare)).toBe('AUTH_TAILNET_IDENTITY_MISSING');
      expect(bare.headers['content-security-policy']).toBe(CSP);
      expect(JSON.parse(bare.body).error.message).toMatch(
        /Sign this device in to Tailscale as a user/,
      );

      // A public route on the tailnet Host gets the same refusal (plan D8).
      const identity = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: IDENTITY_ROUTE,
      });
      expect(identity.status).toBe(403);
      expect(codeOf(identity)).toBe('AUTH_TAILNET_IDENTITY_MISSING');

      // A valid loopback cookie is not a credential on the tailnet Host.
      const cookie = await sessionCookie(app, library);
      const withCookie = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: VERSION_ROUTE,
        cookie,
      });
      expect(withCookie.status).toBe(403);
      expect(codeOf(withCookie)).toBe('AUTH_TAILNET_IDENTITY_MISSING');

      const control = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: VERSION_ROUTE,
        headers: LOGIN_HEADER,
      });
      expect(control.status).toBe(200);
    });
  },
  TEST_TIMEOUT_MS,
);

it(
  'criterion 5: after the fake LocalAPI moves from logged-out to Running, the tailnet Host is admitted after one refresh with no restart, and repeated unknown Hosts cause no socket reads within the window',
  async () => {
    await withApp('logged-out', async (app, _library, fake) => {
      // (a) Logged out: the tailnet Host is not an allowed Host.
      const before = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: VERSION_ROUTE,
        headers: LOGIN_HEADER,
      });
      expect(before.status).toBe(403);
      expect(codeOf(before)).toBe('AUTH_HOST_REJECTED');

      // (b) Unknown Hosts inside the rate-limit window read the socket no further.
      const hitsBeforeUnknown = fake.hits();
      for (let i = 0; i < 3; i += 1) {
        const unknown = await send(app.baseUrl, {
          host: 'other.tail1234.ts.net',
          path: VERSION_ROUTE,
          headers: LOGIN_HEADER,
        });
        expect(unknown.status).toBe(403);
        expect(codeOf(unknown)).toBe('AUTH_HOST_REJECTED');
      }
      expect(fake.hits()).toBe(hitsBeforeUnknown);

      // (c) Tailscale logs in. After the refresh window the tailnet Host is admitted, with one socket read.
      fake.use('running-certs');
      await new Promise((resolveWait) => setTimeout(resolveWait, 1100));
      const hitsBeforeLogin = fake.hits();
      const after = await send(app.baseUrl, {
        host: TAILNET_NAME,
        path: VERSION_ROUTE,
        headers: LOGIN_HEADER,
      });
      expect(after.status).toBe(200);
      expect(fake.hits()).toBe(hitsBeforeLogin + 1);
    });
  },
  TEST_TIMEOUT_MS,
);
