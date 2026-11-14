import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  REPO_ROOT,
  createSandbox,
  disposeSandbox,
  emitInstaller,
  installerEnv,
  makeBin,
  modeOf,
  physicalPath,
  readLog,
  runInstaller,
  runInstallerOnTerminal,
  snapshot,
  useRepoComposeFile,
  type Env,
  type RunResult,
  type Sandbox,
} from './installer-harness';

// PLT-18: the re-run, which is the update branch of the one-liner (a .env in the install folder).
// The stub docker serves the release's installer files. The real Compose CLI runs only in C3.

// The release's tag is the harness pin (STUB_NODE_VERSION in installer-harness.ts).
const RELEASE_TAG = '0.1.0';
const REF = `bbartolome/scriba:${RELEASE_TAG}`;
const TAILSCALE_IMAGE = 'tailscale/tailscale:v1.104.4';
const UID = String(process.getuid?.() ?? -1);
const GID = String(process.getgid?.() ?? -1);
const ENV_BACKUP = /^\.env\.bak\.(\d{8}T\d{6}Z)$/;
const COMPOSE_BACKUP = /^compose\.yaml\.bak\.(\d{8}T\d{6}Z)$/;

interface Rerun {
  emitted: RunResult;
  run: RunResult;
}

// The stub environment of a re-run: a local image, a healthy scriba, Compose 2.30.0. Tests add or
// override variables through `extra`.
function stubEnv(sandbox: Sandbox, extra: Env = {}): Env {
  return installerEnv(sandbox, makeBin(sandbox, { docker: true }), {
    STUB_IMAGE_LOCAL: '1',
    STUB_HEALTH: 'healthy',
    STUB_COMPOSE: '2.30.0',
    STUB_SETUP_URL: '0',
    ...extra,
  });
}

// Prints the script, then runs it the way `| bash` does (a pipe, no terminal), in `cwd`.
async function rerun(
  sandbox: Sandbox,
  extra: Env = {},
  cwd = sandbox.install,
): Promise<Rerun> {
  const env = stubEnv(sandbox, extra);
  const emitted = emitInstaller(env);
  expect(emitted.code).toBe(0);
  const run = await runInstaller(emitted.stdout, env, cwd);
  return { emitted, run };
}

// The .env of an install made by the first install, with the given tag and compose version.
function oldEnvText(library: string, tag: string, version: string): string {
  return [
    `SCRIBA_LIBRARY="${library}"`,
    `SCRIBA_UID=${UID}`,
    `SCRIBA_GID=${GID}`,
    'SCRIBA_PORT=8080',
    `SCRIBA_IMAGE_TAG=${tag}`,
    `SCRIBA_COMPOSE_VERSION=${version}`,
  ]
    .map((line) => `${line}\n`)
    .join('');
}

// An older install in the sandbox: that .env and an older compose.yaml. The library is in the
// sandbox root, outside the install folder.
function writeOldInstall(
  sandbox: Sandbox,
  tag = '0.0.8',
  version = '1',
): string {
  const library = join(sandbox.root, 'Books');
  writeFileSync(
    join(sandbox.install, '.env'),
    oldEnvText(library, tag, version),
  );
  writeFileSync(
    join(sandbox.install, 'compose.yaml'),
    'name: scriba\n# older local copy\n',
  );
  return library;
}

// The stamps of the backups in the install folder whose names match the pattern.
function stampsOf(install: string, pattern: RegExp): string[] {
  return readdirSync(install)
    .map((name) => pattern.exec(name)?.[1])
    .filter((stamp): stamp is string => stamp !== undefined)
    .sort();
}

// The snapshot line of one top-level file, and the digest in its last field.
function entryOf(lines: string[], name: string): string | undefined {
  return lines.find((line) => line.startsWith(`file ${name} `));
}

function digestOf(line: string | undefined): string | undefined {
  return line?.split(' ')[3];
}

