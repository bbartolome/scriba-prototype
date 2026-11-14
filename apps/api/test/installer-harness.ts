import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';

// Shared helpers for the PLT-17 installer tests. The tests drive the real entrypoint (SETUP=true),
// the script it prints, and a stub docker, sleep and node on PATH. Nothing here touches Docker.
// Not named *.test.ts, so Vitest does not collect it.

export const REPO_ROOT = resolve(__dirname, '..', '..', '..');
export const ENTRYPOINT = join(REPO_ROOT, 'scripts', 'entrypoint.sh');
const HINT_SOURCE = join(REPO_ROOT, 'deploy', 'installer-hint.txt');

// Host tools that the entrypoint and the printed script call. Each is linked into the test PATH.
const LINKED_TOOLS = [
  'id',
  'tar',
  'cat',
  'mkdir',
  'chmod',
  'sed',
  'grep',
  'bash',
  'mktemp',
  'mv',
  'rm',
];

export type Env = Record<string, string>;

export interface Sandbox {
  readonly root: string;
  readonly home: string;
  readonly install: string;
  readonly tmp: string;
  readonly fixture: string;
  readonly log: string;
}

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

export interface BinOptions {
  docker?: boolean;
  rootUser?: boolean;
}

// A sandbox: a HOME, an install folder (mode 0700, as the cases expect), a temp folder, the
// image's installer files as a folder (served by the stub docker), and the stub call log.
export function createSandbox(): Sandbox {
  const root = mkdtempSync(join(tmpdir(), 'scriba-installer-'));
  const home = join(root, 'home');
  const install = join(root, 'install');
  const tmp = join(root, 'tmp');
  const fixture = join(root, 'image-installer');
  for (const dir of [home, install, tmp, fixture]) {
    mkdirSync(dir);
  }
  chmodSync(install, 0o700);
  chmodSync(fixture, 0o755);
  writeFileSync(join(fixture, 'compose.yaml'), 'name: scriba\n');
  writeFileSync(join(fixture, 'compose-version'), '2\n');
  copyFileSync(HINT_SOURCE, join(fixture, 'installer-hint.txt'));
  writeFileSync(join(fixture, 'RUNBOOK.md'), '# Fixture RUNBOOK\n');
  return { root, home, install, tmp, fixture, log: join(root, 'stub.log') };
}

export function disposeSandbox(sandbox: Sandbox): void {
  rmSync(sandbox.root, { recursive: true, force: true });
}

function findOnPath(tool: string): string {
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    const candidate = join(dir, tool);
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }
  throw new Error(`the installer tests need ${tool} on PATH`);
}

function writeExecutable(path: string, content: string): void {
  writeFileSync(path, content);
  chmodSync(path, 0o755);
}

// A PATH folder: symlinks to the host tools, a stub node, a stub sleep, and optionally a stub
// docker. rootUser replaces id with a stub that prints 0 for `id -u`.
export function makeBin(sandbox: Sandbox, options: BinOptions = {}): string {
  const bin = mkdtempSync(join(sandbox.root, 'bin-'));
  for (const tool of LINKED_TOOLS) {
    if (tool === 'id' && options.rootUser) {
      continue;
    }
    symlinkSync(findOnPath(tool), join(bin, tool));
  }
  if (options.rootUser) {
    writeExecutable(
      join(bin, 'id'),
      `#!/bin/sh\nif [ "$1" = "-u" ]; then echo 0; else exec ${findOnPath('id')} "$@"; fi\n`,
    );
  }
  writeExecutable(join(bin, 'node'), STUB_NODE);
  writeExecutable(join(bin, 'sleep'), STUB_SLEEP);
  if (options.docker) {
    writeExecutable(join(bin, 'docker'), STUB_DOCKER);
  }
  return bin;
}

const STUB_NODE = `#!/bin/sh
case "$*" in
  *revision*) printf '%s\\n' "$STUB_NODE_REVISION" ;;
  *version*) printf '%s\\n' "$STUB_NODE_VERSION" ;;
  *) exit 1 ;;
esac
`;

const STUB_SLEEP = `#!/bin/sh
echo "sleep $*" >> "$STUB_LOG"
`;

