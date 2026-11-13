import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import {
  ECHO_ROUTE,
  EVENTS_ROUTE,
  HEALTHZ_ROUTE,
  VERSION_ROUTE,
} from '@bbartolome/scriba-contracts/platform';
import {
  HANDSHAKE_ROUTE,
  IDENTITY_ROUTE,
  SETUP_CONTINUE_ROUTE,
  SETUP_STATUS_ROUTE,
  SIGN_OUT_ROUTE,
} from '@bbartolome/scriba-contracts/setup-auth';
import { createTestApp } from './create-test-app';
import {
  send,
  sessionCookie,
  type Reply,
  type RequestOptions,
} from './guard-request';

// Every app here listens on the default port 8080 in its Host and cookie names.
const HOST = '127.0.0.1:8080';
const ORIGIN = 'http://127.0.0.1:8080';
const CSP = "frame-ancestors 'none'";
const STATIC_ROOT = resolve(__dirname, 'fixtures/static');
const MAIN = resolve(__dirname, '..', 'dist', 'main.js');
const ECHO_BODY = JSON.stringify({ count: 1, intervalMs: 0 });
const FOREIGN_HOSTS = [
  'evil.example:8080',
  '127.0.0.1:9999',
  'scriba:8080',
  '127.0.0.1',
];

function tempLibrary(): string {
  return mkdtempSync(join(tmpdir(), 'scriba-guard-'));
}

function errorCode(reply: Reply): string | undefined {
  return (JSON.parse(reply.body) as { error?: { code?: string } }).error?.code;
}

// The guard's refusal in Platform's base shape: one top-level key, error, with a code and a message.
function expectAuthRequired(reply: Reply): void {
  expect(reply.status).toBe(401);
  expect(reply.headers['content-type']).toMatch(/^application\/json/);
  const parsed = JSON.parse(reply.body) as { error?: { message?: unknown } };
  expect(Object.keys(parsed)).toEqual(['error']);
  expect(errorCode(reply)).toBe('AUTH_REQUIRED');
  expect(parsed.error?.message).toEqual(expect.stringMatching(/./));
}

function expectRefusal(reply: Reply, status: number, code: string): void {
  expect(reply.status).toBe(status);
  expect(errorCode(reply)).toBe(code);
  expect(reply.headers['content-security-policy']).toBe(CSP);
}

// The value part of a `name=value` pair.
function valueOf(pair: string): string {
  return pair.slice(pair.indexOf('=') + 1);
}

// The same value under another cookie name.
function renamed(pair: string, name: string): string {
  return `${name}=${valueOf(pair)}`;
}

// The same cookie with its issue time moved by one millisecond, so its signature no longer matches.
function withLaterIssueTime(pair: string): string {
  const [issued, signature] = valueOf(pair).split('.');
  return `${pair.slice(0, pair.indexOf('='))}=${Number(issued) + 1}.${signature}`;
}

// The four guarded calls of criterion 1, with the cookie given or not.
async function guardedReplies(
  baseUrl: string,
  cookie?: string,
): Promise<Reply[]> {
  return [
    await send(baseUrl, { host: HOST, path: VERSION_ROUTE, cookie }),
    await send(baseUrl, {
      host: HOST,
      path: EVENTS_ROUTE,
      cookie,
      headersOnly: true,
    }),
    await send(baseUrl, {
      host: HOST,
      method: 'POST',
      path: ECHO_ROUTE,
      origin: ORIGIN,
      body: ECHO_BODY,
      cookie,
    }),
    await send(baseUrl, {
      host: HOST,
      method: 'POST',
      path: SIGN_OUT_ROUTE,
      origin: ORIGIN,
      cookie,
    }),
  ];
}