// The Markdown section under the first heading that matches. It runs to the next heading of the
// same or a higher level. Headings inside fenced code are skipped.
function sectionOf(markdown: string, heading: RegExp): string {
  const lines = markdown.split('\n');
  let inFence = false;
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    const match = /^(#{1,6}) (.*)$/.exec(line);
    if (inFence || !match) {
      continue;
    }
    if (start < 0) {
      if (heading.test(match[2])) {
        start = i;
        level = match[1].length;
      }
    } else if (match[1].length <= level) {
      return lines.slice(start, i).join('\n');
    }
  }
  return start < 0 ? '' : lines.slice(start).join('\n');
}

// The real Compose CLI, with the real PATH, the sandbox HOME, and no SCRIBA_* or COMPOSE_* variable
// from the developer's shell.
function realCompose(sandbox: Sandbox, args: string[]): RunResult {
  const result = spawnSync('docker', ['compose', ...args], {
    env: { PATH: process.env.PATH ?? '', HOME: sandbox.home },
    encoding: 'utf8',
  });
  return {
    code: result.status,
    stdout: result.stdout ?? '',
    stderr: result.error ? String(result.error) : (result.stderr ?? ''),
  };
}

// The image references that `config --images` prints for the repo's compose file, sorted. This
// needs Compose 2.24 or later; the test fails, and does not skip, without it.
function renderedImages(sandbox: Sandbox): string[] {
  const version = realCompose(sandbox, ['version', '--short']);
  expect(version.code, version.stderr).toBe(0);
  const parts: string[] =
    /^v?(\d+)\.(\d+)/.exec(version.stdout.trim())?.slice(1) ?? [];
  const [major, minor] = parts.map(Number);
  expect(
    major > 2 || (major === 2 && minor >= 24),
    `Compose 2.24 or later is needed; found: ${version.stdout.trim()}`,
  ).toBe(true);
  const images = realCompose(sandbox, [
    '--project-directory',
    sandbox.install,
    'config',
    '--images',
  ]);
  expect(images.code, images.stderr).toBe(0);
  return images.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .sort();
}

function expectedImages(tag: string): string[] {
  return [`bbartolome/scriba:${tag}`, TAILSCALE_IMAGE].sort();
}

