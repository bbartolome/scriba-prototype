import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import { errorBodySchema } from '@bbartolome/scriba-contracts/platform';
import {
  HANDSHAKE_ROUTE,
  SETUP_CONTINUE_ROUTE,
  SETUP_STATUS_ROUTE,
  setupStatusSchema,
} from '@bbartolome/scriba-contracts/setup-auth';
import { createTestApp } from './create-test-app';
import { backupEntries } from './settings.kit';

// The port fixes the Host header, the Origin and the cookie name (scriba_setup_<port>).
const PORT = '8080';
const HOST = `127.0.0.1:${PORT}`;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const STATIC_ROOT = resolve(__dirname, 'fixtures/static');
const EXPECTED_COMPOSE = Number(
  readFileSync(
    resolve(__dirname, '..', '..', '..', 'deploy', 'compose-version'),
    'utf8',
  ).trim(),
);

// The parts of settings.yaml that these tests read. Other sections are compared as they are.
type SettingsDoc = {
  schemaVersion: number;
  setupAuth: Record<string, unknown>;
} & Record<string, unknown>;

interface Reply {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
}

interface FileEntry {
  ino: number;
  ctimeMs: number;
  size: number;
  mtimeMs: number;
  sha256: string | null;
}

// Sends one request with the given headers. node:http is used because fetch cannot set Host.
function call(
  baseUrl: string,
  method: 'GET' | 'POST',
  path: string,
  headers: Record<string, string>,
): Promise<Reply> {
  const { hostname, port } = new URL(baseUrl);
  return new Promise((resolveReply, reject) => {
    const request = httpRequest(
      { hostname, port, path, method, headers },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          resolveReply({
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

// Runs the handshake with the token from the setup-url file. Returns the name=value pair it sets.
async function sessionCookie(
  baseUrl: string,
  library: string,
): Promise<string> {
  const setupUrl = new URL(
    readFileSync(join(library, '.scriba', 'setup-url'), 'utf8').trim(),
  );
  const token = setupUrl.searchParams.get('token') ?? '';
  const reply = await call(
    baseUrl,
    'GET',
    `${HANDSHAKE_ROUTE}?token=${token}`,
    { Host: HOST },
  );
  expect(reply.status).toBe(303);
  const [first] = reply.headers['set-cookie'] ?? [];
  return (first ?? '').split(';')[0] ?? '';
}

// Every path under the library, with its stat fields and a content hash. ino and ctimeMs catch a rewrite
// even when mtimeMs has coarse resolution.
function snapshot(library: string): Record<string, FileEntry> {
  const entries: Record<string, FileEntry> = {};
  for (const relative of readdirSync(library, {
    recursive: true,
    encoding: 'utf8',
  })) {
    const full = join(library, relative);
    const stat = statSync(full);
    entries[relative] = {
      ino: stat.ino,
      ctimeMs: stat.ctimeMs,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      sha256: stat.isFile()
        ? createHash('sha256').update(readFileSync(full)).digest('hex')
        : null,
    };
  }
  return entries;
}

// Runs the test against a composed app on a fresh temp library. The library is removed on every path.
async function withLibrary(
  run: (library: string, baseUrl: string) => Promise<void>,
): Promise<void> {
  const library = mkdtempSync(join(tmpdir(), 'scriba-status-'));
  try {
    const app = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
      env: { SCRIBA_PORT: PORT },
    });
    try {
      await run(library, app.baseUrl);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
}

it('a fresh library status is incomplete, with access done and the other steps pending, for an authenticated caller', async () => {
  await withLibrary(async (library, baseUrl) => {
    const cookie = await sessionCookie(baseUrl, library);
    const reply = await call(baseUrl, 'GET', SETUP_STATUS_ROUTE, {
      Host: HOST,
      Cookie: cookie,
    });
    expect(reply.status).toBe(200);
    const body: unknown = JSON.parse(reply.body);
    expect(body).toEqual({
      steps: {
        access: 'done',
        tailscale: 'pending',
        providers: 'pending',
        preferences: 'pending',
        firstProject: 'pending',
      },
      complete: false,
      compose: { state: 'unknown', expected: EXPECTED_COMPOSE },
    });
    expect(setupStatusSchema.safeParse(body).success).toBe(true);
  });
});

it('after Continue the status is complete, and settings.yaml differs only in the setupAuth section', async () => {
  await withLibrary(async (library, baseUrl) => {
    const cookie = await sessionCookie(baseUrl, library);
    const settingsPath = join(library, '.scriba', 'settings.yaml');

    // The owner's own values are planted in the file. Continue must keep them.
    const planted = parse(readFileSync(settingsPath, 'utf8')) as SettingsDoc;
    planted.setupAuth.preferences = { authorName: 'Ada' };
    planted.setupAuth.allowlist = {
      enabled: true,
      logins: ['ada@example.com'],
    };
    writeFileSync(settingsPath, stringify(planted));
    const before = readFileSync(settingsPath, 'utf8');

    const post = await call(baseUrl, 'POST', SETUP_CONTINUE_ROUTE, {
      Host: HOST,
      Origin: ORIGIN,
      Cookie: cookie,
      'Content-Length': '0',
    });
    expect(post.status).toBe(200);
    const postBody: unknown = JSON.parse(post.body);
    expect(postBody).toEqual({
      steps: {
        access: 'done',
        tailscale: 'skipped',
        providers: 'skipped',
        preferences: 'skipped',
        firstProject: 'skipped',
      },
      complete: true,
      compose: { state: 'unknown', expected: EXPECTED_COMPOSE },
    });

    // A GET reads the stored section, so a Continue that only returned the body would fail here.
    const get = await call(baseUrl, 'GET', SETUP_STATUS_ROUTE, {
      Host: HOST,
      Cookie: cookie,
    });
    expect(get.status).toBe(200);
    expect(JSON.parse(get.body)).toEqual(postBody);

    const after = readFileSync(settingsPath, 'utf8');
    const beforeDoc = parse(before) as SettingsDoc;
    const afterDoc = parse(after) as SettingsDoc;
    expect(Object.keys(afterDoc)).toEqual(Object.keys(beforeDoc));
    for (const key of Object.keys(beforeDoc)) {
      if (key !== 'setupAuth') expect(afterDoc[key]).toEqual(beforeDoc[key]);
    }
    expect(afterDoc.setupAuth.steps).toEqual({
      access: 'done',
      tailscale: 'skipped',
      providers: 'skipped',
      preferences: 'skipped',
      firstProject: 'skipped',
    });
    expect(afterDoc.setupAuth.complete).toBe(true);
    expect(afterDoc.setupAuth.preferences).toEqual(
      beforeDoc.setupAuth.preferences,
    );
    expect(afterDoc.setupAuth.allowlist).toEqual(beforeDoc.setupAuth.allowlist);

    const setupLine = before
      .split('\n')
      .findIndex((line) => line.startsWith('setupAuth:'));
    expect(setupLine).toBeGreaterThan(0);
    expect(after.split('\n').slice(0, setupLine)).toEqual(
      before.split('\n').slice(0, setupLine),
    );
    expect(backupEntries(library)).toEqual([]);

    const again = await call(baseUrl, 'POST', SETUP_CONTINUE_ROUTE, {
      Host: HOST,
      Origin: ORIGIN,
      Cookie: cookie,
      'Content-Length': '0',
    });
    expect(again.status).toBe(200);
    expect(readFileSync(settingsPath, 'utf8')).toBe(after);
  });
});

it('the status GET is side-effect free: it writes no file and sets no cookie', async () => {
  await withLibrary(async (library, baseUrl) => {
    const cookie = await sessionCookie(baseUrl, library);
    const before = snapshot(library);
    const bodies: string[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      const reply = await call(baseUrl, 'GET', SETUP_STATUS_ROUTE, {
        Host: HOST,
        Cookie: cookie,
      });
      expect(reply.status).toBe(200);
      expect(reply.headers['set-cookie']).toBeUndefined();
      bodies.push(reply.body);
    }
    expect(new Set(bodies).size).toBe(1);
    expect(snapshot(library)).toEqual(before);
  });
});

it('without a valid cookie, status and Continue answer 401 AUTH_REQUIRED and change nothing', async () => {
  await withLibrary(async (library, baseUrl) => {
    const before = snapshot(library);
    const forged = `scriba_setup_${PORT}=1700000000000.forged`;
    const attempts: {
      method: 'GET' | 'POST';
      path: string;
      headers: Record<string, string>;
    }[] = [
      { method: 'GET', path: SETUP_STATUS_ROUTE, headers: { Host: HOST } },
      {
        method: 'GET',
        path: SETUP_STATUS_ROUTE,
        headers: { Host: HOST, Cookie: forged },
      },
      {
        method: 'POST',
        path: SETUP_CONTINUE_ROUTE,
        headers: { Host: HOST, Origin: ORIGIN, 'Content-Length': '0' },
      },
      {
        method: 'POST',
        path: SETUP_CONTINUE_ROUTE,
        headers: {
          Host: HOST,
          Origin: ORIGIN,
          Cookie: forged,
          'Content-Length': '0',
        },
      },
    ];
    for (const attempt of attempts) {
      const reply = await call(
        baseUrl,
        attempt.method,
        attempt.path,
        attempt.headers,
      );
      expect(reply.status).toBe(401);
      const parsed = errorBodySchema.safeParse(JSON.parse(reply.body));
      expect(parsed.success && parsed.data.error.code).toBe('AUTH_REQUIRED');
    }
    expect(snapshot(library)).toEqual(before);
    const doc = parse(
      readFileSync(join(library, '.scriba', 'settings.yaml'), 'utf8'),
    ) as SettingsDoc;
    expect(doc.setupAuth.complete).toBe(false);
  });
});
