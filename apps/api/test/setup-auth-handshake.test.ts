import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { parse, stringify } from 'yaml';
import {
  HANDSHAKE_ROUTE,
  IDENTITY_ROUTE,
  SIGN_OUT_ROUTE,
} from '@bbartolome/scriba-contracts/setup-auth';
import { createTestApp } from './create-test-app';

// Every test runs on port 9123, so the Host headers, the cookie name and the Origin are fixed here.
const PORT = '9123';
const HOST = `127.0.0.1:${PORT}`;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const COOKIE_NAME = `scriba_setup_${PORT}`;
const INVALID_CANDIDATE = 'A'.repeat(43);

interface Reply {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
}

// Sends one request with the given headers. node:http is used because fetch cannot set Host.
function send(
  baseUrl: string,
  method: 'GET' | 'POST',
  path: string,
  headers: Record<string, string>,
): Promise<Reply> {
  const { hostname, port } = new URL(baseUrl);
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      { hostname, port, path, method, headers },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    request.on('error', reject);
    request.end();
  });
}

// The path and query of the setup URL that the app wrote to disk on its last start.
function setupUrlPath(library: string): string {
  const url = new URL(
    readFileSync(join(library, '.scriba', 'setup-url'), 'utf8').trim(),
  );
  return `${url.pathname}${url.search}`;
}

function storedToken(library: string): string {
  return readFileSync(join(library, '.scriba', 'setup-token'), 'utf8').trim();
}

function setCookies(reply: Reply): string[] {
  return reply.headers['set-cookie'] ?? [];
}

// The `name=value` pair of the first Set-Cookie header, as a browser would send it back.
function cookiePair(reply: Reply): string {
  const [first] = setCookies(reply);
  return (first ?? '').split(';')[0] ?? '';
}

function errorCode(reply: Reply): string | undefined {
  return (JSON.parse(reply.body) as { error?: { code?: string } }).error?.code;
}

// Runs the handshake with the stored token and returns the cookie it sets.
async function signIn(
  baseUrl: string,
  library: string,
  host = HOST,
): Promise<string> {
  const reply = await send(baseUrl, 'GET', setupUrlPath(library), {
    Host: host,
  });
  expect(reply.status).toBe(303);
  return cookiePair(reply);
}

