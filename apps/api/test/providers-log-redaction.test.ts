import { rmSync } from 'node:fs';
import { expect, it } from 'vitest';
import { createTestApp } from './create-test-app';
import {
  captureStdout,
  makeSecretsLibrary,
  postRoute,
  SecretsKitModule,
  stripAnsi,
} from './secrets.kit';

const MODULES = [SecretsKitModule];
const STORED_KEY = 'stored-key-ABCD1234';
const REQUEST_TOKEN = 'req-token-EFGH5678';

it("a logged request's Authorization header and a stored key are redacted on stdout", async () => {
  const library = makeSecretsLibrary();
  const stdout = captureStdout();
  try {
    const app = await createTestApp({
      libraryDir: library,
      modules: MODULES,
      env: { SCRIBA_LOG_LEVEL: 'info' },
    });
    try {
      expect(
        (
          await postRoute(app, 'put', {
            keyRef: 'openrouter-1',
            key: STORED_KEY,
          })
        ).status,
      ).toBe(204);
      const logged = await postRoute(
        app,
        'log-request',
        {},
        {
          authorization: `Bearer ${REQUEST_TOKEN}`,
        },
      );
      expect(logged.status).toBe(204);
      expect(
        (await postRoute(app, 'log-stored', { keyRef: 'openrouter-1' })).status,
      ).toBe(204);
    } finally {
      await app.close();
    }

    const text = stripAnsi(stdout.text());
    const lines = text.split('\n');
    expect(text).toContain('Authorization: Bearer [redacted]');
    expect(text).toContain("authorization: 'Bearer [redacted]'");
    expect(
      lines.some(
        (line) =>
          line.includes('headers') &&
          line.includes("authorization: 'Bearer [redacted]'"),
      ),
    ).toBe(true);
    expect(
      lines.some(
        (line) => line.includes('stored:') && line.includes('[redacted]'),
      ),
    ).toBe(true);
    expect(text).not.toContain(REQUEST_TOKEN);
    expect(text).not.toContain(STORED_KEY);
  } finally {
    stdout.stop();
    rmSync(library, { recursive: true, force: true });
  }
});

it('a bare key-shaped value is redacted in both a log line and an error line', async () => {
  const library = makeSecretsLibrary();
  const stdout = captureStdout();
  try {
    const app = await createTestApp({
      libraryDir: library,
      modules: MODULES,
      env: { SCRIBA_LOG_LEVEL: 'info' },
    });
    try {
      const logged = await postRoute(app, 'log-text', {
        text: 'config sk-or-v1-PATTERNKEY0001 here',
      });
      expect(logged.status).toBe(204);
    } finally {
      await app.close();
    }

    const text = stripAnsi(stdout.text());
    const lines = text.split('\n');
    expect(
      lines.some(
        (line) =>
          line.includes('LOG') && line.includes('config [redacted] here'),
      ),
    ).toBe(true);
    expect(
      lines.some(
        (line) =>
          line.includes('ERROR') && line.includes('config [redacted] here'),
      ),
    ).toBe(true);
    expect(lines).toContain('Error: config [redacted] here');
    expect(text).not.toContain('PATTERNKEY0001');
  } finally {
    stdout.stop();
    rmSync(library, { recursive: true, force: true });
  }
});