it("re-run with `.env` present prompts nothing, backs up `.env` and `compose.yaml` with a timestamp, keeps existing values, sets `SCRIBA_IMAGE_TAG` to the release's tag, adds a missing key, stamps `SCRIBA_COMPOSE_VERSION`, and leaves `compose.override.yaml` untouched", async () => {
  const sandbox = createSandbox();
  try {
    const library = join(sandbox.root, 'Books');
    // The old .env, in this order. Its SCRIBA_GID line is removed before the run, so the merge
    // has to add that key back.
    const oldLines = [
      `SCRIBA_LIBRARY="${library}"`,
      'SCRIBA_UID=1000',
      `SCRIBA_GID=${GID}`,
      'SCRIBA_PORT=18081',
      'SCRIBA_IMAGE_TAG=0.0.8',
      'SCRIBA_COMPOSE_VERSION=1',
      '# local note',
    ];
    const envBeforeRun = oldLines
      .filter((line) => !line.startsWith('SCRIBA_GID='))
      .map((line) => `${line}\n`)
      .join('');
    writeFileSync(join(sandbox.install, '.env'), envBeforeRun);
    const oldCompose = 'name: scriba\n# older local copy\n';
    writeFileSync(join(sandbox.install, 'compose.yaml'), oldCompose);
    const overridePath = join(sandbox.install, 'compose.override.yaml');
    const override =
      'services:\n  scriba:\n    environment:\n      SCRIBA_OVERRIDE_MARK: "1"\n';
    writeFileSync(overridePath, override);
    chmodSync(overridePath, 0o640);

    const env = stubEnv(sandbox);
    const emitted = emitInstaller(env);
    expect(emitted.code).toBe(0);
    const scriptFile = join(sandbox.root, 'installer.sh');
    writeFileSync(scriptFile, emitted.stdout);

    // Two answers are queued on a terminal: a prompt would show them and read them.
    const run = await runInstallerOnTerminal(
      scriptFile,
      env,
      sandbox.install,
      `${join(sandbox.root, 'Elsewhere')}\n19999\n`,
    );

    expect(run.code).toBe(0);
    expect(run.stdout).not.toContain('Folder for your books');
    expect(run.stdout).not.toContain('Web port');

    // One backup of each file, with the same stamp, holding the bytes they had before the run.
    const stamps = stampsOf(sandbox.install, ENV_BACKUP);
    expect(stamps).toHaveLength(1);
    expect(stampsOf(sandbox.install, COMPOSE_BACKUP)).toEqual(stamps);
    const [stamp] = stamps;
    expect(
      readFileSync(join(sandbox.install, `.env.bak.${stamp}`), 'utf8'),
    ).toBe(envBeforeRun);
    expect(
      readFileSync(join(sandbox.install, `compose.yaml.bak.${stamp}`), 'utf8'),
    ).toBe(oldCompose);

    // The old lines keep their order. The tag and the compose version take their new values in
    // place, and the missing SCRIBA_GID is appended.
    const expectedEnv = [
      `SCRIBA_LIBRARY="${library}"`,
      'SCRIBA_UID=1000',
      'SCRIBA_PORT=18081',
      `SCRIBA_IMAGE_TAG=${RELEASE_TAG}`,
      'SCRIBA_COMPOSE_VERSION=2',
      '# local note',
      `SCRIBA_GID=${GID}`,
    ]
      .map((line) => `${line}\n`)
      .join('');
    expect(readFileSync(join(sandbox.install, '.env'), 'utf8')).toBe(
      expectedEnv,
    );
    expect(readFileSync(join(sandbox.install, 'compose.yaml'))).toEqual(
      readFileSync(join(sandbox.fixture, 'compose.yaml')),
    );
    expect(readFileSync(overridePath, 'utf8')).toBe(override);
    expect(modeOf(overridePath)).toBe(0o640);
    expect(modeOf(sandbox.install)).toBe(0o700);

    const calls = readLog(sandbox);
    expect(calls).toContain('compose up -d');
    expect(calls).toContain(`cwd ${physicalPath(sandbox.install)}`);
  } finally {
    disposeSandbox(sandbox);
  }
});

it('a second re-run changes nothing except one more pair of backups', async () => {
  const sandbox = createSandbox();
  try {
    writeOldInstall(sandbox);
    const first = await rerun(sandbox);
    expect(first.run.code).toBe(0);
    const afterFirst = snapshot(sandbox.install);

    const second = await rerun(sandbox);
    expect(second.run.code).toBe(0);
    const afterSecond = snapshot(sandbox.install);

    // Nothing was removed. The two new entries are one backup of .env and one of compose.yaml,
    // each with the digest of the file it copies; .env and compose.yaml are unchanged.
    expect(afterFirst.filter((line) => !afterSecond.includes(line))).toEqual(
      [],
    );
    const added = afterSecond.filter((line) => !afterFirst.includes(line));
    expect(added).toHaveLength(2);
    const envBackup = added.find((line) => line.startsWith('file .env.bak.'));
    const composeBackup = added.find((line) =>
      line.startsWith('file compose.yaml.bak.'),
    );
    expect(envBackup, 'a new .env backup').toBeDefined();
    expect(composeBackup, 'a new compose.yaml backup').toBeDefined();
    expect(digestOf(envBackup)).toBe(digestOf(entryOf(afterFirst, '.env')));
    expect(digestOf(composeBackup)).toBe(
      digestOf(entryOf(afterFirst, 'compose.yaml')),
    );
    expect(entryOf(afterSecond, '.env')).toBe(entryOf(afterFirst, '.env'));
    expect(entryOf(afterSecond, 'compose.yaml')).toBe(
      entryOf(afterFirst, 'compose.yaml'),
    );
  } finally {
    disposeSandbox(sandbox);
  }
});

