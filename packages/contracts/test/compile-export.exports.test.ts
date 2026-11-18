import { beforeAll, describe, expect, it } from 'vitest';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const FIXTURE = path.join(
  __dirname,
  'fixtures',
  'nest-style',
  'compile-export-consumer.cjs',
);
const SLICE_DIR = path.join(__dirname, '..', 'dist', 'compile-export');

// The names the C1 criterion requires the subpath to export: every shape, constant, route and
// error code of the plan's section 4, and the re-exports of section 4a.
const C1_NAMES = [
  // constants.ts
  'MANUSCRIPT_STATUSES',
  'manuscriptStatusSchema',
  'MANUSCRIPT_STATUS_DEFAULT',
  'MANUSCRIPT_PARTS',
  'manuscriptPartSchema',
  'MANUSCRIPT_PART_DEFAULT',
  'ORDER_SOURCES',
  'orderSourceSchema',
  'MANUSCRIPT_FOLDER',
  'MANUSCRIPT_PATH_PATTERN',
  'EXPORT_FORMATS',
  'exportFormatSchema',
  'TEMPLATE_FORMATS',
  'templateFormatSchema',
  'BIBLIOGRAPHY_MODES',
  'bibliographyModeSchema',
  'BIBLIOGRAPHY_DEFAULT',
  'BIBLIOGRAPHY_DEFAULT_BY_PACK',
  'EXPORT_LANG_DEFAULT',
  'PREFLIGHT_CHECK_IDS',
  'preflightCheckIdSchema',
  'FINDING_SEVERITIES',
  'findingSeveritySchema',
  'CHECK_STATUSES',
  'checkStatusSchema',
  'PLACEHOLDER_WORDS',
  'PLACEHOLDER_PATTERN',
  'SNAPSHOT_SCHEMA_VERSION',
  // order.ts
  'manuscriptPathSchema',
  'manuscriptRevisionSchema',
  'orderEntrySchema',
  'manuscriptEntrySchema',
  'manuscriptTotalsSchema',
  'manuscriptWarningSchema',
  'manuscriptViewSchema',
  'manuscriptReorderRequestSchema',
  'manuscriptStatusRequestSchema',
  'manuscriptPartRequestSchema',
  // settings.ts
  'exportSettingsSchema',
  'exportSettingsViewSchema',
  'exportSettingsWriteSchema',
  'copyDefaultRequestSchema',
  // preflight.ts
  'preflightRequestSchema',
  'preflightFindingSchema',
  'preflightCheckSchema',
  'preflightResultSchema',
  'preflightSummarySchema',
  // export.ts
  'exportRequestSchema',
  'exportResultSchema',
  // snapshots.ts
  'snapshotIdSchema',
  'snapshotWordsSchema',
  'snapshotSummarySchema',
  'snapshotListSchema',
  'snapshotCreateRequestSchema',
  'snapshotRestoreRequestSchema',
  'snapshotManifestSchema',
  // events.ts
  'manuscriptUpdatedDataSchema',
  'exportFinishedDataSchema',
  'snapshotCreatedDataSchema',
  'snapshotRestoredDataSchema',
  'compileExportEventSchema',
  // routes.ts
  'MANUSCRIPT_ROUTE',
  'MANUSCRIPT_REORDER_ROUTE',
  'MANUSCRIPT_STATUS_ROUTE',
  'MANUSCRIPT_PART_ROUTE',
  'PREFLIGHT_ROUTE',
  'EXPORT_ROUTE',
  'EXPORT_DOWNLOAD_ROUTE',
  'EXPORT_SETTINGS_ROUTE',
  'EXPORT_COPY_DEFAULT_ROUTE',
  'SNAPSHOTS_ROUTE',
  'SNAPSHOT_RESTORE_ROUTE',
  // errors.ts
  'COMPILE_ERROR_CODES',
  'COMPILE_ERROR_CODE_VALUES',
  'compileErrorCodeSchema',
  'COMPILE_ERROR_STATUS',
];

// Value kinds allowed for a constant or schema export. Zod schemas are objects.
const DATA_KINDS = ['object', 'string', 'number', 'boolean'];

interface ConsumerReport {
  names: string[];
  types: Record<string, string>;
  loaded: string[];
  results: Record<string, { success: boolean }>;
}

// Every .js and .d.ts file under a directory.
function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listFiles(full);
    }
    return entry.name.endsWith('.js') || entry.name.endsWith('.d.ts')
      ? [full]
      : [];
  });
}

// Module specifiers in one built file: require(), import() and `from` clauses.
const SPECIFIER_PATTERNS = [
  /require\(\s*(['"])([^'"]+)\1\s*\)/g,
  /import\(\s*(['"])([^'"]+)\1\s*\)/g,
  /\bfrom\s+(['"])([^'"]+)\1/g,
];

function specifiersIn(file: string): string[] {
  const source = fs.readFileSync(file, 'utf8');
  return SPECIFIER_PATTERNS.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[2]),
  );
}

function isExternal(specifier: string): boolean {
  return !specifier.startsWith('.') && !specifier.startsWith('/');
}

describe('compile-export subpath exports', () => {
  let run: SpawnSyncReturns<string>;
  let report: ConsumerReport;

  beforeAll(() => {
    run = spawnSync(process.execPath, [FIXTURE], { encoding: 'utf8' });
    if (run.status === 0) {
      report = JSON.parse(run.stdout) as ConsumerReport;
    }
  });

  it('C1: the subpath exports every named shape, constant, route and error code, no export is a function, and the built files import only zod, platform and project-store', () => {
    // (1) The consumer exits 0 and every name of the plan is an export.
    expect(run.status, run.stderr).toBe(0);
    expect(report.names).toEqual(expect.arrayContaining(C1_NAMES));

    // (2) No export is a function.
    const others = Object.entries(report.types).filter(
      ([, kind]) => !DATA_KINDS.includes(kind),
    );
    expect(others).toEqual([]);

    // (3) The consumer's require loaded only the compile-export folder and the two folders it may reach.
    expect(report.loaded).toContain('compile-export');
    for (const folder of report.loaded) {
      expect(['compile-export', 'platform', 'project-store']).toContain(folder);
    }

    // (4) The built files import only zod from packages, and reach other slices only through platform and project-store.
    const files = listFiles(SLICE_DIR);
    const specifiers = files.flatMap(specifiersIn);

    const externals = specifiers.filter(isExternal);
    expect([...new Set(externals)].sort()).toEqual(['zod']);

    const reachedFolders = specifiers
      .filter((specifier) => specifier.startsWith('../'))
      .map((specifier) => specifier.split('/')[1]);
    expect([...new Set(reachedFolders)].sort()).toEqual([
      'platform',
      'project-store',
    ]);
  });
});