// Logs every call to STUB_LOG. Behaviour comes from STUB_* variables:
// STUB_INFO (ok|fail), STUB_IMAGE_LOCAL (1|0), STUB_COMPOSE (a version, or none),
// STUB_HEALTH (healthy|starting|unhealthy), STUB_SETUP_URL (1|0), STUB_FIXTURE (folder for tar).
const STUB_DOCKER = `#!/bin/bash
echo "$*" >> "$STUB_LOG"
case "$1" in
  info)
    if [ "\${STUB_INFO:-ok}" = fail ]; then echo "Cannot connect to the Docker daemon (stub)" >&2; exit 1; fi
    exit 0 ;;
  image)
    if [ "\${STUB_IMAGE_LOCAL:-0}" = 1 ]; then exit 0; fi
    echo "[]"
    echo "Error: No such image: $3" >&2
    exit 1 ;;
  pull)
    echo "1.0.0: Pulling from bbartolome/scriba (stub progress)"
    exit 0 ;;
  run)
    for arg in "$@"; do
      if [ "$arg" = tar ]; then tar -C "$STUB_FIXTURE" -cf - .; exit $?; fi
    done
    exit 1 ;;
  compose)
    case "$2" in
      version)
        if [ "\${STUB_COMPOSE:-2.30.0}" = none ]; then exit 1; fi
        echo "\${STUB_COMPOSE:-2.30.0}"
        exit 0 ;;
      ps)
        echo "stub-container-id"
        exit 0 ;;
      up)
        echo "cwd $(pwd -P)" >> "$STUB_LOG"
        if [ "\${STUB_SETUP_URL:-0}" = 1 ]; then
          (umask 077; printf '%s\\n' "http://127.0.0.1:8080/#setup=stub" > "$HOME/Books/.scriba/setup-url")
        fi
        exit 0 ;;
    esac ;;
  inspect)
    echo "\${STUB_HEALTH:-healthy}"
    exit 0 ;;
esac
exit 2
`;

// The environment for a run. Explicit, so a key or variable in the developer's shell cannot leak in.
export function installerEnv(
  sandbox: Sandbox,
  bin: string,
  extra: Env = {},
): Env {
  return {
    PATH: bin,
    HOME: sandbox.home,
    TMPDIR: sandbox.tmp,
    STUB_LOG: sandbox.log,
    STUB_FIXTURE: sandbox.fixture,
    STUB_NODE_VERSION: '0.1.0',
    STUB_NODE_REVISION: 'abc1234',
    ...extra,
  };
}

// Runs the entrypoint with SETUP=true, as the one-liner does, and returns what it printed.
export function emitInstaller(env: Env): RunResult {
  const result = spawnSync('/bin/sh', [ENTRYPOINT], {
    env: { ...env, SETUP: 'true' },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

// Runs the printed script the way `| bash` does: the script arrives on stdin, the process has
// no controlling terminal (detached), and umask is 022.
export function runInstaller(
  script: string,
  env: Env,
  cwd: string,
): Promise<RunResult> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn('/bin/sh', ['-c', 'umask 022; exec bash'], {
      cwd,
      env,
      detached: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.stdin.on('error', () => undefined);
    const timer = setTimeout(() => {
      if (child.pid !== undefined) {
        process.kill(-child.pid, 'SIGKILL');
      }
    }, 60_000);
    child.on('error', (error) => {
      clearTimeout(timer);
      rejectRun(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolveRun({ code, stdout, stderr });
    });
    child.stdin.end(script);
  });
}

export function readLog(sandbox: Sandbox): string[] {
  if (!existsSync(sandbox.log)) {
    return [];
  }
  return readFileSync(sandbox.log, 'utf8').split('\n').filter(Boolean);
}

export function modeOf(path: string): number {
  return statSync(path).mode & 0o777;
}

export function physicalPath(path: string): string {
  return realpathSync(path);
}

// Every entry under dir with its mode and, for files, a digest. Two equal snapshots mean nothing
// was created, removed or changed.
export function snapshot(dir: string): string[] {
  const lines: string[] = [];
  const walk = (current: string, prefix: string): void => {
    for (const name of readdirSync(current).sort()) {
      const path = join(current, name);
      const label = prefix + name;
      const info = lstatSync(path);
      const mode = (info.mode & 0o7777).toString(8);
      if (info.isDirectory()) {
        lines.push(`dir ${label} ${mode}`);
        walk(path, `${label}/`);
      } else if (info.isFile()) {
        const digest = createHash('sha256')
          .update(readFileSync(path))
          .digest('hex');
        lines.push(`file ${label} ${mode} ${digest}`);
      } else {
        lines.push(`other ${label}`);
      }
    }
  };
  walk(dir, '');
  return lines;
}
