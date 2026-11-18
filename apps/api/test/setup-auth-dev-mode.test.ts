import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it, vi } from 'vitest';
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

// The guard tests of SAU-22 (dev mode, SCRIBA_DEV_AUTH). Every app here is created with an explicit env.
const LOOPBACK_HOST = '127.0.0.1:8080';
const ORIGIN = 'http://127.0.0.1:8080';
const CSP = "frame-ancestors 'none'";
const STATIC_ROOT = resolve(__dirname, 'fixtures/static');
const MAIN = resolve(__dirname, '..', 'dist', 'main.js');
const ECHO_BODY = JSON.stringify({ count: 1, intervalMs: 0 });
const TAILNET_NAME = 'scriba-1.tail1234.ts.net';
const TAILNET_ORIGIN = `https://${TAILNET_NAME}`;
const LOGIN_HEADER = { 'Tailscale-User-Login': 'ada@example.com' };
const TIMEOUT_MS = 30000;

function errorCode(reply: Reply): string | undefined {
  return (JSON.parse(reply.body) as { error?: { code?: string } }).error?.code;
}

function accessControlHeaders(reply: Reply): string[] {
  return Object.keys(reply.headers).filter((name) =>
    name.startsWith('access-control-'),
  );
}

// Creates an app with its own temp library, runs the body, and removes the library on every path.
async function withDevApp(
  env: Record<string, string | undefined>,
  body: (app: TestApp, library: string) => Promise<void>,
): Promise<void> {
  const library = mkdtempSync(join(tmpdir(), 'scriba-devauth-'));
  let app: TestApp | undefined;
  try {
    app = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
      env,
    });
    await body(app, library);
  } finally {
    try {
      await app?.close();
    } finally {
      rmSync(library, { recursive: true, force: true });
    }
  }
}

// Boots the composed app on a fake LocalAPI of one fixture, for the tailnet Host.
async function withTailnetApp(
  fixture: LocalApiFixture,
  env: Record<string, string | undefined>,
  body: (app: TestApp) => Promise<void>,
): Promise<void> {
  const fake: FakeLocalApi = await startFakeLocalApi(fixture);
  const library = mkdtempSync(join(tmpdir(), 'scriba-devauth-ts-'));
  let app: TestApp | undefined;
  try {
    app = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
      env: { SCRIBA_TS_SOCKET: fake.socketPath, ...env },
    });
    await body(app);
  } finally {
    try {
      await app?.close();
    } finally {
      await fake.close();
      rmSync(library, { recursive: true, force: true });
    }
  }
}

it(
  'criterion 1: with SCRIBA_DEV_AUTH unset or 0, a cookie-less GET answers 401 AUTH_REQUIRED, and with a valid cookie a POST with a foreign or missing Origin answers 403 AUTH_ORIGIN_REJECTED',
  async () => {
    for (const env of [{}, { SCRIBA_DEV_AUTH: '0' }]) {
      await withDevApp(env, async (app, library) => {
        const bare = await send(app.baseUrl, {
          host: LOOPBACK_HOST,
          path: VERSION_ROUTE,
        });
        expect(bare.status, JSON.stringify(env)).toBe(401);
        expect(errorCode(bare), JSON.stringify(env)).toBe('AUTH_REQUIRED');

        const cookie = await sessionCookie(app, library);
        const foreign = await send(app.baseUrl, {
          host: LOOPBACK_HOST,
          path: ECHO_ROUTE,
          method: 'POST',
          body: ECHO_BODY,
          cookie,
          origin: 'https://evil.example',
        });
        expect(foreign.status, JSON.stringify(env)).toBe(403);
        expect(errorCode(foreign), JSON.stringify(env)).toBe(
          'AUTH_ORIGIN_REJECTED',
        );

        const missing = await send(app.baseUrl, {
          host: LOOPBACK_HOST,
          path: ECHO_ROUTE,
          method: 'POST',
          body: ECHO_BODY,
          cookie,
        });
        expect(missing.status, JSON.stringify(env)).toBe(403);
        expect(errorCode(missing), JSON.stringify(env)).toBe(
          'AUTH_ORIGIN_REJECTED',
        );

        // Control: the same POST with its own Origin is accepted.
        const own = await send(app.baseUrl, {
          host: LOOPBACK_HOST,
          path: ECHO_ROUTE,
          method: 'POST',
          body: ECHO_BODY,
          cookie,
          origin: ORIGIN,
        });
        expect(own.status, JSON.stringify(env)).toBe(202);
      });
    }
  },
  TIMEOUT_MS,
);

