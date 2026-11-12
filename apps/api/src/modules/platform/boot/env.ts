import { isAbsolute } from 'node:path';
import { z } from 'zod';
import {
  SCRIBA_ENV_DEFAULTS,
  type ScribaEnvName,
} from '@bbartolome/scriba-contracts/platform';
import { BootError } from './boot-error';

// Injection token for the parsed environment. Only platform code imports it from this file.
export const SCRIBA_ENV = Symbol('SCRIBA_ENV');

export const LOG_LEVEL_NAMES = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevelName = (typeof LOG_LEVEL_NAMES)[number];

export interface ScribaEnv {
  SCRIBA_PORT: number;
  // Raw value. Undefined when unset, which means no host line in the app-state message.
  SCRIBA_LIBRARY: string | undefined;
  SCRIBA_BOOKS_DIR: string;
  SCRIBA_PACKS_DIR: string;
  SCRIBA_EXAMPLES_DIR: string;
  SCRIBA_TS_SOCKET: string;
  SCRIBA_WATCHER: boolean;
  SCRIBA_DEV_ORIGINS: string;
  SCRIBA_SETUP_URL_BASE: string;
  SCRIBA_LOG_LEVEL: LogLevelName;
  SCRIBA_COMPOSE_VERSION: number | undefined;
}

export type EnvSource = Record<string, string | undefined>;

const isPort = (value: string): boolean => {
  const port = Number(value);
  return /^\d+$/.test(value) && port >= 1 && port <= 65535;
};

const isNonNegativeInteger = (value: string): boolean =>
  /^(0|[1-9]\d*)$/.test(value) && Number.isSafeInteger(Number(value));

// One rule per SCRIBA_* name. Each rule accepts the raw string and returns the parsed value.
const rules = {
  port: z
    .string()
    .refine(isPort, 'expected an integer from 1 to 65535')
    .transform(Number),
  absolutePath: z.string().refine(isAbsolute, 'expected an absolute path'),
  library: z.string().min(1, 'must not be empty'),
  logLevel: z.enum(LOG_LEVEL_NAMES, {
    error: 'expected one of debug, info, warn, error',
  }),
  watcher: z
    .enum(['true', 'false'], { error: 'expected true or false' })
    .transform((value) => value === 'true'),
  composeVersion: z
    .string()
    .refine(isNonNegativeInteger, 'expected a non-negative integer')
    .transform(Number)
    .optional(),
  url: z.url({ error: 'expected a URL' }),
  text: z.string(),
} as const;

// The contract default for a name, or undefined when the contract has none (null).
const defaultOf = (name: ScribaEnvName): string | undefined =>
  SCRIBA_ENV_DEFAULTS[name] ?? undefined;

// Reads one name: the variable when set, else the fallback. A bad value throws BootError.
function read<T>(
  source: EnvSource,
  name: ScribaEnvName,
  rule: z.ZodType<T>,
  fallback: string | undefined,
): T {
  const raw = source[name] ?? fallback;
  const result = rule.safeParse(raw);
  if (!result.success) {
    const reason = result.error.issues[0]?.message ?? 'invalid value';
    throw new BootError(`Invalid ${name} "${raw}": ${reason}.`);
  }
  return result.data;
}

// Parses every SCRIBA_* name that the contract lists (compose-only names excluded).
export function parseEnv(source: EnvSource): ScribaEnv {
  const port = read(
    source,
    'SCRIBA_PORT',
    rules.port,
    defaultOf('SCRIBA_PORT'),
  );
  return {
    SCRIBA_PORT: port,
    SCRIBA_LIBRARY: read(
      source,
      'SCRIBA_LIBRARY',
      rules.library.optional(),
      undefined,
    ),
    SCRIBA_BOOKS_DIR: read(
      source,
      'SCRIBA_BOOKS_DIR',
      rules.absolutePath,
      defaultOf('SCRIBA_BOOKS_DIR'),
    ),
    SCRIBA_PACKS_DIR: read(
      source,
      'SCRIBA_PACKS_DIR',
      rules.absolutePath,
      defaultOf('SCRIBA_PACKS_DIR'),
    ),
    SCRIBA_EXAMPLES_DIR: read(
      source,
      'SCRIBA_EXAMPLES_DIR',
      rules.absolutePath,
      defaultOf('SCRIBA_EXAMPLES_DIR'),
    ),
    SCRIBA_TS_SOCKET: read(
      source,
      'SCRIBA_TS_SOCKET',
      rules.text,
      defaultOf('SCRIBA_TS_SOCKET'),
    ),
    SCRIBA_WATCHER: read(
      source,
      'SCRIBA_WATCHER',
      rules.watcher,
      defaultOf('SCRIBA_WATCHER'),
    ),
    SCRIBA_DEV_ORIGINS: read(
      source,
      'SCRIBA_DEV_ORIGINS',
      rules.text,
      defaultOf('SCRIBA_DEV_ORIGINS'),
    ),
    SCRIBA_SETUP_URL_BASE: read(
      source,
      'SCRIBA_SETUP_URL_BASE',
      rules.url,
      `http://127.0.0.1:${port}`,
    ),
    SCRIBA_LOG_LEVEL: read(
      source,
      'SCRIBA_LOG_LEVEL',
      rules.logLevel,
      defaultOf('SCRIBA_LOG_LEVEL'),
    ),
    SCRIBA_COMPOSE_VERSION: read(
      source,
      'SCRIBA_COMPOSE_VERSION',
      rules.composeVersion,
      undefined,
    ),
  };
}
