import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  createSandbox,
  disposeSandbox,
  emitInstaller,
  installerEnv,
  makeBin,
  modeOf,
  physicalPath,
  readLog,
  runInstaller,
  snapshot,
  type RunResult,
  type Sandbox,
} from './installer-harness';

const UID = String(process.getuid?.() ?? -1);
const GID = String(process.getgid?.() ?? -1);

interface Install {
  sandbox: Sandbox;
  emitted: RunResult;
  run: RunResult;
}

// One first install in a fresh HOME and install folder, run the way the one-liner runs it.
async function firstInstall(
  extra: Record<string, string>,
  installDir?: (sandbox: Sandbox) => string,
): Promise<Install> {
  const sandbox = createSandbox();
  const bin = makeBin(sandbox, { docker: true });
  const env = installerEnv(sandbox, bin, {
    STUB_IMAGE_LOCAL: '0',
    STUB_HEALTH: 'healthy',
    STUB_COMPOSE: '2.30.0',
    ...extra,
  });
  const emitted = emitInstaller(env);
  const cwd = installDir ? installDir(sandbox) : sandbox.install;
  const run =
    emitted.code === 0
      ? await runInstaller(emitted.stdout, env, cwd)
      : { code: null, stdout: '', stderr: '' };
  return { sandbox, emitted, run };
}

function envFile(library: string, port: string, tag: string): string {
  return (
    `SCRIBA_LIBRARY="${library}"\n` +
    `SCRIBA_UID=${UID}\n` +
    `SCRIBA_GID=${GID}\n` +
    `SCRIBA_PORT=${port}\n` +
    `SCRIBA_IMAGE_TAG=${tag}\n` +
    `SCRIBA_COMPOSE_VERSION=2\n`
  );
}

it('first install writes the library, `.env`, the compose file and a 0600 `.secret`, starts the stack, waits for healthy and prints the setup URL; with no setup-url it prints the loopback URL', async () => {
  const first = await firstInstall({
    STUB_SETUP_URL: '1',
    TS_AUTHKEY: 'tskey-test-123',
  });
  const second = await firstInstall({ STUB_SETUP_URL: '0' });
  try {
    const { sandbox, run } = first;
    expect(first.emitted.code).toBe(0);
    expect(run.code).toBe(0);

    const library = join(sandbox.home, 'Books');
    expect(readFileSync(join(sandbox.install, '.env'), 'utf8')).toBe(
      envFile(library, '8080', '0.1.0'),
    );
    for (const name of [
      'compose.yaml',
      'compose-version',
      'installer-hint.txt',
      'RUNBOOK.md',
    ]) {
      expect(readFileSync(join(sandbox.install, name))).toEqual(
        readFileSync(join(sandbox.fixture, name)),
      );
    }
    expect(modeOf(sandbox.install)).toBe(0o700);
    expect(readFileSync(join(sandbox.install, '.secret'), 'utf8')).toBe(
      'TS_AUTHKEY=tskey-test-123\n',
    );
    expect(modeOf(join(sandbox.install, '.secret'))).toBe(0o600);
    expect(modeOf(join(library, '.scriba'))).toBe(0o700);

    const calls = readLog(sandbox);
    const pullAt = calls.indexOf('pull bbartolome/scriba:0.1.0');
    const extractAt = calls.findIndex(
      (line) => line.startsWith('run ') && line.includes('--entrypoint tar'),
    );
    expect(pullAt).toBeGreaterThanOrEqual(0);
    expect(pullAt).toBeLessThan(extractAt);
    expect(calls).toContain('compose up -d');
    expect(calls).toContain(`cwd ${physicalPath(sandbox.install)}`);
    expect(calls.some((line) => line.startsWith('inspect -f'))).toBe(true);

    // The pull's progress goes to stderr, not to the installer's stdout; no "No such image" text.
    expect(run.stdout).not.toContain('stub progress');
    expect(run.stderr).toContain('stub progress');
    expect(run.stdout + run.stderr).not.toContain('No such image');

    // The setup URL is printed (from setup-url), before the Ollama line and the hint.
    const setupUrl = readFileSync(
      join(library, '.scriba', 'setup-url'),
      'utf8',
    ).split('\n')[0];
    const hintFirstLine = readFileSync(
      join(sandbox.fixture, 'installer-hint.txt'),
      'utf8',
    ).split('\n')[0];
    const lines = run.stdout.split('\n');
    const urlAt = lines.indexOf(setupUrl);
    const ollamaAt = lines.findIndex((line) =>
      line.includes('OLLAMA_CONTEXT_LENGTH='),
    );
    const hintAt = lines.indexOf(hintFirstLine);
    expect(urlAt).toBeGreaterThanOrEqual(0);
    expect(ollamaAt).toBeGreaterThan(urlAt);
    expect(hintAt).toBeGreaterThan(ollamaAt);

    // Second run: no setup-url yet, so the loopback URL is printed instead.
    expect(second.emitted.code).toBe(0);
    expect(second.run.code).toBe(0);
    expect(
      existsSync(join(second.sandbox.home, 'Books', '.scriba', 'setup-url')),
    ).toBe(false);
    const secondLines = second.run.stdout.split('\n');
    const loopbackAt = secondLines.indexOf('http://127.0.0.1:8080');
    const secondOllamaAt = secondLines.findIndex((line) =>
      line.includes('OLLAMA_CONTEXT_LENGTH='),
    );
    expect(loopbackAt).toBeGreaterThanOrEqual(0);
    expect(secondOllamaAt).toBeGreaterThan(loopbackAt);
  } finally {
    disposeSandbox(first.sandbox);
    disposeSandbox(second.sandbox);
  }
});

