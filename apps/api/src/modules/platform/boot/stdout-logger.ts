import { inspect, type InspectOptions } from 'node:util';
import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import type { LogLevelName } from './env';
import { redact } from './redact';

// Levels enabled for each SCRIBA_LOG_LEVEL value.
const ENABLED_LEVELS: Record<LogLevelName, LogLevel[]> = {
  debug: ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'],
  info: ['fatal', 'error', 'warn', 'log'],
  warn: ['fatal', 'error', 'warn'],
  error: ['fatal', 'error'],
};

// Nest's inspect options with colours off: a non-string message, and params on one line.
const MESSAGE_INSPECT: InspectOptions = {
  depth: 5,
  compact: false,
  breakLength: Infinity,
};
const PARAMS_INSPECT: InspectOptions = {
  depth: 5,
  compact: true,
  breakLength: Infinity,
};

// Nest writes error and fatal to stderr. This logger writes them to stdout, with the stack on stdout. Every line is redacted.
export class StdoutLogger extends ConsoleLogger {
  constructor(level: LogLevelName) {
    super({ logLevels: ENABLED_LEVELS[level] });
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    if (!this.isLevelEnabled('error')) return;
    const { messages, context, stack, params } =
      this.getContextAndStackAndMessagesToPrint([message, ...optionalParams]);
    this.printMessages(messages, context, 'error', 'stdout', stack, params);
    if (stack) process.stdout.write(`${redact(`${stack}`)}\n`);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    if (!this.isLevelEnabled('fatal')) return;
    const { messages, context, stack, params } =
      this.getContextAndStackAndMessagesToPrint([message, ...optionalParams]);
    this.printMessages(messages, context, 'fatal', 'stdout', stack, params);
    if (stack) process.stdout.write(`${redact(`${stack}`)}\n`);
  }

  // Nest's single print point, so every line passes here: messages, params, context and the error stack.
  // A string message is redacted as it is; any other message is inspected first. Params are inspected, redacted,
  // and appended to each message with one space; they are then not passed on, so Nest does not print them again.
  protected printMessages(
    messages: unknown[],
    context?: string,
    logLevel?: LogLevel,
    writeStreamType?: 'stdout' | 'stderr',
    errorStack?: unknown,
    params?: Record<string, unknown>,
  ): void {
    const suffix =
      params === undefined ? '' : ` ${redact(inspect(params, PARAMS_INSPECT))}`;
    const lines = messages.map((message) => {
      const text =
        typeof message === 'string'
          ? message
          : inspect(message, MESSAGE_INSPECT);
      return `${redact(text)}${suffix}`;
    });
    super.printMessages(
      lines,
      context === undefined ? undefined : redact(context),
      logLevel,
      writeStreamType,
      typeof errorStack === 'string' ? redact(errorStack) : errorStack,
      undefined,
    );
  }
}
