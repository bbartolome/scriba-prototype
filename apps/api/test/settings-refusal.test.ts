import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { backupEntries, makeLibrary, settingsFilePath } from './settings.kit';

const MAIN = resolve(__dirname, '..', 'dist', 'main.js');
const FIXTURE = resolve(__dirname, 'fixtures', 'boot-with-test-section.cjs');
const CHILD_TIMEOUT_MS = 15000;
const ROLLBACK =
  'To roll back, restore a settings.yaml.bak-* backup made before the upgrade, or run the app version that wrote this file.';

// The child gets only the names the test sets. SCRIBA_LOG_LEVEL=error keeps stdout empty.
function runChild(script: string, library: string): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [script], {
    env: {
      SCRIBA_BOOKS_DIR: library,
      SCRIBA_PACKS_DIR: join(library, 'packs'),
      SCRIBA_EXAMPLES_DIR: join(library, 'examples'),
      SCRIBA_LOG_LEVEL: 'error',
    },
    encoding: 'utf8',
    timeout: CHILD_TIMEOUT_MS,
  });
}

function expectRefusal(
  result: SpawnSyncReturns<string>,
  message: string,
  library: string,
  originalText: string,
): void {
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
  expect(result.stderr.trim()).toBe(message);
  const stackFrame = result.stderr
    .split('\n')
    .some((line) => /^\s+at /.test(line));
  expect(stackFrame).toBe(false);
  expect(readFileSync(settingsFilePath(library), 'utf8')).toBe(originalText);
  expect(backupEntries(library)).toEqual([]);
}

it('a newer envelope schemaVersion and a newer section schemaVersion each exit 1 naming the version', () => {
  const envelopeText = 'schemaVersion: 2\n';
  const sectionText =
    'schemaVersion: 1\nprojects:\n  schemaVersion: 1\ntools:\n  schemaVersion: 2\n';
  const envelopeLibrary = makeLibrary(envelopeText);
  const sectionLibrary = makeLibrary(sectionText);
  try {
    const envelope = runChild(MAIN, envelopeLibrary);
    expectRefusal(
      envelope,
      `Cannot start: ${settingsFilePath(envelopeLibrary)} has top-level schemaVersion 2, but this app supports schemaVersion 1. ${ROLLBACK}`,
      envelopeLibrary,
      envelopeText,
    );

    const section = runChild(FIXTURE, sectionLibrary);
    expectRefusal(
      section,
      `Cannot start: ${settingsFilePath(sectionLibrary)} has section "tools" at schemaVersion 2, but this app supports schemaVersion 1. ${ROLLBACK}`,
      sectionLibrary,
      sectionText,
    );
  } finally {
    rmSync(envelopeLibrary, { recursive: true, force: true });
    rmSync(sectionLibrary, { recursive: true, force: true });
  }
}, 15000);