it("a re-run moves `SCRIBA_IMAGE_TAG` to the release's tag; the image `up -d` would use, as rendered by `config --images`, is the tag set by hand; restoring the `.env` backup renders the tag it held; the README's rollback section names `SCRIBA_IMAGE_TAG`, `up -d` and the backup restore", async () => {
  const sandbox = createSandbox();
  try {
    useRepoComposeFile(sandbox);
    writeOldInstall(sandbox, '0.0.8', '1');
    const envPath = join(sandbox.install, '.env');

    // 1. The stub re-run. Backup A holds 0.0.8, and .env now holds the release's tag.
    const { run } = await rerun(sandbox);
    expect(run.code).toBe(0);
    const stamps = stampsOf(sandbox.install, ENV_BACKUP);
    expect(stamps).toHaveLength(1);
    const backupA = join(sandbox.install, `.env.bak.${stamps[0]}`);
    expect(readFileSync(backupA, 'utf8')).toContain('SCRIBA_IMAGE_TAG=0.0.8');
    expect(readFileSync(envPath, 'utf8')).toContain(
      `SCRIBA_IMAGE_TAG=${RELEASE_TAG}`,
    );
    const calls = readLog(sandbox);
    expect(calls).toContain('compose up -d');
    expect(calls).toContain(`cwd ${physicalPath(sandbox.install)}`);

    // 2. The tag is set by hand to 0.0.9. The real Compose renders the image that `up -d` uses.
    writeFileSync(
      envPath,
      readFileSync(envPath, 'utf8').replace(
        /^SCRIBA_IMAGE_TAG=.*$/m,
        'SCRIBA_IMAGE_TAG=0.0.9',
      ),
    );
    expect(renderedImages(sandbox)).toEqual(expectedImages('0.0.9'));

    // 3. Backup A is copied back over .env, and the same call renders the tag it held.
    copyFileSync(backupA, envPath);
    expect(renderedImages(sandbox)).toEqual(expectedImages('0.0.8'));

    // The README's rollback section names the tag variable, the `up -d` step and the backup.
    const rollback = sectionOf(
      readFileSync(join(REPO_ROOT, 'README.md'), 'utf8'),
      /roll ?back/i,
    );
    expect(rollback).toContain('SCRIBA_IMAGE_TAG');
    expect(rollback).toContain('up -d');
    expect(rollback).toContain('.env.bak.');
  } finally {
    disposeSandbox(sandbox);
  }
});

it('extra E1: on update, a `.secret` keeps its bytes and mode when TS_AUTHKEY is set, and none is created when there was none', async () => {
  const kept = createSandbox();
  const absent = createSandbox();
  try {
    writeOldInstall(kept);
    const secretPath = join(kept.install, '.secret');
    writeFileSync(secretPath, 'TS_AUTHKEY=tskey-old-123\n');
    chmodSync(secretPath, 0o600);
    const secretBefore = readFileSync(secretPath, 'utf8');

    const keptRun = await rerun(kept, { TS_AUTHKEY: 'tskey-new-456' });
    expect(keptRun.run.code).toBe(0);
    expect(readFileSync(secretPath, 'utf8')).toBe(secretBefore);
    expect(modeOf(secretPath)).toBe(0o600);
    expect(readLog(kept)).toContain('compose up -d');

    writeOldInstall(absent);
    const absentRun = await rerun(absent, { TS_AUTHKEY: 'tskey-new-456' });
    expect(absentRun.run.code).toBe(0);
    expect(existsSync(join(absent.install, '.secret'))).toBe(false);
    expect(readLog(absent)).toContain('compose up -d');
  } finally {
    disposeSandbox(kept);
    disposeSandbox(absent);
  }
});

