import { mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi } from 'vitest';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Module,
  Post,
  Query,
} from '@nestjs/common';
import { PlatformModule } from '../src/modules/platform/platform.module';
import { SecretsStore } from '../src/modules/providers/secrets/secrets-store';
import type { TestApp } from './create-test-app';

// Test-only routes over the secrets helper. M1 has no secrets route (MPR-06 adds them), so these exist only in this kit.
// The logger is named, so the context is never taken from logged text.
@Controller('api/secrets-test')
class SecretsKitController {
  private readonly logger = new Logger('SecretsTest');

  constructor(private readonly secrets: SecretsStore) {}

  @Post('put')
  @HttpCode(204)
  put(@Body() body: { keyRef: string; key: string }): void {
    this.secrets.put(body.keyRef, body.key);
  }

  @Post('delete')
  @HttpCode(204)
  delete(@Body() body: { keyRef: string }): void {
    this.secrets.delete(body.keyRef);
  }

  @Post('matches')
  matches(@Body() body: { keyRef: string; candidate: string }): {
    matches: boolean;
  } {
    return { matches: this.secrets.get(body.keyRef) === body.candidate };
  }

  @Get('has')
  has(@Query('keyRef') keyRef: string): { has: boolean } {
    return { has: this.secrets.has(keyRef) };
  }

  @Get('hint')
  hint(@Query('keyRef') keyRef: string): { hint: string | null } {
    return { hint: this.secrets.hint(keyRef) ?? null };
  }

  // Logs the Authorization header three ways: as part of a string, as an object message, and as params.
  @Post('log-request')
  @HttpCode(204)
  logRequest(
    @Headers('authorization') authorization: string | undefined,
  ): void {
    const value = authorization ?? '';
    this.logger.log(
      `POST /api/secrets-test/log-request Authorization: ${value}`,
    );
    this.logger.log({ authorization: value });
    this.logger.log('headers', { authorization: value });
  }

  @Post('log-stored')
  @HttpCode(204)
  logStored(@Body() body: { keyRef: string }): void {
    this.logger.log(`stored: ${this.secrets.get(body.keyRef)}`);
  }

  // Logs the text as a message, then as an error with a stack line. The stack line is the second argument.
  @Post('log-text')
  @HttpCode(204)
  logText(@Body() body: { text: string }): void {
    const { text } = body;
    this.logger.log(text);
    this.logger.error(
      text,
      `Error: ${text}\n    at SecretsKitController.logText (secrets.kit.ts:1:1)`,
    );
  }
}

@Module({
  imports: [PlatformModule],
  controllers: [SecretsKitController],
  providers: [SecretsStore],
})
export class SecretsKitModule {}

// A fresh temp library, which the caller removes.
export function makeSecretsLibrary(): string {
  return mkdtempSync(join(tmpdir(), 'scriba-secrets-'));
}

export function scribaFolder(library: string): string {
  return join(library, '.scriba');
}

export function secretsFile(library: string): string {
  return join(library, '.scriba', 'secrets.yaml');
}

// The permission bits of a path, for example 0o600.
export function modeOf(path: string): number {
  return statSync(path).mode & 0o777;
}

export function postRoute(
  app: TestApp,
  route: string,
  body: unknown = {},
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(`${app.baseUrl}/api/secrets-test/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

export function getRoute(
  app: TestApp,
  route: string,
  keyRef: string,
): Promise<Response> {
  return fetch(
    `${app.baseUrl}/api/secrets-test/${route}?keyRef=${encodeURIComponent(keyRef)}`,
  );
}

// Keeps everything written to process.stdout until stop(). The text is captured, not printed.
export function captureStdout(): { text: () => string; stop: () => void } {
  const chunks: string[] = [];
  const spy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: string | Uint8Array): boolean => {
      chunks.push(
        typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'),
      );
      return true;
    });
  return {
    text: () => chunks.join(''),
    stop: () => {
      spy.mockRestore();
    },
  };
}

// Removes the ANSI colour sequences that Nest writes around messages.
export function stripAnsi(text: string): string {
  return text.replace(
    new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g'),
    '',
  );
}
