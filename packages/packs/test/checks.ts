import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { parse } from 'yaml';
import {
  toolSpecSchema,
  type LintDiagnostic,
} from '@bbartolome/scriba-contracts/tool-registry';

// The content checks of the packs (GNP-01). This file is not a test: Vitest runs *.test.ts files only.
// The pack-lint library is loaded from the built API (run `npm run build -w @bbartolome/scriba-api` first).

// One diagnostic of a packs root, with the file it is in, as `core/tools/x.yaml` under the packs root.
// The same shape as the library's PackFinding.
export interface PackFinding extends LintDiagnostic {
  file: string;
}

interface PackLintLibrary {
  lintPacks(packsRoot: string): PackFinding[];
}

const API_PACKAGE = resolve(__dirname, '../../../apps/api/package.json');
const LIBRARY = resolve(
  __dirname,
  '../../../apps/api/dist/modules/tool-registry/pack-lint.js',
);
const library = createRequire(API_PACKAGE)(LIBRARY) as PackLintLibrary;

// The packs that the registry reads, in the order of the checks.
const PACKS = ['core', 'nonfiction', 'fiction'];

// The five common inputs of every draft-producing narrative tool (module genre-packs, "Common inputs").
export const COMMON_INPUTS = [
  'coreIdea',
  'entityIds',
  'styleProfile',
  'length',
  'tone',
] as const;

// A tool description is under this many characters.
export const DESCRIPTION_LIMIT = 120;

// The verbs that a description may start with (GNP-01 open point 2, option (a)). A first word passes when it, or
// the word without a final `s`, is in this list.
export const VERBS: readonly string[] = [
  'check',
  'draft',
  'expand',
  'flag',
  'open',
  'rewrite',
  'sketch',
  'state',
  'turn',
  'write',
  'set',
  'paint',
  'move',
  'ask',
  'explain',
  'tell',
  'break',
  'face',
];

type ToolSpec = ReturnType<typeof toolSpecSchema.parse>;

interface LoadedTool {
  file: string;
  spec: ToolSpec;
}

// Lints the built-in packs of a packs root with the pack-lint library.
export function lintPacks(packsRoot: string): PackFinding[] {
  return library.lintPacks(packsRoot);
}

// Runs the content checks of a packs root. Each finding has the check's name as its rule:
// `entity-kind`, `spec`, `common-inputs`, `description` and `remix-shapes`.
export function contentChecks(packsRoot: string): PackFinding[] {
  const findings: PackFinding[] = [];

  // D7: an entity kind that no built-in entity type declares is an error here, not the library's warning.
  for (const diagnostic of lintPacks(packsRoot)) {
    if (
      diagnostic.rule === 'entity-kind' &&
      diagnostic.severity === 'warning'
    ) {
      findings.push({ ...diagnostic, severity: 'error' });
    }
  }

  const tools = loadTools(packsRoot, findings);
  const drafts = tools.filter((tool) => tool.spec.output === 'draft');
  checkCommonInputs(drafts, findings);
  for (const tool of tools) checkDescription(tool, findings);
  checkRemix(packsRoot, tools, drafts, findings);
  return findings;
}

function finding(file: string, rule: string, message: string): PackFinding {
  return { severity: 'error', rule, message, file, line: 1, column: 1 };
}

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

// The value at a path of object keys, or undefined when a key is missing.
function valueAt(value: unknown, keys: string[]): unknown {
  let current: unknown = value;
  for (const key of keys) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

// The names of the regular `.yaml` files directly in a folder, sorted. A folder that does not exist has none.
// Hidden files (a leading dot) are not tools.
function yamlFilesIn(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        !entry.name.startsWith('.') &&
        entry.name.endsWith('.yaml'),
    )
    .map((entry) => entry.name)
    .sort();
}