it(
  'criterion 2: with SCRIBA_DEV_AUTH=1, a cookie-less GET of VERSION_ROUTE, SETUP_STATUS_ROUTE and IDENTITY_ROUTE gives 200 with the identity loopback, and a cookie-less POST to ECHO_ROUTE with no Origin gives 202',
  async () => {
    await withDevApp({ SCRIBA_DEV_AUTH: '1' }, async (app) => {
      const version = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: VERSION_ROUTE,
      });
      expect(version.status).toBe(200);

      const status = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: SETUP_STATUS_ROUTE,
      });
      expect(status.status).toBe(200);

      const identity = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: IDENTITY_ROUTE,
      });
      expect(identity.status).toBe(200);
      expect(JSON.parse(identity.body)).toEqual({ via: 'loopback' });

      const post = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: ECHO_ROUTE,
        method: 'POST',
        body: ECHO_BODY,
      });
      expect(post.status).toBe(202);
    });
  },
  TIMEOUT_MS,
);

it(
  "criterion 3: with SCRIBA_DEV_AUTH=1, every foreign Host gets 403 AUTH_HOST_REJECTED, no response carries an access-control-* header, and every response carries frame-ancestors 'none'",
  async () => {
    await withDevApp({ SCRIBA_DEV_AUTH: '1' }, async (app) => {
      const hosts = [
        'evil.example:8080',
        '127.0.0.1:9999',
        'scriba:8080',
        '127.0.0.1',
        'localhost:9999',
        'localhost:4200',
      ];
      for (const host of hosts) {
        const reply = await send(app.baseUrl, { host, path: VERSION_ROUTE });
        expect(reply.status, host).toBe(403);
        expect(errorCode(reply), host).toBe('AUTH_HOST_REJECTED');
        expect(reply.headers['content-security-policy'], host).toContain(CSP);
        expect(accessControlHeaders(reply), host).toEqual([]);
      }

      const preflight = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: VERSION_ROUTE,
        method: 'OPTIONS',
        origin: 'https://evil.example',
        headers: { 'Access-Control-Request-Method': 'GET' },
      });
      expect(accessControlHeaders(preflight)).toEqual([]);
      expect(preflight.headers['content-security-policy']).toContain(CSP);

      const allowed = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: VERSION_ROUTE,
      });
      expect(allowed.status).toBe(200);
      expect(accessControlHeaders(allowed)).toEqual([]);
      expect(allowed.headers['content-security-policy']).toContain(CSP);
    });
  },
  TIMEOUT_MS,
);

// Extra (not a criterion): the spawned boot with the flag and NODE_ENV=production is refused.
it(
  'criterion 4: spawning dist/main.js with SCRIBA_DEV_AUTH=1 and NODE_ENV=production exits 1 with stdout empty and one stderr line; without the flag, or with 0, the same production boot serves a cookie-less request with 401',
  async () => {
    const dirs = [0, 1, 2].map(() =>
      mkdtempSync(join(tmpdir(), 'scriba-devauth-boot-')),
    );
    try {
      const [books, packs, examples] = dirs;
      const result = spawnSync(process.execPath, [MAIN], {
        env: {
          SCRIBA_BOOKS_DIR: books,
          SCRIBA_PACKS_DIR: packs,
          SCRIBA_EXAMPLES_DIR: examples,
          SCRIBA_LOG_LEVEL: 'error',
          SCRIBA_DEV_AUTH: '1',
          NODE_ENV: 'production',
        },
        encoding: 'utf8',
        timeout: 8000,
      });
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr.trim()).toBe(
        'Invalid SCRIBA_DEV_AUTH "1": dev mode is refused when NODE_ENV is production.',
      );
      const stackFrame = result.stderr
        .split('\n')
        .some((line) => /^\s+at /.test(line));
      expect(stackFrame).toBe(false);
    } finally {
      for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    }

    for (const env of [
      { NODE_ENV: 'production' },
      { NODE_ENV: 'production', SCRIBA_DEV_AUTH: '0' },
    ]) {
      await withDevApp(env, async (app) => {
        const bare = await send(app.baseUrl, {
          host: LOOPBACK_HOST,
          path: VERSION_ROUTE,
        });
        expect(bare.status, JSON.stringify(env)).toBe(401);
        expect(errorCode(bare), JSON.stringify(env)).toBe('AUTH_REQUIRED');
      });
    }
  },
  TIMEOUT_MS,
);

it(
  'criterion 5: the dev script sets SCRIBA_DEV_AUTH=1 next to SCRIBA_DEV_ORIGINS for the API process, and with that env a cookie-less status, identity and mutation on localhost:4200 succeed',
  async () => {
    const packageJson = JSON.parse(
      readFileSync(
        resolve(__dirname, '..', '..', '..', 'package.json'),
        'utf8',
      ),
    ) as { scripts: { dev: string } };
    const match = /"([^"]*node --watch apps\/api\/dist\/main\.js)"/.exec(
      packageJson.scripts.dev,
    );
    expect(match).not.toBeNull();
    const apiCommand = match?.[1] ?? '';
    expect(apiCommand).toContain('SCRIBA_DEV_AUTH=1');
    expect(apiCommand).toContain('SCRIBA_DEV_ORIGINS=http://localhost:4200');

    await withDevApp(
      {
        SCRIBA_DEV_AUTH: '1',
        SCRIBA_DEV_ORIGINS: 'http://localhost:4200',
        SCRIBA_SETUP_URL_BASE: 'http://localhost:4200',
      },
      async (app) => {
        const host = 'localhost:4200';
        const status = await send(app.baseUrl, {
          host,
          path: SETUP_STATUS_ROUTE,
        });
        expect(status.status).toBe(200);

        const identity = await send(app.baseUrl, {
          host,
          path: IDENTITY_ROUTE,
        });
        expect(identity.status).toBe(200);
        expect(JSON.parse(identity.body)).toEqual({ via: 'loopback' });

        const post = await send(app.baseUrl, {
          host,
          path: ECHO_ROUTE,
          method: 'POST',
          body: ECHO_BODY,
          origin: 'http://localhost:4200',
        });
        expect(post.status).toBe(202);
      },
    );
  },
  TIMEOUT_MS,
);

