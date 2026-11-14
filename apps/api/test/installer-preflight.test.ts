import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  createSandbox,
  disposeSandbox,
  emitInstaller,
  installerEnv,
  makeBin,
  readLog,
  runInstaller,
  snapshot,
  type BinOptions,
  type Env,
} from './installer-harness';

interface PreflightCase {
  name: string;
  bin: BinOptions;
  env: Env;
}

// Each case must stop before anything is written. Case (a) has no docker on PATH; (b) to (d)
// stub the Compose version; (e) stubs a failing `docker info`.
const CASES: PreflightCase[] = [
  { name: 'no docker on PATH', bin: { docker: false }, env: {} },
  {
    name: 'compose 2.23.0',
    bin: { docker: true },
    env: { STUB_COMPOSE: '2.23.0' },
  },
  {
    name: 'compose 1.29.2',
    bin: { docker: true },
    env: { STUB_COMPOSE: '1.29.2' },
  },
  {
    name: 'compose plugin missing',
    bin: { docker: true },
    env: { STUB_COMPOSE: 'none' },
  },
  {
    name: 'docker info fails',
    bin: { docker: true },
    env: { STUB_INFO: 'fail' },
  },
];

it('a missing Docker, a failing `docker info`, or Compose missing or below 2.24, aborts with exit 1 and writes nothing', async () => {
  for (const testCase of CASES) {
    const sandbox = createSandbox();
    try {
      const bin = makeBin(sandbox, testCase.bin);
      const env = installerEnv(sandbox, bin, {
        STUB_IMAGE_LOCAL: '0',
        STUB_HEALTH: 'healthy',
        ...testCase.env,
      });
      const emitted = emitInstaller(env);
      expect(emitted.code, testCase.name).toBe(0);
      const homeBefore = snapshot(sandbox.home);
      const installBefore = snapshot(sandbox.install);

      const run = await runInstaller(emitted.stdout, env, sandbox.install);

      expect(run.code, testCase.name).toBe(1);
      expect(run.stderr, testCase.name).toMatch(/Docker|Compose 2\.24/);
      expect(snapshot(sandbox.home), testCase.name).toEqual(homeBefore);
      expect(snapshot(sandbox.install), testCase.name).toEqual(installBefore);
      expect(
        readLog(sandbox).some((line) => line.startsWith('run ')),
        testCase.name,
      ).toBe(false);
    } finally {
      disposeSandbox(sandbox);
    }
  }
});

it('extra: the root refusal exits 1 before any write (stub id prints 0)', async () => {
  const sandbox = createSandbox();
  try {
    const bin = makeBin(sandbox, { docker: true, rootUser: true });
    const env = installerEnv(sandbox, bin, {
      STUB_IMAGE_LOCAL: '1',
      STUB_HEALTH: 'healthy',
      STUB_COMPOSE: '2.30.0',
    });
    const emitted = emitInstaller(env);
    expect(emitted.code).toBe(0);
    const homeBefore = snapshot(sandbox.home);
    const installBefore = snapshot(sandbox.install);

    const run = await runInstaller(emitted.stdout, env, sandbox.install);

    expect(run.code).toBe(1);
    expect(run.stderr).toContain('root');
    expect(snapshot(sandbox.home)).toEqual(homeBefore);
    expect(snapshot(sandbox.install)).toEqual(installBefore);
  } finally {
    disposeSandbox(sandbox);
  }
});

it('extra E5: an existing .env with no docker on PATH exits 1 at the Docker check, with the home and install folder unchanged', async () => {
  const sandbox = createSandbox();
  try {
    writeFileSync(join(sandbox.install, '.env'), 'SCRIBA_PORT=9999\n');
    const bin = makeBin(sandbox, { docker: false });
    const env = installerEnv(sandbox, bin, {
      STUB_IMAGE_LOCAL: '1',
      STUB_HEALTH: 'healthy',
      STUB_COMPOSE: '2.30.0',
    });
    const emitted = emitInstaller(env);
    expect(emitted.code).toBe(0);
    const homeBefore = snapshot(sandbox.home);
    const installBefore = snapshot(sandbox.install);

    const run = await runInstaller(emitted.stdout, env, sandbox.install);

    expect(run.code).toBe(1);
    expect(run.stderr).toContain('Docker');
    expect(snapshot(sandbox.home)).toEqual(homeBefore);
    expect(snapshot(sandbox.install)).toEqual(installBefore);
    expect(readLog(sandbox)).toEqual([]);
  } finally {
    disposeSandbox(sandbox);
  }
});
