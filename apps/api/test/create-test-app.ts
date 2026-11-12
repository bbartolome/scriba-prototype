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

export interface TestApp {
  baseUrl: string;
  sse: (path: string) => AsyncGenerator<string>;
  close: () => Promise<void>;
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
    close: async () => {
      try {
        await started.close();
      } finally {
        removeLibrary();
      }
    },
  };
}
