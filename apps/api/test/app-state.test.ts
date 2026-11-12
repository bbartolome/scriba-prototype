import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { expect, it } from 'vitest';

const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const DIST = resolve(__dirname, '..', 'dist');
const MAIN = join(DIST, 'main.js');
const CHILD_TIMEOUT_MS = 15000;
const NOBODY = 65534;

// Root runner only (plan open point 6): uid 65534 must enter every ancestor of `path`.
function assertEnterable(path: string): void {
  for (let dir = path; ; dir = dirname(dir)) {
    if ((statSync(dir).mode & 0o001) === 0) {
      throw new Error(
        `uid ${NOBODY} cannot enter ${dir}, so the root case cannot run`,
      );
    }
    if (dirname(dir) === dir) return;
  }
}

// Root runner only: every directory and file under `dir` must be readable by others.
function assertReadable(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const mode = statSync(path).mode;
    if (entry.isDirectory()) {
      if ((mode & 0o001) === 0)
        throw new Error(`uid ${NOBODY} cannot enter ${path}`);
      assertReadable(path);
    } else if ((mode & 0o004) === 0) {
      throw new Error(`uid ${NOBODY} cannot read ${path}`);
    }
  }
}

// The child gets only the names the test sets, never the test process's environment.
function runChild(
  env: Record<string, string>,
  ids: { uid?: number; gid?: number },
): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [MAIN], {
    env,
    encoding: 'utf8',
    timeout: CHILD_TIMEOUT_MS,
    ...ids,
  });
}

function expectBootFailure(
  result: SpawnSyncReturns<string>,
  line: string,
): string[] {
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
  const lines = result.stderr.split('\n');
  expect(lines).toContain(line);
  expect(lines.some((text) => /^\s+at /.test(text))).toBe(false);
  return lines;
}

it('an unwritable .scriba folder exits 1 with a message naming the UID, GID and path, with and without SCRIBA_LIBRARY', () => {
  const runnerIsRoot = process.getuid!() === 0;
  const ids = runnerIsRoot ? { uid: NOBODY, gid: NOBODY } : {};
  const uid = runnerIsRoot ? NOBODY : process.getuid!();
  const gid = runnerIsRoot ? NOBODY : process.getgid!();

  const library = mkdtempSync(join(tmpdir(), 'scriba-ac4-'));
  const appState = join(library, '.scriba');
  try {
    chmodSync(library, 0o755);
    mkdirSync(appState);
    chmodSync(appState, 0o555);
    if (runnerIsRoot) {
      assertEnterable(library);
      assertEnterable(DIST);
      assertEnterable(join(REPO_ROOT, 'node_modules'));
      assertReadable(DIST);
    }

    const env = {
      SCRIBA_BOOKS_DIR: library,
      SCRIBA_PACKS_DIR: join(library, 'packs'),
      SCRIBA_EXAMPLES_DIR: join(library, 'examples'),
    };
    const message = `Cannot write to the app-state folder ${appState} as UID ${uid}, GID ${gid}.`;

    // Run A: SCRIBA_LIBRARY unset, so there is no host line.
    const unset = expectBootFailure(runChild(env, ids), message);
    expect(unset.some((text) => text.startsWith('Host path'))).toBe(false);

    // Run B: SCRIBA_LIBRARY set, so the host line follows.
    const set = expectBootFailure(
      runChild({ ...env, SCRIBA_LIBRARY: library }, ids),
      message,
    );
    expect(set).toContain(`Host path: ${appState}`);
  } finally {
    if (existsSync(appState)) chmodSync(appState, 0o755);
    rmSync(library, { recursive: true, force: true });
  }
});
