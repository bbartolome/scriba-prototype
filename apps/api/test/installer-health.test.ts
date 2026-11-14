import { expect, it } from 'vitest';
import {
  createSandbox,
  disposeSandbox,
  emitInstaller,
  installerEnv,
  makeBin,
  readLog,
  runInstaller,
} from './installer-harness';

// The same first-install setup as the first-install test, with the health state under test.
async function installWithHealth(health: string) {
  const sandbox = createSandbox();
  const bin = makeBin(sandbox, { docker: true });
  const env = installerEnv(sandbox, bin, {
    STUB_IMAGE_LOCAL: '0',
    STUB_HEALTH: health,
    STUB_COMPOSE: '2.30.0',
    STUB_SETUP_URL: '0',
  });
  const emitted = emitInstaller(env);
  expect(emitted.code).toBe(0);
  const run = await runInstaller(emitted.stdout, env, sandbox.install);
  return { sandbox, run };
}

it('a health timeout exits 1 and names docker compose logs; an unhealthy container fails at once', async () => {
  const timeout = await installWithHealth('starting');
  const unhealthy = await installWithHealth('unhealthy');
  try {
    // (a) starting until the limit: 60 polls, a sleep after each, then a failure.
    expect(timeout.run.code).toBe(1);
    expect(timeout.run.stderr).toContain('docker compose logs scriba');
    const sleeps = readLog(timeout.sandbox).filter((line) =>
      line.startsWith('sleep '),
    );
    expect(sleeps).toHaveLength(60);

    // (b) unhealthy: fail at once, with no sleep.
    expect(unhealthy.run.code).toBe(1);
    expect(unhealthy.run.stderr).toContain('docker compose logs scriba');
    const unhealthySleeps = readLog(unhealthy.sandbox).filter((line) =>
      line.startsWith('sleep '),
    );
    expect(unhealthySleeps.length).toBeLessThanOrEqual(1);
  } finally {
    disposeSandbox(timeout.sandbox);
    disposeSandbox(unhealthy.sandbox);
  }
});
