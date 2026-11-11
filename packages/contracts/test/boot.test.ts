import { beforeAll, describe, expect, it } from 'vitest';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import * as path from 'node:path';

const SLUGS = [
  'platform',
  'setup-auth',
  'providers',
  'project-store',
  'tool-registry',
  'agent-loop',
  'graph-runner',
  'compile-export',
  'shell',
  'genre-packs',
];

const FIXTURE = path.join(__dirname, 'fixtures', 'nest-style', 'consumer.cjs');

interface ConsumerReport {
  loaded: Record<string, string[]>;
  failed: Record<string, string>;
  rootCode: string | null;
  deepCode: string | null;
}

describe('boot: CJS consumer resolves the subpaths', () => {
  let run: SpawnSyncReturns<string>;
  let report: ConsumerReport;

  beforeAll(() => {
    run = spawnSync(process.execPath, [FIXTURE], { encoding: 'utf8' });
    if (run.status === 0) {
      report = JSON.parse(run.stdout) as ConsumerReport;
    }
  });

  it('the consumer exits 0', () => {
    expect(run.status, run.stderr).toBe(0);
  });

  it('each of the ten subpaths requires without error', () => {
    expect(report.failed).toEqual({});
    expect(Object.keys(report.loaded).sort()).toEqual([...SLUGS].sort());
  });

  it('the platform subpath exposes the named shapes and constants', () => {
    expect(report.loaded.platform).toEqual(
      expect.arrayContaining([
        'platformEventSchema',
        'healthzSchema',
        'versionInfoSchema',
        'SCRIBA_ENV_DEFAULTS',
      ]),
    );
  });

  it('the package root fails to import (no barrel)', () => {
    expect(report.rootCode).toBe('ERR_PACKAGE_PATH_NOT_EXPORTED');
  });

  it('a deep path into dist fails to import', () => {
    expect(report.deepCode).toBe('ERR_PACKAGE_PATH_NOT_EXPORTED');
  });
});