it('criterion 1: without a valid cookie every non-public route answers 401 AUTH_REQUIRED in the base shape, /events too', async () => {
  const library = tempLibrary();
  try {
    let cookie = '';
    const first = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
    });
    try {
      cookie = await sessionCookie(first, library);
      // The control: the handshake cookie passes the guard, so the refusals below are not false.
      const control = await send(first.baseUrl, {
        host: HOST,
        path: VERSION_ROUTE,
        cookie,
      });
      expect(control.status).toBe(200);
      for (const reply of await guardedReplies(first.baseUrl)) {
        expectAuthRequired(reply);
      }
      for (const invalid of [
        withLaterIssueTime(cookie),
        renamed(cookie, 'scriba_setup_9999'),
      ]) {
        for (const reply of await guardedReplies(first.baseUrl, invalid)) {
          expectAuthRequired(reply);
        }
      }
    } finally {
      await first.close();
    }
    // A new token gives a new key. The old cookie, sent to a restarted app, is refused.
    rmSync(join(library, '.scriba', 'setup-token'));
    const second = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
    });
    try {
      for (const reply of await guardedReplies(second.baseUrl, cookie)) {
        expectAuthRequired(reply);
      }
    } finally {
      await second.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('criterion 2: a Host outside the allowlist gets 403 AUTH_HOST_REJECTED on every path except /healthz, static included', async () => {
  const library = tempLibrary();
  try {
    const app = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
    });
    try {
      const cookie = await sessionCookie(app, library);
      for (const host of FOREIGN_HOSTS) {
        expectRefusal(
          await send(app.baseUrl, { host, path: '/' }),
          403,
          'AUTH_HOST_REJECTED',
        );
        expectRefusal(
          await send(app.baseUrl, { host, path: VERSION_ROUTE, cookie }),
          403,
          'AUTH_HOST_REJECTED',
        );
        expectRefusal(
          await send(app.baseUrl, {
            host,
            path: EVENTS_ROUTE,
            cookie,
            headersOnly: true,
          }),
          403,
          'AUTH_HOST_REJECTED',
        );
      }
      const health = await send(app.baseUrl, {
        host: 'evil.example:8080',
        path: HEALTHZ_ROUTE,
      });
      expect(health.status).toBe(200);
      const index = readFileSync(join(STATIC_ROOT, 'index.html'), 'utf8');
      for (const host of ['127.0.0.1:8080', 'localhost:8080']) {
        const root = await send(app.baseUrl, { host, path: '/' });
        expect(root.status).toBe(200);
        expect(root.body).toBe(index);
      }
      // The hook runs before the body parser: a malformed body and an oversize body are both 403, not 400 or 413.
      const oversize = JSON.stringify({ pad: 'a'.repeat(200 * 1024) });
      for (const body of ['{', oversize]) {
        expectRefusal(
          await send(app.baseUrl, {
            host: 'evil.example:8080',
            method: 'POST',
            path: ECHO_ROUTE,
            body,
          }),
          403,
          'AUTH_HOST_REJECTED',
        );
      }
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('criterion 3: a mutation with a missing, null, foreign or wrong-scheme Origin gets 403 AUTH_ORIGIN_REJECTED', async () => {
  const library = tempLibrary();
  try {
    const app = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
    });
    try {
      const cookie = await sessionCookie(app, library);
      const refused: Array<string | undefined> = [
        undefined,
        'null',
        'https://127.0.0.1:8080',
        'http://evil.example',
        'http://localhost:8080',
      ];
      for (const origin of refused) {
        expectRefusal(
          await send(app.baseUrl, {
            host: HOST,
            method: 'POST',
            path: ECHO_ROUTE,
            origin,
            body: ECHO_BODY,
            cookie,
          }),
          403,
          'AUTH_ORIGIN_REJECTED',
        );
      }
      // The control: the Host's own origin is accepted.
      const control = await send(app.baseUrl, {
        host: HOST,
        method: 'POST',
        path: ECHO_ROUTE,
        origin: ORIGIN,
        body: ECHO_BODY,
        cookie,
      });
      expect(control.status).toBe(202);
      // Only mutations check Origin: a read with a foreign Origin still passes.
      const read = await send(app.baseUrl, {
        host: HOST,
        path: VERSION_ROUTE,
        origin: 'http://evil.example',
        cookie,
      });
      expect(read.status).toBe(200);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('criterion 4: a loopback request with only a Tailscale-User-Login header gets 401 AUTH_REQUIRED', async () => {
  const library = tempLibrary();
  try {
    const app = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
    });
    try {
      const cookie = await sessionCookie(app, library);
      const headers = { 'Tailscale-User-Login': 'alice@example.com' };
      expectAuthRequired(
        await send(app.baseUrl, { host: HOST, path: VERSION_ROUTE, headers }),
      );
      expectAuthRequired(
        await send(app.baseUrl, {
          host: HOST,
          path: EVENTS_ROUTE,
          headers,
          headersOnly: true,
        }),
      );
      // The control: the same header with a valid cookie passes.
      const control = await send(app.baseUrl, {
        host: HOST,
        path: VERSION_ROUTE,
        headers,
        cookie,
      });
      expect(control.status).toBe(200);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('criterion 5: no response carries Access-Control-* headers, and every response carries frame-ancestors none', async () => {
  const library = tempLibrary();
  try {
    const app = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
    });
    try {
      const cookie = await sessionCookie(app, library);
      // Each case: a label, the request, the status to expect (undefined when not asserted) and the error code, if any.
      const cases: Array<
        [string, RequestOptions, number | undefined, string | undefined]
      > = [
        ['GET /healthz', { host: HOST, path: HEALTHZ_ROUTE }, 200, undefined],
        ['GET /', { host: HOST, path: '/' }, 200, undefined],
        [
          'GET /media (no redirect)',
          { host: HOST, path: '/media' },
          200,
          undefined,
        ],
        [
          'GET version, no cookie',
          { host: HOST, path: VERSION_ROUTE },
          401,
          'AUTH_REQUIRED',
        ],
        [
          'GET version, cookie',
          { host: HOST, path: VERSION_ROUTE, cookie },
          200,
          undefined,
        ],
        [
          'GET unknown api path, cookie',
          { host: HOST, path: '/api/platform/nope', cookie },
          404,
          'PLATFORM_NOT_FOUND',
        ],
        [
          'GET events, cookie',
          { host: HOST, path: EVENTS_ROUTE, cookie, headersOnly: true },
          200,
          undefined,
        ],
        [
          'GET version, foreign Host',
          { host: 'evil.example:8080', path: VERSION_ROUTE },
          403,
          'AUTH_HOST_REJECTED',
        ],
        [
          'OPTIONS echo, preflight',
          {
            host: HOST,
            method: 'OPTIONS',
            path: ECHO_ROUTE,
            origin: ORIGIN,
            headers: { 'Access-Control-Request-Method': 'POST' },
          },
          undefined,
          undefined,
        ],
        [
          'POST echo, malformed body, cookie',
          {
            host: HOST,
            method: 'POST',
            path: ECHO_ROUTE,
            origin: ORIGIN,
            cookie,
            body: '{',
          },
          400,
          'PLATFORM_VALIDATION_FAILED',
        ],
      ];
      for (const [label, options, status, code] of cases) {
        const reply = await send(app.baseUrl, options);
        if (status !== undefined) expect(reply.status, label).toBe(status);
        if (code !== undefined) expect(errorCode(reply), label).toBe(code);
        for (const name of Object.keys(reply.headers)) {
          expect(name.startsWith('access-control-'), label).toBe(false);
        }
        expect(reply.headers['content-security-policy'], label).toBe(CSP);
        expect(reply.headers.location, label).toBeUndefined();
      }
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('criterion 6: the public route set is pinned by the test, and every other route answers 401 without a credential', async () => {
  const library = tempLibrary();
  try {
    const app = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
    });
    try {
      // Public: /healthz and static answer 200.
      expect(
        (await send(app.baseUrl, { host: HOST, path: HEALTHZ_ROUTE })).status,
      ).toBe(200);
      expect((await send(app.baseUrl, { host: HOST, path: '/' })).status).toBe(
        200,
      );
      // The handshake is public: with no token it gives SAU-03's HTML page, not the guard's JSON refusal.
      const handshake = await send(app.baseUrl, {
        host: HOST,
        path: HANDSHAKE_ROUTE,
      });
      expect(handshake.status).toBe(401);
      expect(handshake.headers['content-type']).toBe(
        'text/html; charset=utf-8',
      );
      expect(handshake.body).not.toContain('AUTH_REQUIRED');
      // Identity is public, and answers 401 AUTH_REQUIRED from its own handler.
      expectAuthRequired(
        await send(app.baseUrl, { host: HOST, path: IDENTITY_ROUTE }),
      );
      // Every other route is guarded by default.
      const guarded: Array<[string, RequestOptions]> = [
        ['events', { host: HOST, path: EVENTS_ROUTE, headersOnly: true }],
        ['version', { host: HOST, path: VERSION_ROUTE }],
        [
          'echo',
          {
            host: HOST,
            method: 'POST',
            path: ECHO_ROUTE,
            origin: ORIGIN,
            body: ECHO_BODY,
          },
        ],
        [
          'sign-out',
          { host: HOST, method: 'POST', path: SIGN_OUT_ROUTE, origin: ORIGIN },
        ],
        ['setup status', { host: HOST, path: SETUP_STATUS_ROUTE }],
        [
          'setup continue',
          {
            host: HOST,
            method: 'POST',
            path: SETUP_CONTINUE_ROUTE,
            origin: ORIGIN,
          },
        ],
      ];
      for (const [label, options] of guarded) {
        const reply = await send(app.baseUrl, options);
        expect(reply.status, label).toBe(401);
        expect(errorCode(reply), label).toBe('AUTH_REQUIRED');
      }
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('criterion 7: with SCRIBA_DEV_ORIGINS set the dev origin and Host pass; without it they are refused', async () => {
  const devLibrary = tempLibrary();
  const plainLibrary = tempLibrary();
  try {
    const dev = await createTestApp({
      libraryDir: devLibrary,
      staticRoot: STATIC_ROOT,
      env: { SCRIBA_DEV_ORIGINS: 'http://localhost:4200' },
    });
    try {
      const devCookie = await sessionCookie(dev, devLibrary);
      expect(
        (await send(dev.baseUrl, { host: 'localhost:4200', path: '/' })).status,
      ).toBe(200);
      expectAuthRequired(
        await send(dev.baseUrl, {
          host: 'localhost:4200',
          path: VERSION_ROUTE,
        }),
      );
      const devPost = await send(dev.baseUrl, {
        host: 'localhost:4200',
        method: 'POST',
        path: ECHO_ROUTE,
        origin: 'http://localhost:4200',
        body: ECHO_BODY,
        cookie: devCookie,
      });
      expect(devPost.status).toBe(202);
      expectRefusal(
        await send(dev.baseUrl, {
          host: HOST,
          method: 'POST',
          path: ECHO_ROUTE,
          origin: 'http://localhost:4200',
          body: ECHO_BODY,
          cookie: devCookie,
        }),
        403,
        'AUTH_ORIGIN_REJECTED',
      );
    } finally {
      await dev.close();
    }
    const plain = await createTestApp({
      libraryDir: plainLibrary,
      staticRoot: STATIC_ROOT,
    });
    try {
      const plainCookie = await sessionCookie(plain, plainLibrary);
      expectRefusal(
        await send(plain.baseUrl, { host: 'localhost:4200', path: '/' }),
        403,
        'AUTH_HOST_REJECTED',
      );
      expectRefusal(
        await send(plain.baseUrl, {
          host: 'localhost:4200',
          method: 'POST',
          path: ECHO_ROUTE,
          origin: 'http://localhost:4200',
          body: ECHO_BODY,
          cookie: plainCookie,
        }),
        403,
        'AUTH_HOST_REJECTED',
      );
    } finally {
      await plain.close();
    }
  } finally {
    rmSync(devLibrary, { recursive: true, force: true });
    rmSync(plainLibrary, { recursive: true, force: true });
  }
});

// Extra (decision 7, not in the unit): a malformed SCRIBA_DEV_ORIGINS refuses the boot before Nest starts.
it('a malformed SCRIBA_DEV_ORIGINS exits main.js with status 1, empty stdout, and one stderr line naming the variable', () => {
  for (const raw of ['localhost:4200', 'http://localhost']) {
    const dirs = [tempLibrary(), tempLibrary(), tempLibrary()];
    try {
      const [books, packs, examples] = dirs;
      const result = spawnSync(process.execPath, [MAIN], {
        env: {
          SCRIBA_BOOKS_DIR: books,
          SCRIBA_PACKS_DIR: packs,
          SCRIBA_EXAMPLES_DIR: examples,
          SCRIBA_LOG_LEVEL: 'error',
          SCRIBA_DEV_ORIGINS: raw,
        },
        encoding: 'utf8',
        timeout: 8000,
      });
      expect(result.status, raw).toBe(1);
      expect(result.stdout, raw).toBe('');
      const [first = ''] = result.stderr.trim().split('\n');
      expect(first.startsWith('Invalid SCRIBA_DEV_ORIGINS "')).toBe(true);
      expect(first).toContain(`"${raw}"`);
      const stackFrame = result.stderr
        .split('\n')
        .some((line) => /^\s+at /.test(line));
      expect(stackFrame, raw).toBe(false);
    } finally {
      for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    }
  }
});
