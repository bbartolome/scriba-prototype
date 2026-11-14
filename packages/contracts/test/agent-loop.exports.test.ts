import { beforeAll, describe, expect, it } from 'vitest';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const FIXTURE = path.join(
  __dirname,
  'fixtures',
  'nest-style',
  'agent-loop-consumer.cjs',
);
const SLICE_DIR = path.join(__dirname, '..', 'dist', 'agent-loop');
const SOURCE_DIR = path.join(__dirname, '..', 'src', 'agent-loop');

// The names the C1 criterion requires the subpath to export: every shape, constant, route,
// error code and enum of the unit, with the seven enum schemas.
const C1_NAMES = [
  'AGENT_DEFAULT_STEP_CAP',
  'AGENT_TOOL_FAMILIES',
  'agentToolFamilySchema',
  'AGENT_RUN_END_REASONS',
  'agentRunEndReasonSchema',
  'AGENT_RESERVED_TOOL_NAMES',
  'agentReservedToolNameSchema',
  'AGENT_RUN_STATUSES',
  'agentRunStatusSchema',
  'AGENT_CARD_STATUSES',
  'agentCardStatusSchema',
  'AGENT_TRANSCRIPT_KINDS',
  'agentTranscriptKindSchema',
  'GROUNDING_VERDICTS',
  'groundingVerdictSchema',
  'GROUNDING_RESULT_SCHEMA_VERSION',
  'AGENT_TRANSCRIPT_SCHEMA_VERSION',
  'GROUNDING_ARTEFACT_PATH_PREFIX',
  'GROUNDING_ARTEFACT_PATH_SUFFIX',
  'GROUNDING_ARTEFACT_PATH_TEMPLATE',
  'GROUNDING_ARTEFACT_PATH_PATTERN',
  'AGENT_TRANSCRIPT_PATH_TEMPLATE',
  'AGENT_TRANSCRIPT_PATH_PATTERN',
  'agentRunIdSchema',
  'agentConversationIdSchema',
  'toolCallIdSchema',
  'agentSeqSchema',
  'AGENT_RUNS_ROUTE',
  'AGENT_RUN_STOP_ROUTE',
  'AGENT_RUN_CURRENT_ROUTE',
  'AGENT_CONVERSATIONS_ROUTE',
  'AGENT_CONVERSATION_ROUTE',
  'AGENT_GROUNDING_ROUTE',
  'AGENT_SETTINGS_ROUTE',
  'AGENT_ERROR_CODES',
  'AGENT_ERROR_CODE_VALUES',
  'agentErrorCodeSchema',
  'AGENT_ERROR_STATUS',
  'groundingPassageSchema',
  'groundingClaimSchema',
  'groundingResultSchema',
  'groundingSummarySchema',
  'groundingRequestSchema',
  'draftProvenanceSchema',
  'diffPreviewSchema',
  'agentCardSchema',
  'agentEventBaseSchema',
  'runStartedDataSchema',
  'tokenDeltaDataSchema',
  'toolCallStartedDataSchema',
  'toolCallArgsDataSchema',
  'toolCallResultDataSchema',
  'toolCallErrorDataSchema',
  'groundingStartedDataSchema',
  'groundingResultDataSchema',
  'stepCapReachedDataSchema',
  'runEndedDataSchema',
  'agentLoopEventSchema',
  'agentStartRequestSchema',
  'agentStartResponseSchema',
  'agentStopRequestSchema',
  'agentRunStateSchema',
  'conversationTurnSchema',
  'conversationHistorySchema',
  'conversationSummarySchema',
  'conversationListSchema',
  'transcriptEntrySchema',
  'AGENT_SECTION_SCHEMA_VERSION',
  'AGENT_SETTINGS_DEFAULTS',
  'agentSettingsSchema',
  'agentSettingsUpdateSchema',
];

// Value kinds allowed for a constant or schema export. Zod schemas are objects.
const DATA_KINDS = ['object', 'string', 'number', 'boolean'];

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

// The type name a schema export carries: the schema name without Schema, first letter upper-cased.
function typeNameOf(schemaName: string): string {
  const stem = schemaName.slice(0, -'Schema'.length);
  return stem.charAt(0).toUpperCase() + stem.slice(1);
}

describe('agent-loop subpath exports', () => {
  let run: SpawnSyncReturns<string>;
  let report: ConsumerReport;

  beforeAll(() => {
    run = spawnSync(process.execPath, [FIXTURE], { encoding: 'utf8' });
    if (run.status === 0) {
      report = JSON.parse(run.stdout) as ConsumerReport;
    }
  });

  it('C1: the subpath exports every named shape, constant and route, every *Schema export has an inferred type, no export is a function, and the sources declare no function', () => {
    // (1) Every name of the unit.
    expect(run.status, run.stderr).toBe(0);
    expect(report.names).toEqual(expect.arrayContaining(C1_NAMES));

    // (2) No export is a function.
    const others = Object.entries(report.types).filter(
      ([, kind]) => !DATA_KINDS.includes(kind),
    );
    expect(others).toEqual([]);

    // (3) Every schema export declared in dist has an exported inferred type.
    const declarations = fs
      .readdirSync(SLICE_DIR)
      .filter((name) => name.endsWith('.d.ts'))
      .map((name) => fs.readFileSync(path.join(SLICE_DIR, name), 'utf8'))
      .join('\n');
    const schemaNames = [
      ...declarations.matchAll(/export declare const (\w+Schema):/g),
    ].map((match) => match[1]);
    const typeNames = new Set(
      [...declarations.matchAll(/export type (\w+) =/g)].map(
        (match) => match[1],
      ),
    );
    expect(schemaNames.length).toBeGreaterThan(0);
    const untyped = schemaNames.filter(
      (name) => !typeNames.has(typeNameOf(name)),
    );
    expect(untyped).toEqual([]);

    // (4) The sources declare no function and no arrow function, comments removed.
    const sourceText = listFiles(SOURCE_DIR)
      .filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'))
      .map((file) =>
        fs
          .readFileSync(file, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, ''),
      )
      .join('\n');
    expect(sourceText.match(/\bfunction\b/g) ?? []).toEqual([]);
    expect(sourceText.match(/=>/g) ?? []).toEqual([]);
  });

  it('C3: a CJS consumer requires the subpath by package name, parses a claims artefact and a run-ended event with the built schemas, and the built files import only zod, platform and project-store', () => {
    expect(run.status, run.stderr).toBe(0);
    expect(report.results.validArtefact.success).toBe(true);
    expect(report.results.runEnded.success).toBe(true);
    expect(report.results.groundingSummary.success).toBe(true);
    expect(report.results.invalidArtefact.success).toBe(false);

    const files = listFiles(SLICE_DIR);
    const specifiers = files.flatMap(specifiersIn);

    const externals = specifiers.filter(isExternal);
    expect([...new Set(externals)].sort()).toEqual(['zod']);

    const relativeOutside = specifiers
      .filter((specifier) => specifier.startsWith('..'))
      .filter(
        (specifier) =>
          !specifier.startsWith('../platform/') &&
          !specifier.startsWith('../project-store/'),
      );
    expect(relativeOutside).toEqual([]);
  });
});
