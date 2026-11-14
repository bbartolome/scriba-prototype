import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  createSandbox,
  disposeSandbox,
  emitInstaller,
  installerEnv,
  makeBin,
} from './installer-harness';

it('SETUP=true prints only a bash script to stdout, which passes bash -n', () => {
  const sandbox = createSandbox();
  try {
    const bin = makeBin(sandbox, { docker: true });
    const env = installerEnv(sandbox, bin, {
      STUB_NODE_VERSION: '0.1.0',
      STUB_NODE_REVISION: 'abc1234',
    });

    const emitted = emitInstaller(env);

    expect(emitted.code).toBe(0);
    expect(emitted.stdout.split('\n')[0]).toBe('#!/usr/bin/env bash');
    const script = join(sandbox.tmp, 'emitted.sh');
    writeFileSync(script, emitted.stdout);
    expect(spawnSync('bash', ['-n', script]).status).toBe(0);
    expect(emitted.stdout).toContain('bbartolome/scriba:0.1.0');
    expect(emitted.stdout).not.toContain('@@');
    expect(emitted.stderr).toBe('');
  } finally {
    disposeSandbox(sandbox);
  }
});

it('extra: a 0.0.0-dev build pins its git revision, and a build with neither a version nor a revision refuses', () => {
  const dev = createSandbox();
  const none = createSandbox();
  try {
    const devEnv = installerEnv(dev, makeBin(dev), {
      STUB_NODE_VERSION: '0.0.0-dev',
      STUB_NODE_REVISION: 'abc1234',
    });
    const devRun = emitInstaller(devEnv);
    expect(devRun.code).toBe(0);
    expect(devRun.stdout).toContain('bbartolome/scriba:sha-abc1234');
    expect(devRun.stdout).not.toContain('bbartolome/scriba:0.0.0-dev');

    const noneEnv = installerEnv(none, makeBin(none), {
      STUB_NODE_VERSION: '0.0.0-dev',
      STUB_NODE_REVISION: 'dev',
    });
    const noneRun = emitInstaller(noneEnv);
    expect(noneRun.code).toBe(1);
    expect(noneRun.stdout).toBe('');
    expect(noneRun.stderr).not.toBe('');
  } finally {
    disposeSandbox(dev);
    disposeSandbox(none);
  }
});
