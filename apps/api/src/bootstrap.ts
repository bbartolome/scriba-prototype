import 'reflect-metadata';
import { resolve } from 'node:path';
import type { INestApplication, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { buildRootModule } from './app.module';
import { ensureAppState } from './modules/platform/boot/app-state';
import { parseEnv } from './modules/platform/boot/env';
import { StdoutLogger } from './modules/platform/boot/stdout-logger';

export interface BootOptions {
  env?: Record<string, string | undefined>; // default: process.env
  staticRoot?: string; // absolute; default: the Angular output
  modules?: Type<unknown>[]; // default: COMPOSED_MODULES
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

// Boot order: env parse, app-state check, Nest create, init. Does not listen; the caller does.
export async function bootstrap(
  options: BootOptions = {},
): Promise<INestApplication> {
  const env = parseEnv(options.env ?? process.env);
  ensureAppState(env);
  const app = await NestFactory.create(
    buildRootModule({
      env,
      staticRoot: options.staticRoot ?? DEFAULT_STATIC_ROOT,
      modules: options.modules,
    }),
    {
      abortOnError: false,
      logger: new StdoutLogger(env.SCRIBA_LOG_LEVEL),
    },
  );
  await app.init();
  return app;
}