// Parses and validates every tool file. A file that is not YAML or fails toolSpecSchema is a `spec` finding.
function loadTools(packsRoot: string, findings: PackFinding[]): LoadedTool[] {
  const tools: LoadedTool[] = [];
  for (const pack of PACKS) {
    const dir = join(packsRoot, pack, 'tools');
    for (const name of yamlFilesIn(dir)) {
      const file = `${pack}/tools/${name}`;
      let value: unknown;
      try {
        value = parse(readFileSync(join(dir, name), 'utf8'));
      } catch (error) {
        findings.push(
          finding(file, 'spec', `not valid YAML: ${reason(error)}`),
        );
        continue;
      }
      const result = toolSpecSchema.safeParse(value);
      if (!result.success) {
        const problems = result.error.issues.map(
          (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
        );
        findings.push(finding(file, 'spec', problems.join('; ')));
        continue;
      }
      tools.push({ file, spec: result.data });
    }
  }
  return tools;
}

// D8: each common input of every draft tool equals the first draft tool's, in its schema, hints and required flag.
function commonInput(
  spec: ToolSpec,
  key: string,
): { property: unknown; required: boolean } | undefined {
  const properties = isRecord(spec.inputs.properties)
    ? spec.inputs.properties
    : {};
  if (!(key in properties)) return undefined;
  return {
    property: properties[key],
    required: stringList(spec.inputs.required).includes(key),
  };
}

function checkCommonInputs(
  drafts: LoadedTool[],
  findings: PackFinding[],
): void {
  const first = drafts[0];
  if (first === undefined) return;
  for (const tool of drafts) {
    for (const key of COMMON_INPUTS) {
      const actual = commonInput(tool.spec, key);
      const expected = commonInput(first.spec, key);
      if (actual === undefined) {
        findings.push(
          finding(
            tool.file,
            'common-inputs',
            `the draft tool has no common input "${key}"`,
          ),
        );
      } else if (!isDeepStrictEqual(actual, expected)) {
        findings.push(
          finding(
            tool.file,
            'common-inputs',
            `the common input "${key}" differs from ${first.file}`,
          ),
        );
      }
    }
  }
}

// D9: a description is under DESCRIPTION_LIMIT characters and starts with a verb from VERBS.
function firstWord(description: string): string {
  const word = description.trim().split(/\s+/)[0] ?? '';
  return word.toLowerCase().replace(/[^a-z]/g, '');
}

function isVerb(word: string): boolean {
  return (
    VERBS.includes(word) ||
    (word.endsWith('s') && VERBS.includes(word.slice(0, -1)))
  );
}

function checkDescription(tool: LoadedTool, findings: PackFinding[]): void {
  const { description } = tool.spec;
  if (description.length >= DESCRIPTION_LIMIT) {
    findings.push(
      finding(
        tool.file,
        'description',
        `the description is ${description.length} characters; it must be under ${DESCRIPTION_LIMIT}`,
      ),
    );
  }
  const word = firstWord(description);
  if (!isVerb(word)) {
    findings.push(
      finding(
        tool.file,
        'description',
        `the first word "${word}" is not a verb in the list`,
      ),
    );
  }
}

// D10: when core/tools/remix.yaml exists, its targetShape enum, sorted, equals the sorted names of the draft tools
// except remix. Without the file the check is inactive.
function checkRemix(
  packsRoot: string,
  tools: LoadedTool[],
  drafts: LoadedTool[],
  findings: PackFinding[],
): void {
  const file = 'core/tools/remix.yaml';
  if (!existsSync(join(packsRoot, file))) return;
  const remix = tools.find((tool) => tool.file === file);
  // A remix file that fails toolSpecSchema is already a `spec` finding.
  if (remix === undefined) return;
  const actual = stringList(
    valueAt(remix.spec.inputs, ['properties', 'targetShape', 'enum']),
  ).sort();
  const expected = drafts
    .map((tool) => tool.spec.name)
    .filter((name) => name !== 'remix')
    .sort();
  if (!isDeepStrictEqual(actual, expected)) {
    findings.push(
      finding(
        file,
        'remix-shapes',
        `the targetShape enum [${actual.join(', ')}] differs from the draft tools [${expected.join(', ')}]`,
      ),
    );
  }
}