it('with no TTY the first install takes the defaults and prompts nothing', async () => {
  const install = await firstInstall({
    STUB_IMAGE_LOCAL: '1',
    STUB_SETUP_URL: '0',
  });
  try {
    const { sandbox, run } = install;
    expect(install.emitted.code).toBe(0);
    expect(run.code).toBe(0);

    const library = join(sandbox.home, 'Books');
    expect(readFileSync(join(sandbox.install, '.env'), 'utf8')).toBe(
      envFile(library, '8080', '0.1.0'),
    );
    expect(existsSync(join(sandbox.install, '.secret'))).toBe(false);

    // No prompt text (read -p would write to stderr), and no question on stdout.
    expect(run.stderr).toBe('');
    expect(run.stdout).not.toMatch(/Library|Port|\?/);

    // The image is local, so no pull ran.
    expect(readLog(sandbox).some((line) => line.startsWith('pull '))).toBe(
      false,
    );
  } finally {
    disposeSandbox(install.sandbox);
  }
});

it('a TS_AUTHKEY with characters outside letters, digits, _ and - exits 1 and writes nothing', async () => {
  const sandbox = createSandbox();
  try {
    const bin = makeBin(sandbox, { docker: true });
    const env = installerEnv(sandbox, bin, {
      STUB_IMAGE_LOCAL: '1',
      STUB_HEALTH: 'healthy',
      STUB_COMPOSE: '2.30.0',
      TS_AUTHKEY: 'tskey bad/value',
    });
    const emitted = emitInstaller(env);
    expect(emitted.code).toBe(0);
    const homeBefore = snapshot(sandbox.home);
    const installBefore = snapshot(sandbox.install);

    const run = await runInstaller(emitted.stdout, env, sandbox.install);

    expect(run.code).toBe(1);
    expect(run.stderr).toContain('TS_AUTHKEY');
    expect(snapshot(sandbox.home)).toEqual(homeBefore);
    expect(snapshot(sandbox.install)).toEqual(installBefore);
    // Only the read-only Docker probes may run; no pull, extraction or start.
    const writes = readLog(sandbox).filter((line) =>
      /^(pull |run |compose up)/.test(line),
    );
    expect(writes).toEqual([]);
  } finally {
    disposeSandbox(sandbox);
  }
});

it('an install folder inside the library exits 1 before the library or .env is written', async () => {
  const install = await firstInstall({ STUB_IMAGE_LOCAL: '1' }, (sandbox) => {
    const inside = join(sandbox.home, 'Books', 'inside');
    mkdirSync(inside, { recursive: true });
    return inside;
  });
  try {
    const { sandbox, run } = install;
    expect(install.emitted.code).toBe(0);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('library');
    const inside = join(sandbox.home, 'Books', 'inside');
    expect(existsSync(join(inside, '.env'))).toBe(false);
    expect(existsSync(join(sandbox.home, 'Books', '.scriba'))).toBe(false);
  } finally {
    disposeSandbox(install.sandbox);
  }
});
