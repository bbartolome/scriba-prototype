import { beforeAll, describe, expect, it } from 'vitest';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const FIXTURE = path.join(
  __dirname,
  'fixtures',
  'nest-style',
  'graph-runner-consumer.cjs',
);
const DIST_DIR = path.join(__dirname, '..', 'dist');
const SLICE_DIR = path.join(DIST_DIR, 'graph-runner');

// The slices the built graph-runner subpath may load, and reach into, besides itself.
const ALLOWED_FOLDERS = [
  'graph-runner',
  'platform',
  'project-store',
  'tool-registry',
];

// The kinds a built export may have: no function is exported.
const DATA_KINDS = ['object', 'string', 'number', 'boolean'];

// The names C1 requires the subpath to export: every name of section 2b, the examples included.
const C1_NAMES = [
  'GRAPH_SCHEMA_VERSION',
  'GRAPH_VIEWS',
  'STORY_NODE_KINDS',
  'RECIPE_NODE_KINDS',
  'GRAPH_ID_PATTERN',
  'NODE_ID_PATTERN',
  'INPUT_NODE_OUTPUT_KEY',
  'OUTPUT_NODE_INPUT_KEY',
  'TOOL_NODE_OUTPUT_KEY',
  'RELATION_VOCABULARY',
  'GRAPH_FOLDER',
  'RUN_LOG_FOLDER',
  'RUN_STATUSES',
  'RUN_REASONS',
  'NODE_RUN_STATUSES',
  'GRAPH_ISSUE_SEVERITIES',
  'GRAPH_ERROR_ISSUE_CODES',
  'GRAPH_WARNING_ISSUE_CODES',
  'GRAPH_ISSUE_CODES',
  'GRAPH_ERROR_CODES',
  'GRAPH_ERROR_CODE_VALUES',
  'GRAPH_ERROR_STATUS',
  'graphErrorCodeSchema',
  'graphIdSchema',
  'nodeIdSchema',
  'portIdSchema',
  'graphViewSchema',
  'positionSchema',
  'storyNodeSchema',
  'storyEdgeSchema',
  'recipeNodeSchema',
  'recipeWireSchema',
  'inputParamsSchema',
  'outputParamsSchema',
  'toolParamsSchema',
  'storyGraphShapeSchema',
  'recipeGraphShapeSchema',
  'graphFileShapeSchema',
  'storyGraphSchema',
  'recipeGraphSchema',
  'graphFileSchema',
  'graphIssueSeveritySchema',
  'graphIssueCodeSchema',
  'validationIssueSchema',
  'validationResultSchema',
  'graphSummarySchema',
  'graphListSchema',
  'graphDetailSchema',
  'graphCreateSchema',
  'graphRenameSchema',
  'graphIdResultSchema',
  'runStatusSchema',
  'runReasonSchema',
  'nodeRunStatusSchema',
  'inputValueSchema',
  'runTargetSchema',
  'runStartRequestSchema',
  'runStartResultSchema',
  'runStopRequestSchema',
  'runErrorSchema',
  'outputNodeResultSchema',
  'nodeResultSchema',
  'nodeRunStateSchema',
  'runStateSchema',
  'currentRunSchema',
  'nodeStatusDataSchema',
  'runEndedDataSchema',
  'graphRunnerEventSchema',
  'runLogInputSchema',
  'runLogEntrySchema',
  'GRAPHS_ROUTE',
  'GRAPH_ROUTE',
  'GRAPH_CREATE_ROUTE',
  'GRAPH_VALIDATE_ROUTE',
  'GRAPH_SAVE_ROUTE',
  'GRAPH_RENAME_ROUTE',
  'GRAPH_DELETE_ROUTE',
  'RUNS_ROUTE',
  'RUN_STOP_ROUTE',
  'RUN_CURRENT_ROUTE',
  'GRAPH_RUNNER_EXAMPLES',
];

interface ConsumerReport {
  names: string[];
  types: Record<string, string>;
  loaded: string[];
  examples: { story: boolean; recipe: boolean };
}

// Every built file of the slice: the .js and .d.ts files under dist/graph-runner.
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

function readDeclaration(name: string): string {
  return fs.readFileSync(path.join(SLICE_DIR, name), 'utf8');
}

describe('graph-runner subpath exports', () => {
  let run: SpawnSyncReturns<string>;
  let report: ConsumerReport;

  beforeAll(() => {
    run = spawnSync(process.execPath, [FIXTURE], { encoding: 'utf8' });
    if (run.status === 0) {
      report = JSON.parse(run.stdout) as ConsumerReport;
    }
  });

  it('C1: the subpath resolves from a CJS consumer and exports every name of section 2b, the examples included', () => {
    expect(run.status, run.stderr).toBe(0);
    expect(report.names).toEqual(expect.arrayContaining(C1_NAMES));
    expect(report.types.GRAPH_RUNNER_EXAMPLES).toBe('object');

    // Both example files pass the file schema when read through the subpath.
    expect(report.examples.story).toBe(true);
    expect(report.examples.recipe).toBe(true);
  });

  it('C1: the built slice loads only platform, project-store and tool-registry, and requires only zod outside them', () => {
    expect(run.status, run.stderr).toBe(0);
    expect(report.loaded).toContain('graph-runner');
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
    expect([...new Set(leaving)].sort()).toEqual([
      'platform',
      'project-store',
      'tool-registry',
    ]);
  });

  it('E12: every export is data: no function, and the port-id rule, the story-node path rule and the relation vocabulary are in the built declarations', () => {
    expect(run.status, run.stderr).toBe(0);
    const functions = Object.entries(report.types).filter(
      ([, kind]) => kind === 'function',
    );
    expect(functions).toEqual([]);

    const others = Object.entries(report.types).filter(
      ([, kind]) => !DATA_KINDS.includes(kind),
    );
    expect(others).toEqual([]);

    const graphDeclaration = readDeclaration('graph.d.ts');
    for (const text of [
      '<nodeId>.<key>',
      'first dot',
      'drafts/.versions/',
      'entities/',
      'label-only',
    ]) {
      expect(graphDeclaration).toContain(text);
    }

    const constantsDeclaration = readDeclaration('constants.d.ts');
    for (const text of [
      'from precedes to',
      'from causes to',
      'from contains to',
    ]) {
      expect(constantsDeclaration).toContain(text);
    }

    expect(readDeclaration('examples.d.ts')).toContain(
      'JSON.stringify(value, null, 2)',
    );
  });
});