it('extra E2: a `.env` without `SCRIBA_LIBRARY` exits 1, and the home and the install folder are unchanged', async () => {
  const sandbox = createSandbox();
  try {
    writeFileSync(
      join(sandbox.install, '.env'),
      `SCRIBA_UID=${UID}\nSCRIBA_GID=${GID}\nSCRIBA_PORT=8080\nSCRIBA_IMAGE_TAG=0.0.8\nSCRIBA_COMPOSE_VERSION=1\n`,
    );
    const homeBefore = snapshot(sandbox.home);
    const installBefore = snapshot(sandbox.install);

    const { run } = await rerun(sandbox);

    expect(run.code).toBe(1);
    expect(run.stderr).toContain('SCRIBA_LIBRARY');
    expect(snapshot(sandbox.home)).toEqual(homeBefore);
    expect(snapshot(sandbox.install)).toEqual(installBefore);
  } finally {
    disposeSandbox(sandbox);
  }
});

it('extra E3: an install folder inside the library named by `.env` exits 1 before any write', async () => {
  const sandbox = createSandbox();
  try {
    const library = join(sandbox.home, 'Books');
    mkdirSync(library);
    const inside = join(library, 'inside');
    mkdirSync(inside);
    writeFileSync(join(inside, '.env'), oldEnvText(library, '0.0.8', '1'));
    const homeBefore = snapshot(sandbox.home);

    const { run } = await rerun(sandbox, {}, inside);

    expect(run.code).toBe(1);
    expect(run.stderr).toContain('library');
    expect(snapshot(sandbox.home)).toEqual(homeBefore);
  } finally {
    disposeSandbox(sandbox);
  }
});

it('extra E4: a compose-version that is not a whole number exits 1 before any write, on the first install and on the update', async () => {
  const first = createSandbox();
  const update = createSandbox();
  try {
    // The first install: no .env, so the compose files must not reach the install folder.
    writeFileSync(join(first.fixture, 'compose-version'), 'x\n');
    const firstHome = snapshot(first.home);
    const firstInstall = snapshot(first.install);
    const firstRun = await rerun(first);
    expect(firstRun.run.code).toBe(1);
    expect(firstRun.run.stderr).toContain('compose-version');
    expect(snapshot(first.home)).toEqual(firstHome);
    expect(snapshot(first.install)).toEqual(firstInstall);

    // The update: an existing .env.
    writeFileSync(join(update.fixture, 'compose-version'), 'x\n');
    writeOldInstall(update);
    const updateHome = snapshot(update.home);
    const updateInstall = snapshot(update.install);
    const updateRun = await rerun(update);
    expect(updateRun.run.code).toBe(1);
    expect(updateRun.run.stderr).toContain('compose-version');
    expect(snapshot(update.home)).toEqual(updateHome);
    expect(snapshot(update.install)).toEqual(updateInstall);
  } finally {
    disposeSandbox(first);
    disposeSandbox(update);
  }
});

it('extra E6: the release tag must be local or pullable before any write; with the tag local, a failed pull is printed and the run goes on to `up -d`', async () => {
  const missing = createSandbox();
  const local = createSandbox();
  try {
    writeOldInstall(missing);
    const homeBefore = snapshot(missing.home);
    const installBefore = snapshot(missing.install);

    const missingRun = await rerun(missing, {
      STUB_IMAGE_LOCAL: '0',
      STUB_PULL: 'fail',
    });

    expect(missingRun.run.code).toBe(1);
    expect(missingRun.run.stderr).toContain(REF);
    expect(snapshot(missing.home)).toEqual(homeBefore);
    expect(snapshot(missing.install)).toEqual(installBefore);

    writeOldInstall(local);
    const localRun = await rerun(local, {
      STUB_IMAGE_LOCAL: '0',
      STUB_LOCAL_TAGS: REF,
      STUB_PULL: 'fail',
    });

    expect(localRun.run.code).toBe(0);
    expect(localRun.run.stderr).toContain('pull failed (stub)');
    expect(readLog(local)).toContain('compose up -d');
  } finally {
    disposeSandbox(missing);
    disposeSandbox(local);
  }
});
