import { beforeAll, describe, expect, it } from 'vitest';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const FIXTURE = path.join(
  __dirname,
  'fixtures',
  'nest-style',
  'tool-registry-consumer.cjs',
);
const DIST_DIR = path.join(__dirname, '..', 'dist');
const SLICE_DIR = path.join(DIST_DIR, 'tool-registry');

// The slices the built tool-registry subpath may load, and reach into, besides itself.
const ALLOWED_FOLDERS = ['platform', 'project-store', 'tool-registry'];

// The kinds a built export may have: no function is exported.
const DATA_KINDS = ['object', 'string', 'number', 'boolean'];

// The names C1 requires the subpath to export: every schema, constant and route of the slice.
const C1_NAMES = [
  'toolSpecSchema',
  'entityTypeSchema',
  'outputKindSchema',
  'portTypeSchema',
  'controlTypeSchema',
  'hintKeySchema',
  'toolHintsSchema',
  'toolNameSchema',
  'toolDescriptionSchema',
  'jsonSchemaObjectSchema',
  'entityKindSchema',
  'entityFolderSchema',
  'portInputSchema',
  'portOutputSchema',
  'portDescriptorSchema',
  'valueTypeSchema',
  'formFieldSchema',
  'formDescriptorSchema',
  'modelFunctionSchema',
  'toolViewsSchema',
  'lintSeveritySchema',
  'lintDiagnosticSchema',
  'lintResultSchema',
  'lintCountsSchema',
  'lintRequestSchema',
  'lintResponseSchema',
  'toolOriginSchema',
  'builtinOriginSchema',
  'toolErrorInfoSchema',
  'toolSummarySchema',
  'toolListQuerySchema',
  'toolListSchema',
  'toolDetailSchema',
  'functionListSchema',
  'entityTypeListSchema',
  'toolSaveRequestSchema',
  'toolEnabledRequestSchema',
  'toolArgumentsSchema',
  'resolvedEntitySchema',
  'entityToResolveSchema',
  'validateModeSchema',
  'toolValidateRequestSchema',
  'toolValidateResultSchema',
  'toolCallRequestSchema',
  'toolRenderRequestSchema',
  'toolRenderResultSchema',
  'toolOutputSchema',
  'toolCallResultSchema',
  'toolErrorCodeSchema',
  'toolArgsIssueSchema',
  'toolArgsInvalidDetailsSchema',
  'toolSpecLintFailedDetailsSchema',
  'catalogChangedDataSchema',
  'toolRegistryEventSchema',
  'toolsSectionSchema',
  'TOOL_SPEC_SCHEMA_VERSION',
  'ENTITY_TYPE_SCHEMA_VERSION',
  'TOOL_NAME_PATTERN',
  'ENTITY_KIND_PATTERN',
  'TOOL_DESCRIPTION_MAX_LENGTH',
  'OUTPUT_KINDS',
  'PORT_TYPES',
  'OUTPUT_PORT_KEY',
  'CONTROL_TYPES',
  'HINT_KEYS',
  'TOOL_ORIGINS',
  'BUILTIN_ORIGINS',
  'ENTITY_FOLDERS',
  'LINT_SEVERITIES',
  'VALIDATE_MODES',
  'VALUE_TYPES',
  'TOOL_ERROR_CODES',
  'TOOL_ERROR_CODE_VALUES',
  'TOOL_ERROR_STATUS',
  'TOOLS_SECTION_SCHEMA_VERSION',
  'TOOLS_ROUTE',
  'TOOL_ROUTE',
  'TOOL_BUILTIN_ROUTE',
  'TOOL_USER_ROUTE',
  'FUNCTIONS_ROUTE',
  'ENTITY_TYPES_ROUTE',
  'LINT_ROUTE',
  'TOOL_VALIDATE_ROUTE',
  'TOOL_ENABLED_ROUTE',
  'TOOL_SAVE_ROUTE',
  'TOOL_DELETE_ROUTE',
  'TOOL_RENDER_ROUTE',
  'TOOL_EXECUTE_ROUTE',
];

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

describe('tool-registry subpath exports', () => {
  let run: SpawnSyncReturns<string>;
  let report: ConsumerReport;

  beforeAll(() => {
    run = spawnSync(process.execPath, [FIXTURE], { encoding: 'utf8' });
    if (run.status === 0) {
      report = JSON.parse(run.stdout) as ConsumerReport;
    }
  });

  it('C1: the subpath resolves by package name from a CJS consumer, exports the full names list, loads no slice but tool-registry, platform and project-store, and its built files require only zod and reach only ../platform and ../project-store', () => {
    expect(run.status, run.stderr).toBe(0);
    expect(report.names).toEqual(expect.arrayContaining(C1_NAMES));

    expect(report.loaded).toContain('tool-registry');
    expect(
      report.loaded.filter((folder) => !ALLOWED_FOLDERS.includes(folder)),
    ).toEqual([]);

    const files = listFiles(SLICE_DIR);
    const specifiers = files.flatMap(specifiersIn);
    const external = specifiers.filter(
      (specifier) => !specifier.startsWith('.') && !specifier.startsWith('/'),
    );
    expect([...new Set(external)].sort()).toEqual(['zod']);

    const leaving = files.flatMap((file) =>
      specifiersIn(file)
        .filter((specifier) => specifier.startsWith('.'))
        .map((specifier) =>
          path.relative(SLICE_DIR, path.resolve(path.dirname(file), specifier)),
        )
        .filter((relative) => relative.startsWith('..'))
        .map(
          (relative) =>
            path
              .relative(DIST_DIR, path.resolve(SLICE_DIR, relative))
              .split(path.sep)[0],
        ),
    );
    expect([...new Set(leaving)].sort()).toEqual(['platform', 'project-store']);

    // The import is shown to work: a valid spec parses, and three bad ones do not.
    expect(report.results.validSpec.success).toBe(true);
    expect(report.results.badOutput.success).toBe(false);
    expect(report.results.badName.success).toBe(false);
    expect(report.results.missingPrompt.success).toBe(false);
  });

  it('E4: every export is data: no function, and every name is an object, string, number or boolean', () => {
    expect(run.status, run.stderr).toBe(0);
    const functions = Object.entries(report.types).filter(
      ([, kind]) => kind === 'function',
    );
    expect(functions).toEqual([]);

    const others = Object.entries(report.types).filter(
      ([, kind]) => !DATA_KINDS.includes(kind),
    );
    expect(others).toEqual([]);
  });

  it('E5: the port derivation rule is published in the built declaration file', () => {
    const declaration = fs.readFileSync(
      path.join(SLICE_DIR, 'views.d.ts'),
      'utf8',
    );
    for (const text of [
      'x-scriba-port: true',
      'property order',
      'x-scriba-type',
      '`array`',
      'in `required`',
      'key is `output`',
      'params',
      '<nodeId>.<key>',
      'element type',
      'Ajv checks',
    ]) {
      expect(declaration).toContain(text);
    }
  });
});
