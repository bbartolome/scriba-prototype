import { beforeAll, describe, expect, it } from 'vitest';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import * as path from 'node:path';

const FIXTURE = path.join(
  __dirname,
  'fixtures',
  'nest-style',
  'providers-consumer.cjs',
);

// Every shape, constant, route and example that the subpath must export.
const REQUIRED_EXPORTS = [
  'providerConfigSchema',
  'openaiCompatibleSchema',
  'openaiCompatibleInputSchema',
  'openaiCompatibleReadSchema',
  'providerConfigInputSchema',
  'providerReadSchema',
  'providerListSchema',
  'providerCreateSchema',
  'providerUpdateSchema',
  'PROVIDER_DEFAULTS',
  'presetSchema',
  'PROVIDER_PRESETS',
  'PROVIDER_PRESET_IDS',
  'presetListSchema',
  'modelChoiceSchema',
  'appDefaultSchema',
  'EFFECTIVE_MODEL_SOURCES',
  'effectiveModelSourceSchema',
  'effectiveModelSchema',
  'effectiveModelQuerySchema',
  'modelListSchema',
  'CONNECTION_TEST_STAGES',
  'connectionTestStageSchema',
  'connectionTestErrorSchema',
  'connectionTestRequestSchema',
  'connectionTestResultSchema',
  'keySetRequestSchema',
  'keyClearRequestSchema',
  'PROVIDERS_SECTION_SCHEMA_VERSION',
  'providersSectionSchema',
  'PROVIDER_ERROR_CODES',
  'PROVIDER_ERROR_CODE_VALUES',
  'providerErrorCodeSchema',
  'PROVIDER_ERROR_STATUS',
  'PROVIDERS_ROUTE',
  'PRESETS_ROUTE',
  'APP_DEFAULT_ROUTE',
  'PROVIDER_UPDATE_ROUTE',
  'PROVIDER_DELETE_ROUTE',
  'MODELS_ROUTE',
  'KEY_SET_ROUTE',
  'KEY_CLEAR_ROUTE',
  'CONNECTION_TEST_ROUTE',
  'EFFECTIVE_MODEL_ROUTE',
  'PROJECT_MODEL_ROUTE',
  'PROJECT_MODEL_CLEAR_ROUTE',
  'projectModelResponseSchema',
  'PROVIDERS_EXAMPLES',
];

// Value kinds allowed for a constant or schema export. Zod schemas are objects.
const DATA_KINDS = ['object', 'string', 'number', 'boolean'];

interface ConsumerReport {
  names: string[];
  types: Record<string, string>;
}

describe('providers subpath exports', () => {
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

  it('exports every shape, constant, route and example', () => {
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
