import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  EVENTS_ROUTE,
  HEALTHZ_ROUTE,
  VERSION_ROUTE,
} from '@bbartolome/scriba-contracts/platform';
import {
  HANDSHAKE_ROUTE,
  IDENTITY_ROUTE,
  SETUP_CONTINUE_ROUTE,
  SETUP_PAGE_PATH,
  SETUP_STATUS_ROUTE,
  SIGN_OUT_ROUTE,
} from '@bbartolome/scriba-contracts/setup-auth';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import {
  LOOPBACK_HOST,
  LOOPBACK_ORIGIN,
  seedFixtures,
  sweepMutations,
} from './invariant-sweep';

// The port 8080 fixes the Host, the Origin and the cookie name (scriba_setup_8080).
const EVIL_HOST = 'evil.example:8080';
const EVIL_ORIGIN = 'http://evil.example:8080';
const STATIC_ROOT = resolve(__dirname, 'fixtures/static');
const FRAME_POLICY = "frame-ancestors 'none'";
const INVALID_CANDIDATE = 'A'.repeat(43);
// The handshake cookie: host-only (no Domain), no Secure (the recorded fallback), HttpOnly, SameSite=Strict, Path=/.
const SESSION_COOKIE =
  /^scriba_setup_8080=[^;]+; Path=\/; HttpOnly; SameSite=Strict; Max-Age=34560000$/;

// Runs the body on a temp library, which the body may boot more than once. The library is removed in a finally.
async function withLibrary<T>(
  body: (library: string) => Promise<T>,
): Promise<T> {
  const library = mkdtempSync(join(tmpdir(), 'scriba-token-guard-'));
  try {
    return await body(library);
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
}

// Boots the composed app on the library, which the app does not remove, and closes the app after the body.
async function withApp<T>(
  library: string,
  body: (app: TestApp) => Promise<T>,
): Promise<T> {
  const app = await createTestApp({
    libraryDir: library,
    staticRoot: STATIC_ROOT,
  });
  try {
    return await body(app);
  } finally {
    await app.close();
  }
}

function modeOf(path: string): number {
  return statSync(path).mode & 0o777;
}

function storedToken(library: string): string {
  return readFileSync(join(library, '.scriba', 'setup-token'), 'utf8').trim();
}

// The path and query of the setup URL that the app wrote to disk on its last start.
function setupUrlPathOf(library: string): string {
  const url = new URL(
    readFileSync(join(library, '.scriba', 'setup-url'), 'utf8').trim(),
  );
  return `${url.pathname}${url.search}`;
}

function setCookies(reply: Reply): string[] {
  return reply.headers['set-cookie'] ?? [];
}

// The error code of a refusal in Platform's base shape.
function errorCodeOf(reply: Reply): unknown {
  const parsed = JSON.parse(reply.body) as { error?: { code?: unknown } };
  return parsed.error?.code;
}

// The steps and complete of a status body. The compose field is not read, because SAU-10 changes it.
function stepsAndComplete(reply: Reply): {
  steps: Record<string, string>;
  complete: unknown;
} {
  const body = JSON.parse(reply.body) as {
    steps: Record<string, string>;
    complete: unknown;
  };
  return { steps: body.steps, complete: body.complete };
}

function identityOf(app: TestApp, cookie: string): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    path: IDENTITY_ROUTE,
    cookie,
  });
}

it('token-guard gate, criterion 1: the token is created at first start, kept on restart, and replaced when deleted, so a cookie from the old token gets 401', async () => {
  await withLibrary(async (library) => {
    const first = await withApp(library, async (app) => {
      // The state directory is 0700; the token and the setup URL are 0600.
      expect(modeOf(join(library, '.scriba'))).toBe(0o700);
      expect(modeOf(join(library, '.scriba', 'setup-token'))).toBe(0o600);
      expect(modeOf(join(library, '.scriba', 'setup-url'))).toBe(0o600);
      // The setup URL on disk is the handshake URL with the stored token.
      const token = storedToken(library);
      const url = new URL(
        readFileSync(join(library, '.scriba', 'setup-url'), 'utf8').trim(),
      );
      expect(url.origin).toBe('http://127.0.0.1:8080');
      expect(url.pathname).toBe(HANDSHAKE_ROUTE);
      expect(url.searchParams.get('token')).toBe(token);
      const cookie = await sessionCookie(app, library);
      expect((await identityOf(app, cookie)).status).toBe(200);
      return { token, cookie };
    });

    // A restart on the same library keeps the token, and the cookie still verifies.
    await withApp(library, async (app) => {
      expect(storedToken(library)).toBe(first.token);
      expect((await identityOf(app, first.cookie)).status).toBe(200);
    });

    // Deleting the token file replaces the token on the next start, so the old cookie is refused.
    rmSync(join(library, '.scriba', 'setup-token'));
    await withApp(library, async (app) => {
      expect(storedToken(library)).not.toBe(first.token);
      const old = await identityOf(app, first.cookie);
      expect(old.status).toBe(401);
      expect(errorCodeOf(old)).toBe('AUTH_REQUIRED');
      const cookie = await sessionCookie(app, library);
      expect((await identityOf(app, cookie)).status).toBe(200);
    });
  });
});

