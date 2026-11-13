import { beforeAll, describe, expect, it } from 'vitest';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import * as path from 'node:path';

const FIXTURE = path.join(
  __dirname,
  'fixtures',
  'nest-style',
  'setup-auth-consumer.cjs',
);

// Every shape, constant and example that the subpath must export.
const REQUIRED_EXPORTS = [
  'identitySchema',
  'backendStateSchema',
  'BACKEND_STATES',
  'tailscaleStatusSchema',
  'SETUP_STEP_KEYS',
  'SETUP_STEP_STATES',
  'setupStepKeySchema',
  'setupStepStateSchema',
  'setupStepsSchema',
  'composeVersionStatusSchema',
  'setupStatusSchema',
  'stepUpdateSchema',
  'preferencesSchema',
  'allowlistSchema',
  'allowlistUpdateSchema',
  'setupAuthSectionSchema',
  'SETUP_AUTH_SECTION_SCHEMA_VERSION',
  'SETUP_STATUS_ROUTE',
  'SETUP_CONTINUE_ROUTE',
  'SETUP_STEP_ROUTE',
  'HANDSHAKE_ROUTE',
  'IDENTITY_ROUTE',
  'SIGN_OUT_ROUTE',
  'TAILSCALE_STATUS_ROUTE',
  'ALLOWLIST_ROUTE',
  'PREFERENCES_ROUTE',
  'handshakeQuerySchema',
  'HANDSHAKE_REDIRECT_STATUS',
  'HANDSHAKE_REFERRER_POLICY',
  'SETUP_PAGE_PATH',
  'LANDING_PATH',
  'SETUP_AUTH_ERROR_CODES',
  'SETUP_AUTH_ERROR_STATUS',
  'SETUP_AUTH_EXAMPLES',
];

// Value kinds allowed for a constant or schema export. Zod schemas are objects.
const DATA_KINDS = ['object', 'string', 'number', 'boolean'];

interface ConsumerReport {
  names: string[];
  types: Record<string, string>;
}

describe('setup-auth subpath exports', () => {
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

  it('exports every shape, constant and example', () => {
    expect(report.names).toEqual(expect.arrayContaining(REQUIRED_EXPORTS));
  });

  it('exports no function', () => {
    const functions = Object.entries(report.types).filter(
      ([, kind]) => kind === 'function',
    );
    expect(functions).toEqual([]);
  });

  it('every export is an object, string, number or boolean', () => {
    const others = Object.entries(report.types).filter(
      ([, kind]) => !DATA_KINDS.includes(kind),
    );
    expect(others).toEqual([]);
  });
});
