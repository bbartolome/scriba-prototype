import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Global, Module, type Type } from '@nestjs/common';
import { it } from 'vitest';
import {
  EXPORT_ROUTE,
  type ExportFormat,
} from '@bbartolome/scriba-contracts/compile-export';
import { COMPOSED_MODULES } from '../src/app.module';
import {
  DEFAULT_PANDOC_TUNING,
  PANDOC_TUNING,
  type PandocTuning,
} from '../src/modules/compile-export/export-tuning';
import type { TestApp } from './create-test-app';
import { send, type Reply } from './guard-request';
import { LOOPBACK_HOST } from './invariant-sweep';
import { withManuscript } from './compile-export-manuscript.kit';
import { postJson } from './project-store-projects.kit';

// The status of an external tool: `run` when present, `fail` when missing and required, `skip` otherwise (D28).
export type ToolStatus = 'run' | 'fail' | 'skip';

export function toolStatus(present: boolean, required: boolean): ToolStatus {
  if (present) return 'run';
  return required ? 'fail' : 'skip';
}

// Whether Pandoc answers on this host. A missing binary is a spawn error, so the status is not 0.
const hasPandoc = spawnSync('pandoc', ['--version']).status === 0;
const requireTools = process.env.SCRIBA_REQUIRE_EXPORT_TOOLS === '1';

export const PANDOC_STATUS: ToolStatus = toolStatus(hasPandoc, requireTools);

// A missing required tool fails the file at load, so CI cannot pass with the tests skipped.
if (PANDOC_STATUS === 'fail') {
  throw new Error(
    'pandoc not found, and SCRIBA_REQUIRE_EXPORT_TOOLS=1 requires it: install Pandoc 3.13 or unset the flag.',
  );
}
if (PANDOC_STATUS === 'skip') {
  console.warn(
    'pandoc not found: the Pandoc tests are skipped (set SCRIBA_REQUIRE_EXPORT_TOOLS=1 to make this a failure)',
  );
}

// A Pandoc test: it runs when Pandoc is present and is skipped with the message above otherwise.
export const itPandoc = PANDOC_STATUS === 'run' ? it : it.skip;

// A module that provides the Pandoc tuning, merged over the defaults. It is global, so the export service sees it.
export function tuningModule(values: Partial<PandocTuning>): Type<unknown> {
  @Global()
  @Module({
    providers: [
      {
        provide: PANDOC_TUNING,
        useValue: { ...DEFAULT_PANDOC_TUNING, ...values },
      },
    ],
    exports: [PANDOC_TUNING],
  })
  class PandocTuningModule {}
  return PandocTuningModule;
}

// Boots the composed app with the tuning on a manuscript library (D25).
export function withExport<T>(
  files: Record<string, string>,
  tuning: Partial<PandocTuning>,
  run: (app: TestApp, cookie: string, library: string) => Promise<T>,
): Promise<T> {
  return withManuscript(files, run, {
    modules: [...COMPOSED_MODULES, tuningModule(tuning)],
  });
}

// A fake Pandoc: a /bin/sh script with `body`, in its own temp folder. The caller removes the folder, which is the
// dirname of the returned path (D26). No test edits PATH.
export function fakePandoc(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'scriba-fake-pandoc-'));
  const path = join(dir, 'pandoc');
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
  return path;
}

// Removes the folder of a fake Pandoc.
export function removeFake(path: string): void {
  rmSync(dirname(path), { recursive: true, force: true });
}

// One POST of the export route.
export function postExport(
  app: TestApp,
  cookie: string,
  format: ExportFormat,
): Promise<Reply> {
  return postJson(app, cookie, EXPORT_ROUTE, { format });
}

// One GET of the download route, with the loopback Host and the session cookie.
export function downloadOf(
  app: TestApp,
  cookie: string,
  format: ExportFormat,
): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie,
    path: `/api/compile-export/exports/${format}`,
  });
}