it('the handshake sets a host-only, HttpOnly, SameSite=Strict cookie named with the port, and 303s to /setup without the token in Location', async () => {
  const library = mkdtempSync(join(tmpdir(), 'scriba-handshake-'));
  try {
    const app = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PORT: PORT },
    });
    try {
      const reply = await send(app.baseUrl, 'GET', setupUrlPath(library), {
        Host: HOST,
      });
      expect(reply.status).toBe(303);
      expect(reply.headers.location).toBe('/setup');
      expect(reply.headers.location).not.toContain(storedToken(library));
      expect(reply.headers['referrer-policy']).toBe('no-referrer');
      const cookies = setCookies(reply);
      expect(cookies).toHaveLength(1);
      const cookie = cookies[0] ?? '';
      expect(cookie.startsWith(`${COOKIE_NAME}=`)).toBe(true);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('Max-Age=34560000');
      expect(cookie).not.toMatch(/domain=/i);
      expect(cookie).not.toMatch(/;\s*secure\b/i);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('a wrong token gets the invalid-link page with no cookie, and the page does not echo the token', async () => {
  const library = mkdtempSync(join(tmpdir(), 'scriba-handshake-'));
  try {
    const app = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PORT: PORT },
    });
    try {
      const reply = await send(
        app.baseUrl,
        'GET',
        `${HANDSHAKE_ROUTE}?token=${INVALID_CANDIDATE}`,
        { Host: HOST },
      );
      expect(reply.status).toBe(401);
      expect(reply.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(reply.body.toLowerCase()).toContain('this link is not valid');
      expect(reply.body).toContain('cat ~/Books/.scriba/setup-url');
      expect(reply.headers['set-cookie']).toBeUndefined();
      expect(reply.headers['referrer-policy']).toBe('no-referrer');
      expect(reply.body).not.toContain(INVALID_CANDIDATE);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('127.0.0.1 and localhost Hosts both get the cookie, and identity answers 200 with it', async () => {
  const library = mkdtempSync(join(tmpdir(), 'scriba-handshake-'));
  try {
    const app = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PORT: PORT },
    });
    try {
      for (const host of [HOST, `localhost:${PORT}`]) {
        const handshake = await send(
          app.baseUrl,
          'GET',
          setupUrlPath(library),
          { Host: host },
        );
        expect(handshake.status).toBe(303);
        expect(handshake.headers.location).toBe('/setup');
        const cookie = cookiePair(handshake);
        expect(cookie.startsWith(`${COOKIE_NAME}=`)).toBe(true);
        const identity = await send(app.baseUrl, 'GET', IDENTITY_ROUTE, {
          Host: host,
          Cookie: cookie,
        });
        expect(identity.status).toBe(200);
        expect(JSON.parse(identity.body)).toEqual({ via: 'loopback' });
      }
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('after the token is replaced, the old cookie gets 401 and a cookie from the new token gets 200', async () => {
  const library = mkdtempSync(join(tmpdir(), 'scriba-handshake-'));
  try {
    const first = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PORT: PORT },
    });
    let oldCookie: string;
    let oldToken: string;
    try {
      oldCookie = await signIn(first.baseUrl, library);
      oldToken = storedToken(library);
      const identity = await send(first.baseUrl, 'GET', IDENTITY_ROUTE, {
        Host: HOST,
        Cookie: oldCookie,
      });
      expect(identity.status).toBe(200);
    } finally {
      await first.close();
    }

    rmSync(join(library, '.scriba', 'setup-token'));
    const second = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PORT: PORT },
    });
    try {
      const stale = await send(second.baseUrl, 'GET', IDENTITY_ROUTE, {
        Host: HOST,
        Cookie: oldCookie,
      });
      expect(stale.status).toBe(401);
      expect(errorCode(stale)).toBe('AUTH_REQUIRED');
      expect(storedToken(library)).not.toBe(oldToken);

      const newCookie = await signIn(second.baseUrl, library);
      const fresh = await send(second.baseUrl, 'GET', IDENTITY_ROUTE, {
        Host: HOST,
        Cookie: newCookie,
      });
      expect(fresh.status).toBe(200);
    } finally {
      await second.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('sign-out expires the cookie in this browser, and identity then answers 401 without it', async () => {
  const library = mkdtempSync(join(tmpdir(), 'scriba-handshake-'));
  try {
    const app = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PORT: PORT },
    });
    try {
      const cookie = await signIn(app.baseUrl, library);
      const before = await send(app.baseUrl, 'GET', IDENTITY_ROUTE, {
        Host: HOST,
        Cookie: cookie,
      });
      expect(before.status).toBe(200);

      const signOut = await send(app.baseUrl, 'POST', SIGN_OUT_ROUTE, {
        Host: HOST,
        Origin: ORIGIN,
        Cookie: cookie,
        'Content-Length': '0',
      });
      expect(signOut.status).toBe(204);
      const cookies = setCookies(signOut);
      expect(cookies).toHaveLength(1);
      const expired = cookies[0] ?? '';
      expect(expired.startsWith(`${COOKIE_NAME}=;`)).toBe(true);
      expect(expired).toContain('Max-Age=0');
      expect(expired).toContain('Path=/');
      expect(expired).not.toMatch(/domain=/i);

      // The browser drops the expired cookie, so the next request sends no cookie.
      const after = await send(app.baseUrl, 'GET', IDENTITY_ROUTE, {
        Host: HOST,
      });
      expect(after.status).toBe(401);
      expect(errorCode(after)).toBe('AUTH_REQUIRED');
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('a wrong token writes one "Setup token rejected." line that holds neither the candidate nor the stored token', async () => {
  const library = mkdtempSync(join(tmpdir(), 'scriba-handshake-'));
  try {
    const app = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PORT: PORT, SCRIBA_LOG_LEVEL: 'info' },
    });
    try {
      const captured: string[] = [];
      const spies = [process.stdout, process.stderr].map((stream) =>
        vi
          .spyOn(stream, 'write')
          .mockImplementation((chunk: string | Uint8Array) => {
            captured.push(String(chunk));
            return true;
          }),
      );
      let reply: Reply;
      try {
        reply = await send(
          app.baseUrl,
          'GET',
          `${HANDSHAKE_ROUTE}?token=${INVALID_CANDIDATE}`,
          { Host: HOST },
        );
      } finally {
        for (const spy of spies) spy.mockRestore();
      }
      expect(reply.status).toBe(401);
      // The logger colours its output unless NO_COLOR is set, so the colour codes are removed first.
      // The escape is built this way so that no-control-regex stays on; it matches the same codes as \x1B\[[0-9;]*m.
      const sgr = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g');
      const text = captured.join('').replace(sgr, '');
      const rejected = text
        .split('\n')
        .filter((line) => /\[SetupAuth\] Setup token rejected\./.test(line));
      expect(rejected).toHaveLength(1);
      expect(text).not.toContain(INVALID_CANDIDATE);
      expect(text).not.toContain(storedToken(library));
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('once setup is complete, the handshake 303s to / and still sets the cookie', async () => {
  const library = mkdtempSync(join(tmpdir(), 'scriba-handshake-'));
  try {
    const first = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PORT: PORT },
    });
    await first.close();

    const settingsPath = join(library, '.scriba', 'settings.yaml');
    const doc = parse(readFileSync(settingsPath, 'utf8')) as {
      setupAuth: { complete: boolean };
    };
    doc.setupAuth.complete = true;
    writeFileSync(settingsPath, stringify(doc));

    const second = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PORT: PORT },
    });
    try {
      const reply = await send(second.baseUrl, 'GET', setupUrlPath(library), {
        Host: HOST,
      });
      expect(reply.status).toBe(303);
      expect(reply.headers.location).toBe('/');
      expect(cookiePair(reply).startsWith(`${COOKIE_NAME}=`)).toBe(true);
    } finally {
      await second.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});
