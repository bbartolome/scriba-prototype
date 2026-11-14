import { beforeAll, describe, expect, it } from 'vitest';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const FIXTURE = path.join(
  __dirname,
  'fixtures',
  'nest-style',
  'project-store-consumer.cjs',
);
const SLICE_DIR = path.join(__dirname, '..', 'dist', 'project-store');

// The names the C1 criterion requires the subpath to export.
const C1_NAMES = [
  'projectYamlSchema',
  'projectSummarySchema',
  'projectListSchema',
  'newProjectRequestSchema',
  'importRequestSchema',
  'startFromSampleRequestSchema',
  'activateRequestSchema',
  'activeProjectSchema',
  'sampleListSchema',
  'projectPathSchema',
  'fileReferenceSchema',
  'contentHashSchema',
  'fileReadSchema',
  'entityIdSchema',
  'entityBaseSchema',
  'citationSchema',
  'pendingChangeSchema',
  'searchRequestSchema',
  'projectStoreEventSchema',
  'PROJECT_ERROR_CODE_VALUES',
  'PROJECT_ERROR_STATUS',
  'projectsSectionSchema',
  'ENTITY_ID_PATTERN',
  'CITATION_PATTERN',
  'CONTENT_HASH_PATTERN',
  'RESERVED_PATH_PREFIXES',
  'FILE_SIZE_CAP_BYTES',
  'PROJECT_FILES_ROUTE',
  'ACTIVE_PROJECT_ROUTE',
  'PROJECT_REBUILD_ROUTE',
];

interface ConsumerReport {
  names: string[];
  types: Record<string, string>;
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

describe('project-store subpath exports', () => {
  let run: SpawnSyncReturns<string>;
  let report: ConsumerReport;

  beforeAll(() => {
    run = spawnSync(process.execPath, [FIXTURE], { encoding: 'utf8' });
    if (run.status === 0) {
      report = JSON.parse(run.stdout) as ConsumerReport;
    }
  });

  it("C1: the subpath resolves by package name from a CJS consumer, exports the names of the plan's list, and its built files require only zod and import nothing from /providers", () => {
    expect(run.status, run.stderr).toBe(0);
    expect(report.names).toEqual(expect.arrayContaining(C1_NAMES));

    const files = listFiles(SLICE_DIR);
    const jsRequires = files
      .filter((file) => file.endsWith('.js'))
      .flatMap(specifiersIn)
      .filter(isExternal);
    expect([...new Set(jsRequires)].sort()).toEqual(['zod']);

    const everySpecifier = files.flatMap(specifiersIn);
    expect(everySpecifier.filter((s) => s.includes('providers'))).toEqual([]);
  });

  it('C4: a CJS consumer requires the subpath and gets projectYamlSchema and entityBaseSchema, which parse a sample project.yaml and an entity front matter', () => {
    expect(run.status, run.stderr).toBe(0);
    expect(report.types.projectYamlSchema).toBe('object');
    expect(report.types.entityBaseSchema).toBe('object');
    expect(report.results.validProjectYaml.success).toBe(true);
    expect(report.results.validEntityBase.success).toBe(true);
    expect(report.results.invalidProjectYaml.success).toBe(false);
  });
});
