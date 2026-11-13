import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { INestApplication, Type } from '@nestjs/common';
import { bootstrap } from '../src/bootstrap';
import { readSse } from './sse';

export interface TestAppOptions {
  libraryDir?: string; // default: a fresh temp folder, removed on close
  env?: Record<string, string | undefined>; // merged over the base env
  staticRoot?: string; // absolute; default: the Angular output
  modules?: Type<unknown>[]; // replaces COMPOSED_MODULES when set
}

// One method of one enumerated route. `ALL` is a route registered with `all`.
export interface RouteEntry {
  method: string;
  path: string;
}

export interface TestApp {
  baseUrl: string;
  sse: (path: string) => AsyncGenerator<string>;
  close: () => Promise<void>;
  routes: () => RouteEntry[]; // read from the Nest router, after init
}

// The parts of Express's router that the route list reads. apps/api has no @types/express, so the type is structural.
interface RouterLayer {
  route?: { path: string; methods: Record<string, boolean | undefined> };
}

interface ExpressInstance {
  router: { stack: RouterLayer[] };
}

// Every route the Nest router mounted, one entry per method, in the order the router holds them.
function enumerateRoutes(app: INestApplication): RouteEntry[] {
  const instance = app.getHttpAdapter().getInstance() as ExpressInstance;
  return instance.router.stack.flatMap((layer) => {
    const route = layer.route;
    if (route === undefined) return [];
    return Object.keys(route.methods)
      .filter((key) => route.methods[key] === true)
      .map((key) => ({
        method: key === '_all' ? 'ALL' : key.toUpperCase(),
        path: route.path,
      }));
  });
}

const DEFAULT_STATIC_ROOT = resolve(
  __dirname,
  '..',
  '..',
  'web',
  'dist',
  'scriba-web',
  'browser',
);

// Boots the composed app on 127.0.0.1 with an ephemeral port, against a temp library.
// An owned temp library is removed on every path: a failed setup, and close (even when close throws).
export async function createTestApp(
  options: TestAppOptions = {},
): Promise<TestApp> {
  const ownsLibrary = options.libraryDir === undefined;
  const library =
    options.libraryDir ?? mkdtempSync(join(tmpdir(), 'scriba-api-test-'));
  const removeLibrary = (): void => {
    if (ownsLibrary) rmSync(library, { recursive: true, force: true });
  };
  let app: INestApplication | undefined;
  let baseUrl: string;
  try {
    app = await bootstrap({
      env: {
        SCRIBA_BOOKS_DIR: library,
        SCRIBA_PACKS_DIR: join(library, 'packs'),
        SCRIBA_EXAMPLES_DIR: join(library, 'examples'),
        SCRIBA_LOG_LEVEL: 'error',
        ...options.env,
      },
      staticRoot: options.staticRoot ?? DEFAULT_STATIC_ROOT,
      modules: options.modules,
    });
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  } catch (error) {
    try {
      await app?.close();
    } catch {
      // The original error is the one to report.
    } finally {
      removeLibrary();
    }
    throw error;
  }
  const started = app;
  return {
    baseUrl,
    sse: (path) => readSse(baseUrl + path),
    routes: () => enumerateRoutes(started),
    close: async () => {
      try {
        await started.close();
      } finally {
        removeLibrary();
      }
    },
  };
}
