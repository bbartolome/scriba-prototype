import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { createTestApp, type RouteEntry } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from './invariant-sweep';

const STATIC_ROOT = resolve(__dirname, 'fixtures/static');
const REGISTRY_PREFIX = '/api/tool-registry/';
const LIST_PATH = '/api/tool-registry/tools';

// The eleven routes of the registry controller, as the Nest router mounts them (`:name` syntax).
const REGISTRY_ROUTES: RouteEntry[] = [
  { method: 'GET', path: '/api/tool-registry/tools' },
  { method: 'GET', path: '/api/tool-registry/tools/:name' },
  { method: 'GET', path: '/api/tool-registry/tools/:name/builtin' },
  { method: 'GET', path: '/api/tool-registry/tools/:name/user' },
  { method: 'GET', path: '/api/tool-registry/functions' },
  { method: 'GET', path: '/api/tool-registry/entity-types' },
  { method: 'POST', path: '/api/tool-registry/lint' },
  { method: 'POST', path: '/api/tool-registry/tools/:name/validate' },
  { method: 'POST', path: '/api/tool-registry/tools/:name/enabled' },
  { method: 'POST', path: '/api/tool-registry/tools/:name/save' },
  { method: 'POST', path: '/api/tool-registry/tools/:name/delete' },
];

// Runs the body on a temp library, which the body may boot more than once. The library is removed in a finally.
async function withLibrary<T>(
  body: (library: string) => Promise<T>,
): Promise<T> {
  const library = mkdtempSync(join(tmpdir(), 'scriba-loader-gate-'));
  try {
    return await body(library);
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
}

function errorCodeOf(reply: Reply): unknown {
  const parsed = JSON.parse(reply.body) as { error?: { code?: unknown } };
  return parsed.error?.code;
}

it('loader gate, criterion 2: every mounted /api/tool-registry route answers 401 AUTH_REQUIRED without a cookie, and GET /api/tool-registry/tools answers 200 with one', async () => {
  await withLibrary(async (library) => {
    const app = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
    });
    try {
      // Step 1: the mounted registry routes include each of the eleven.
      const mounted = app
        .routes()
        .filter((route) => route.path.startsWith(REGISTRY_PREFIX));
      expect(mounted).toEqual(expect.arrayContaining(REGISTRY_ROUTES));

      // Step 2: each mounted route refuses a request with no cookie, before the handler runs.
      for (const route of mounted) {
        const label = `${route.method} ${route.path}`;
        expect(['GET', 'POST'], label).toContain(route.method);
        const path = route.path.replace(/:name/g, 'no-such-tool');
        expect(path.includes(':') || path.includes('{'), label).toBe(false);
        const isPost = route.method === 'POST';
        const reply = await send(app.baseUrl, {
          host: LOOPBACK_HOST,
          method: route.method as 'GET' | 'POST',
          path,
          ...(isPost
            ? { origin: LOOPBACK_ORIGIN, headers: { 'Content-Length': '0' } }
            : {}),
        });
        expect(reply.status, label).toBe(401);
        expect(errorCodeOf(reply), label).toBe('AUTH_REQUIRED');
      }

      // Step 3: the control. With the session cookie of the same library, the list answers 200 with a tools array.
      const cookie = await sessionCookie(app, library);
      const listed = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: LIST_PATH,
        cookie,
      });
      expect(listed.status).toBe(200);
      const body = JSON.parse(listed.body) as { tools?: unknown };
      expect(Array.isArray(body.tools)).toBe(true);
    } finally {
      await app.close();
    }
  });
});