it('token-guard gate, criterion 2: the handshake 303s to /setup with no token in Location and one host-only cookie; a wrong token gets the invalid-link page and no cookie', async () => {
  await withLibrary((library) =>
    withApp(library, async (app) => {
      const token = storedToken(library);
      const good = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: setupUrlPathOf(library),
      });
      expect(good.status).toBe(303);
      expect(good.headers.location).toBe(SETUP_PAGE_PATH);
      expect(good.headers.location).not.toContain(token);
      expect(good.headers['referrer-policy']).toBe('no-referrer');
      const cookies = setCookies(good);
      expect(cookies).toHaveLength(1);
      expect(cookies[0]).toMatch(SESSION_COOKIE);

      const bad = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: `${HANDSHAKE_ROUTE}?token=${INVALID_CANDIDATE}`,
      });
      expect(bad.status).toBe(401);
      expect(bad.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(bad.body).toContain('This link is not valid.');
      expect(setCookies(bad)).toEqual([]);
      expect(bad.body).not.toContain(INVALID_CANDIDATE);
    }),
  );
});

it('token-guard gate, criterion 3: without a cookie the protected routes answer 401; a Host that is not a loopback name gets 403 except on /healthz; a mutation without the exact loopback Origin gets 403', async () => {
  await withLibrary((library) => {
    seedFixtures(library);
    return withApp(library, async (app) => {
      const cookie = await sessionCookie(app, library);

      // Every enumerated route, through the verdict of the invariant sweep.
      expect(await sweepMutations(app, cookie)).toEqual([]);

      // Without a cookie, the protected routes answer 401 AUTH_REQUIRED.
      for (const path of [VERSION_ROUTE, SETUP_STATUS_ROUTE, EVENTS_ROUTE]) {
        const reply = await send(app.baseUrl, { host: LOOPBACK_HOST, path });
        expect(reply.status, path).toBe(401);
        expect(errorCodeOf(reply), path).toBe('AUTH_REQUIRED');
      }
      // The credential is checked before the Origin, so a POST with no Origin and no cookie is 401 too.
      const noCredential = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        method: 'POST',
        path: SETUP_CONTINUE_ROUTE,
        headers: { 'Content-Length': '0' },
      });
      expect(noCredential.status).toBe(401);
      expect(errorCodeOf(noCredential)).toBe('AUTH_REQUIRED');

      // With the cookie, a Host that is not a loopback name is refused, except on /healthz.
      for (const host of [EVIL_HOST, '127.0.0.1:9999']) {
        const reply = await send(app.baseUrl, {
          host,
          path: VERSION_ROUTE,
          cookie,
        });
        expect(reply.status, host).toBe(403);
        expect(errorCodeOf(reply), host).toBe('AUTH_HOST_REJECTED');
      }
      const staticFile = await send(app.baseUrl, {
        host: EVIL_HOST,
        path: '/',
        cookie,
      });
      expect(staticFile.status).toBe(403);
      expect(errorCodeOf(staticFile)).toBe('AUTH_HOST_REJECTED');
      const healthz = await send(app.baseUrl, {
        host: EVIL_HOST,
        path: HEALTHZ_ROUTE,
      });
      expect(healthz.status).toBe(200);

      // With the cookie, a mutation without the exact loopback Origin is refused.
      for (const origin of [
        undefined,
        'null',
        EVIL_ORIGIN,
        'https://127.0.0.1:8080',
        'http://localhost:8080',
      ]) {
        const reply = await send(app.baseUrl, {
          host: LOOPBACK_HOST,
          method: 'POST',
          path: SIGN_OUT_ROUTE,
          cookie,
          origin,
          headers: { 'Content-Length': '0' },
        });
        expect(reply.status, `Origin ${origin}`).toBe(403);
        expect(errorCodeOf(reply), `Origin ${origin}`).toBe(
          'AUTH_ORIGIN_REJECTED',
        );
      }
      // The control: the exact loopback Origin is accepted.
      const control = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        method: 'POST',
        path: SIGN_OUT_ROUTE,
        cookie,
        origin: LOOPBACK_ORIGIN,
        headers: { 'Content-Length': '0' },
      });
      expect(control.status).toBe(204);
    });
  });
});