it(
  'E1: with SCRIBA_DEV_AUTH=1 the boot writes the dev-mode warning to stderr, and with the flag unset it writes no such line',
  async () => {
    const warning = 'SCRIBA_DEV_AUTH=1: dev mode is on';
    const countWarnings = (spy: { mock: { calls: unknown[][] } }): number =>
      spy.mock.calls.filter((call) => String(call[0]).includes(warning)).length;

    const onSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    try {
      await withDevApp({ SCRIBA_DEV_AUTH: '1' }, async () => {});
      expect(countWarnings(onSpy)).toBe(1);
    } finally {
      onSpy.mockRestore();
    }

    const offSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    try {
      await withDevApp({}, async () => {});
      expect(countWarnings(offSpy)).toBe(0);
    } finally {
      offSpy.mockRestore();
    }
  },
  TIMEOUT_MS,
);

it(
  'E2: SCRIBA_DEV_AUTH=true and an empty value are refused with the expected 0 or 1 message',
  async () => {
    await expect(
      createTestApp({
        staticRoot: STATIC_ROOT,
        env: { SCRIBA_DEV_AUTH: 'true' },
      }),
    ).rejects.toThrow('Invalid SCRIBA_DEV_AUTH "true": expected 0 or 1.');
    await expect(
      createTestApp({ staticRoot: STATIC_ROOT, env: { SCRIBA_DEV_AUTH: '' } }),
    ).rejects.toThrow('Invalid SCRIBA_DEV_AUTH "": expected 0 or 1.');
  },
  TIMEOUT_MS,
);

it(
  'E3: with SCRIBA_DEV_AUTH=1 and the fake LocalAPI in running-certs, a tailnet request without the login header gets 403 AUTH_TAILNET_IDENTITY_MISSING, and a tailnet POST with no Origin or an http:// Origin gets 403 AUTH_ORIGIN_REJECTED',
  async () => {
    await withTailnetApp(
      'running-certs',
      { SCRIBA_DEV_AUTH: '1' },
      async (app) => {
        const tailnetHost = TAILNET_NAME;

        const noHeader = await send(app.baseUrl, {
          host: tailnetHost,
          path: VERSION_ROUTE,
        });
        expect(noHeader.status).toBe(403);
        expect(errorCode(noHeader)).toBe('AUTH_TAILNET_IDENTITY_MISSING');

        const identityNoHeader = await send(app.baseUrl, {
          host: tailnetHost,
          path: IDENTITY_ROUTE,
        });
        expect(identityNoHeader.status).toBe(403);
        expect(errorCode(identityNoHeader)).toBe(
          'AUTH_TAILNET_IDENTITY_MISSING',
        );

        const version = await send(app.baseUrl, {
          host: tailnetHost,
          path: VERSION_ROUTE,
          headers: LOGIN_HEADER,
        });
        expect(version.status).toBe(200);

        const noOrigin = await send(app.baseUrl, {
          host: tailnetHost,
          path: ECHO_ROUTE,
          method: 'POST',
          body: ECHO_BODY,
          headers: LOGIN_HEADER,
        });
        expect(noOrigin.status).toBe(403);
        expect(errorCode(noOrigin)).toBe('AUTH_ORIGIN_REJECTED');

        const httpOrigin = await send(app.baseUrl, {
          host: tailnetHost,
          path: ECHO_ROUTE,
          method: 'POST',
          body: ECHO_BODY,
          origin: `http://${TAILNET_NAME}`,
          headers: LOGIN_HEADER,
        });
        expect(httpOrigin.status).toBe(403);
        expect(errorCode(httpOrigin)).toBe('AUTH_ORIGIN_REJECTED');

        // Control: the https Origin of the tailnet Host is accepted.
        const httpsOrigin = await send(app.baseUrl, {
          host: tailnetHost,
          path: ECHO_ROUTE,
          method: 'POST',
          body: ECHO_BODY,
          origin: TAILNET_ORIGIN,
          headers: LOGIN_HEADER,
        });
        expect(httpsOrigin.status).toBe(202);

        // Control in the same app: dev mode is on for the loopback Host, with no cookie.
        const loopback = await send(app.baseUrl, {
          host: LOOPBACK_HOST,
          path: VERSION_ROUTE,
        });
        expect(loopback.status).toBe(200);
      },
    );
  },
  TIMEOUT_MS,
);
