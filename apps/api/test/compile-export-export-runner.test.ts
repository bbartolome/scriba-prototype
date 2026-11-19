import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exportResultSchema } from '@bbartolome/scriba-contracts/compile-export';
import {
  fakePandoc,
  postExport,
  removeFake,
  withExport,
} from './compile-export-export.kit';

// Runs use a fake Pandoc (D26): a /bin/sh script that stands in for the binary. Each test removes its fake.
const SOURCE = { 'drafts/a.md': '# Chapter one\n\nBody text one.\n' };

// The output path of the fake's arguments: the value of the last --output= argument.
const FIND_OUTPUT =
  'out=""; for a in "$@"; do case "$a" in --output=*) out="${a#--output=}" ;; esac; done';

// Polls until the file exists, so a test starts its second request while the first one runs.
async function waitForFile(path: string): Promise<void> {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    if (existsSync(path)) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`${path} never appeared`);
}

function exportsFolder(library: string): string {
  return join(library, 'book', '.scriba', 'compile-export', 'exports');
}

describe('compile-export export runner', () => {
  it('criterion 2: a second export while Pandoc runs returns COMPILE_EXPORT_BUSY', async () => {
    const command = fakePandoc(
      'touch "$(dirname "$0")/started"; sleep 2; exit 2',
    );
    try {
      await withExport(SOURCE, { command }, async (app, cookie) => {
        const first = postExport(app, cookie, 'docx');
        await waitForFile(join(dirname(command), 'started'));
        const second = await postExport(app, cookie, 'md');
        expect(second.status).toBe(409);
        expect(JSON.parse(second.body).error.code).toBe('COMPILE_EXPORT_BUSY');
        expect((await first).status).toBe(500);
      });
    } finally {
      removeFake(command);
    }
  });

  it('criterion 2: a forced Pandoc failure returns COMPILE_PANDOC_FAILED with the exit code and the stderr tail', async () => {
    const command = fakePandoc("echo 'pandoc: boom' >&2; exit 3");
    try {
      await withExport(SOURCE, { command }, async (app, cookie) => {
        const reply = await postExport(app, cookie, 'docx');
        expect(reply.status).toBe(500);
        const error = JSON.parse(reply.body).error;
        expect(error.code).toBe('COMPILE_PANDOC_FAILED');
        expect(error.details.reason).toBe('exit');
        expect(error.details.exitCode).toBe(3);
        expect(error.details.stderrTail).toContain('pandoc: boom');
        expect(error.message).toBe('Pandoc failed. pandoc: boom');
      });
    } finally {
      removeFake(command);
    }
  });

  it('criterion 2: a stalled Pandoc returns COMPILE_PANDOC_TIMEOUT when the time limit passes', async () => {
    const command = fakePandoc('exec sleep 30');
    try {
      await withExport(
        SOURCE,
        { command, timeoutMs: 500 },
        async (app, cookie) => {
          const started = Date.now();
          const reply = await postExport(app, cookie, 'docx');
          expect(reply.status).toBe(504);
          expect(JSON.parse(reply.body).error.code).toBe(
            'COMPILE_PANDOC_TIMEOUT',
          );
          expect(Date.now() - started).toBeLessThan(10000);
        },
      );
    } finally {
      removeFake(command);
    }
  });

  it('extra: output over the cap returns COMPILE_PANDOC_FAILED with reason output-too-large and no file', async () => {
    const command = fakePandoc(
      `${FIND_OUTPUT}; head -c 2000 /dev/zero > "$out"`,
    );
    try {
      await withExport(
        SOURCE,
        { command, outputMaxBytes: 1000 },
        async (app, cookie, library) => {
          const reply = await postExport(app, cookie, 'docx');
          expect(reply.status).toBe(500);
          const error = JSON.parse(reply.body).error;
          expect(error.code).toBe('COMPILE_PANDOC_FAILED');
          expect(error.details.reason).toBe('output-too-large');
          const folder = exportsFolder(library);
          const left = existsSync(folder) ? readdirSync(folder) : [];
          expect(left.filter((name) => name.endsWith('.docx'))).toEqual([]);
        },
      );
    } finally {
      removeFake(command);
    }
  });

  it('extra: stderr warnings are returned on success', async () => {
    const command = fakePandoc(
      `${FIND_OUTPUT}; printf x > "$out"; echo 'Warning: a test warning' >&2; exit 0`,
    );
    try {
      await withExport(SOURCE, { command }, async (app, cookie) => {
        const reply = await postExport(app, cookie, 'docx');
        expect(reply.status).toBe(200);
        const result = exportResultSchema.parse(JSON.parse(reply.body));
        expect(result.warnings).toEqual(['Warning: a test warning']);
      });
    } finally {
      removeFake(command);
    }
  });

  it('extra: no partial file remains after a failure', async () => {
    // The fake writes the partial output and then fails, so the runner must remove what Pandoc left behind.
    const command = fakePandoc(
      `${FIND_OUTPUT}; printf x > "$out"; echo 'pandoc: boom' >&2; exit 3`,
    );
    try {
      await withExport(SOURCE, { command }, async (app, cookie, library) => {
        const reply = await postExport(app, cookie, 'docx');
        expect(reply.status).toBe(500);
        const folder = exportsFolder(library);
        const left = existsSync(folder) ? readdirSync(folder) : [];
        expect(left.filter((name) => name.startsWith('.'))).toEqual([]);
      });
    } finally {
      removeFake(command);
    }
  });
});
