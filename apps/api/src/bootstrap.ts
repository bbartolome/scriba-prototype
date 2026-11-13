import 'reflect-metadata';
import { resolve } from 'node:path';
import type { INestApplication, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { buildRootModule, COMPOSED_MODULES } from './app.module';
import { ensureAppState } from './modules/platform/boot/app-state';
import { parseEnv } from './modules/platform/boot/env';
import { StdoutLogger } from './modules/platform/boot/stdout-logger';
import { hostFrameMiddleware } from './modules/setup-auth/host-frame.middleware';
import { buildRequestPolicy } from './modules/setup-auth/request-policy';
import { SetupAuthModule } from './modules/setup-auth/setup-auth.module';

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

// Boot order: env parse, app-state check, request policy, Nest create, hook, init. Does not listen; the caller does.
export async function bootstrap(
  options: BootOptions = {},
): Promise<INestApplication> {
  const env = parseEnv(options.env ?? process.env);
  ensureAppState(env);
  // Refuses a bad SCRIBA_DEV_ORIGINS with a BootError before any Nest code runs.
  const policy = buildRequestPolicy(env);
  const modules = options.modules ?? COMPOSED_MODULES;
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
  // Registered before init(), which registers the body parser, so a refused request is never parsed.
  if (modules.includes(SetupAuthModule)) {
    app.use(hostFrameMiddleware(policy));
  }
  try {
    await app.init();
  } catch (error) {
    // The original error is the one to report, so a failing close is ignored here.
    await app.close().catch(() => undefined);
    throw error;
  }
  return app;
}