it('token-guard gate, criterion 4: no response carries Access-Control headers, and every response carries frame-ancestors none', async () => {
  await withLibrary((library) =>
    withApp(library, async (app) => {
      const cookie = await sessionCookie(app, library);
      const replies: [string, Reply][] = [
        [
          'GET /healthz',
          await send(app.baseUrl, { host: LOOPBACK_HOST, path: HEALTHZ_ROUTE }),
        ],
        [
          'GET / without a cookie',
          await send(app.baseUrl, { host: LOOPBACK_HOST, path: '/' }),
        ],
        [
          'GET /media/x.txt without a cookie',
          await send(app.baseUrl, {
            host: LOOPBACK_HOST,
            path: '/media/x.txt',
          }),
        ],
        [
          'GET the version without a cookie',
          await send(app.baseUrl, { host: LOOPBACK_HOST, path: VERSION_ROUTE }),
        ],
        [
          'GET the version with a cookie',
          await send(app.baseUrl, {
            host: LOOPBACK_HOST,
            path: VERSION_ROUTE,
            cookie,
          }),
        ],
        [
          'GET the version with a foreign Host',
          await send(app.baseUrl, { host: EVIL_HOST, path: VERSION_ROUTE }),
        ],
        [
          'OPTIONS the version with a foreign Origin',
          await send(app.baseUrl, {
            host: LOOPBACK_HOST,
            method: 'OPTIONS',
            path: VERSION_ROUTE,
            origin: EVIL_ORIGIN,
            headers: { 'Access-Control-Request-Method': 'GET' },
          }),
        ],
        [
          'POST sign-out with a foreign Origin and a cookie',
          await send(app.baseUrl, {
            host: LOOPBACK_HOST,
            method: 'POST',
            path: SIGN_OUT_ROUTE,
            cookie,
            origin: EVIL_ORIGIN,
            headers: { 'Content-Length': '0' },
          }),
        ],
      ];
      for (const [label, reply] of replies) {
        const names = Object.keys(reply.headers);
        expect(
          names.filter((name) => name.startsWith('access-control-')),
          label,
        ).toEqual([]);
        expect(reply.headers['content-security-policy'], label).toBe(
          FRAME_POLICY,
        );
      }
    }),
  );
});

it('token-guard gate, criterion 5: a fresh status is incomplete; after Continue it is complete and only the setupAuth section of settings.yaml changed', async () => {
  await withLibrary((library) =>
    withApp(library, async (app) => {
      const cookie = await sessionCookie(app, library);
      const settingsPath = join(library, '.scriba', 'settings.yaml');
      const statusGet = (): Promise<Reply> =>
        send(app.baseUrl, {
          host: LOOPBACK_HOST,
          path: SETUP_STATUS_ROUTE,
          cookie,
        });

      const fresh = await statusGet();
      expect(fresh.status).toBe(200);
      expect(stepsAndComplete(fresh)).toEqual({
        steps: {
          access: 'done',
          tailscale: 'pending',
          providers: 'pending',
          preferences: 'pending',
          firstProject: 'pending',
        },
        complete: false,
      });
      // The status GET writes nothing.
      const before = readFileSync(settingsPath, 'utf8');
      await statusGet();
      expect(readFileSync(settingsPath, 'utf8')).toBe(before);

      const post = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        method: 'POST',
        path: SETUP_CONTINUE_ROUTE,
        origin: LOOPBACK_ORIGIN,
        cookie,
        headers: { 'Content-Length': '0' },
      });
      expect(post.status).toBe(200);
      const continued = {
        steps: {
          access: 'done',
          tailscale: 'skipped',
          providers: 'skipped',
          preferences: 'skipped',
          firstProject: 'skipped',
        },
        complete: true,
      };
      expect(stepsAndComplete(post)).toEqual(continued);
      expect(stepsAndComplete(await statusGet())).toEqual(continued);

      // Only the setupAuth section changed: every other key keeps its value, and the text above the section is the same.
      const after = readFileSync(settingsPath, 'utf8');
      const beforeDoc = parse(before) as Record<string, unknown>;
      const afterDoc = parse(after) as Record<string, unknown>;
      expect(Object.keys(afterDoc)).toEqual(Object.keys(beforeDoc));
      for (const key of Object.keys(beforeDoc)) {
        if (key !== 'setupAuth') expect(afterDoc[key]).toEqual(beforeDoc[key]);
      }
      expect(afterDoc.setupAuth).not.toEqual(beforeDoc.setupAuth);
      const setupLine = before
        .split('\n')
        .findIndex((line) => line.startsWith('setupAuth:'));
      expect(setupLine).toBeGreaterThan(0);
      expect(after.split('\n').slice(0, setupLine)).toEqual(
        before.split('\n').slice(0, setupLine),
      );
    }),
  );
});

it('token-guard gate, criterion 6: on 127.0.0.1 and on localhost the handshake cookie has no Secure attribute, and its attributes are the recorded fallback', async () => {
  await withLibrary((library) =>
    withApp(library, async (app) => {
      for (const host of [LOOPBACK_HOST, 'localhost:8080']) {
        const reply = await send(app.baseUrl, {
          host,
          path: setupUrlPathOf(library),
        });
        expect(reply.status, host).toBe(303);
        const cookies = setCookies(reply);
        expect(cookies, host).toHaveLength(1);
        expect(cookies[0], host).toMatch(SESSION_COOKIE);
      }
    }),
  );
});
