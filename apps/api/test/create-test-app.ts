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
export async function createTestApp(
  options: TestAppOptions = {},
): Promise<TestApp> {
  const ownsLibrary = options.libraryDir === undefined;
  const library =
    options.libraryDir ?? mkdtempSync(join(tmpdir(), 'scriba-api-test-'));
  let app: INestApplication | undefined;
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
  } catch (error) {
    // A failed setup must not leak the temp library or an initialized app.
    await app?.close();
    if (ownsLibrary) rmSync(library, { recursive: true, force: true });
    throw error;
  }
  const { port } = app.getHttpServer().address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  return {
    baseUrl,
    sse: (path) => readSse(baseUrl + path),
    close: async () => {
      await app.close();
      if (ownsLibrary) rmSync(library, { recursive: true, force: true });
    },
  };
}
