import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import type { LogLevelName } from './env';

// Levels enabled for each SCRIBA_LOG_LEVEL value.
const ENABLED_LEVELS: Record<LogLevelName, LogLevel[]> = {
  debug: ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'],
  info: ['fatal', 'error', 'warn', 'log'],
  warn: ['fatal', 'error', 'warn'],
  error: ['fatal', 'error'],
};

// Nest writes error and fatal to stderr. This logger writes them to stdout, with the stack on stdout.
export class StdoutLogger extends ConsoleLogger {
  constructor(level: LogLevelName) {
    super({ logLevels: ENABLED_LEVELS[level] });
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    if (!this.isLevelEnabled('error')) return;
    const { messages, context, stack, params } =
      this.getContextAndStackAndMessagesToPrint([message, ...optionalParams]);
    this.printMessages(messages, context, 'error', 'stdout', stack, params);
    if (stack) process.stdout.write(`${stack}\n`);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    if (!this.isLevelEnabled('fatal')) return;
    const { messages, context, stack, params } =
      this.getContextAndStackAndMessagesToPrint([message, ...optionalParams]);
    this.printMessages(messages, context, 'fatal', 'stdout', stack, params);
    if (stack) process.stdout.write(`${stack}\n`);
  }
}
