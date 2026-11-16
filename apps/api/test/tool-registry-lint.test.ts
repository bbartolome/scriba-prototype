import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  TOOL_ROUTE,
  TOOLS_ROUTE,
  toolDetailSchema,
  toolListSchema,
  type LintDiagnostic,
  type LintSeverity,
  type ToolSummary,
} from '@bbartolome/scriba-contracts/tool-registry';
import { BootError } from '../src/modules/platform/platform.module';
import {
  countsOf,
  lintEntityTypeSource,
  lintToolSource,
} from '../src/modules/tool-registry/lint';
import { lintPacks } from '../src/modules/tool-registry/pack-lint';
import { readBuiltinTools } from '../src/modules/tool-registry/packs';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import { LOOPBACK_HOST } from './invariant-sweep';
import { makeLibrary } from './settings.kit';

// The lint tests: the library entry points on the lint fixtures (C1, C3, C4), and the runtime gates through the
// composed routes on the fixture packs (X1 to X3), with the library contract (X4). Unit-level fixtures live under
// fixtures/lint and the packs under fixtures/packs; no test reads the real packs.

const LINT = join(__dirname, 'fixtures', 'lint');
const FIXTURE_PACKS = join(__dirname, 'fixtures', 'packs');
const BROKEN_PACK = join(LINT, 'broken-pack');
// The kinds that the entity_kind fixture checks against: the built-in kind sample-kind, and no other.
const SAMPLE_KINDS: ReadonlySet<string> = new Set(['sample-kind']);

function fixture(...parts: string[]): string {
  return readFileSync(join(LINT, ...parts), 'utf8');
}

// One expected diagnostic of a fixture, at the position of the position rule (D18).
interface Row {
  name: string;
  rule: string;
  severity: LintSeverity;
  line: number;
  column: number;
  lint: () => LintDiagnostic[];
}

function toolRow(
  stem: string,
  rule: string,
  severity: LintSeverity,
  line: number,
  column: number,
): Row {
  return {
    name: `tools/${stem}.yaml`,
    rule,
    severity,
    line,
    column,
    lint: () =>
      lintToolSource(fixture('tools', `${stem}.yaml`), {
        name: stem,
        entityKinds: SAMPLE_KINDS,
      }).lint,
  };
}

function entityRow(
  file: string,
  stem: string,
  rule: string,
  line: number,
  column: number,
): Row {
  return {
    name: `entity-types/${file}`,
    rule,
    severity: 'error',
    line,
    column,
    lint: () => lintEntityTypeSource(fixture('entity-types', file), { stem }),
  };
}

// C1: each rule has a fixture that triggers it with the right severity, line and column.
const ROWS: Row[] = [
  toolRow('yaml_parse', 'yaml-parse', 'error', 13, 1),
  toolRow('envelope', 'envelope', 'error', 4, 1),
  toolRow('schema_version', 'schema-version', 'error', 1, 16),
  toolRow('name_pattern', 'name-pattern', 'error', 2, 7),
  toolRow('file_name', 'file-name', 'error', 2, 7),
  toolRow('description', 'description', 'error', 3, 14),
  toolRow('output', 'output', 'error', 13, 9),
  toolRow('inputs_subset', 'inputs-subset', 'error', 12, 7),
  toolRow('inputs_compile', 'inputs-compile', 'error', 5, 3),
  toolRow('additional_properties', 'additional-properties', 'warning', 6, 25),
  toolRow('hint_unknown', 'hint-unknown', 'error', 10, 7),
  toolRow('hint_extension', 'hint-extension', 'warning', 10, 7),
  toolRow('hint_consistency', 'hint-consistency', 'error', 10, 7),
  toolRow('control_fit', 'control-fit', 'error', 12, 25),
  toolRow('entity_kind', 'entity-kind', 'warning', 12, 31),
  toolRow('reserved_output', 'reserved-output', 'error', 12, 5),
  toolRow('property_name', 'property-name', 'error', 12, 5),
  toolRow('template_syntax', 'template-syntax', 'error', 17, 3),
  toolRow('template_variable', 'template-variable', 'error', 16, 29),
  toolRow('template_entity', 'template-entity', 'error', 16, 15),
  toolRow('template_unused', 'template-unused', 'warning', 15, 21),
  entityRow('nested-object.yaml', 'nested-object', 'entity-field', 9, 5),
  entityRow('entity-hint.yaml', 'entity-hint', 'entity-hint', 11, 7),
  entityRow('file-name.yaml', 'other-kind', 'file-name', 2, 7),
  {
    name: 'broken-pack/nonfiction/tools/dup_tool.yaml',
    rule: 'duplicate-name',
    severity: 'error',
    line: 2,
    column: 1,
    lint: () =>
      lintPacks(BROKEN_PACK).filter(
        (finding) => finding.file === 'nonfiction/tools/dup_tool.yaml',
      ),
  },
];

describe('C1: each rule has a fixture that triggers it at the right severity, line and column', () => {
  it.each(ROWS)('$name triggers $rule', (row) => {
    expect(row.lint()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule: row.rule,
          severity: row.severity,
          line: row.line,
          column: row.column,
        }),
      ]),
    );
  });
});

// C3: duplicate names across built-in packs fail. The runtime keeps its refusal (TRG-06 C2).
it('C3: a tool name that two built-in packs define is a duplicate-name error at the later file, and the runtime still refuses it', () => {
  const duplicates = lintPacks(BROKEN_PACK).filter(
    (finding) => finding.rule === 'duplicate-name',
  );
  expect(duplicates).toEqual([
    expect.objectContaining({
      file: 'nonfiction/tools/dup_tool.yaml',
      severity: 'error',
      line: 2,
      column: 1,
    }),
  ]);
  expect(() => readBuiltinTools(BROKEN_PACK, SAMPLE_KINDS)).toThrow(BootError);
  expect(() => readBuiltinTools(BROKEN_PACK, SAMPLE_KINDS)).toThrow(
    /core and nonfiction/,
  );
});

// C4: an entity-type schema with a nested object field fails lint.
it('C4: an entity-type schema with a nested object field is an entity-field error at the nested property', () => {
  const lint = lintEntityTypeSource(
    fixture('entity-types', 'nested-object.yaml'),
    {
      stem: 'nested-object',
    },
  );
  expect(lint).toEqual([
    expect.objectContaining({
      rule: 'entity-field',
      severity: 'error',
      line: 9,
      column: 5,
    }),
  ]);
});

// X4: the library contract. The file-name rule runs only with a name; views exist only without an error; the lint
// is sorted by line and column.
describe('X4: the library contract', () => {
  it('skips file-name without a name, gives views without an error, and sorts the lint', () => {
    const mismatched = lintToolSource(fixture('tools', 'file_name.yaml'));
    expect(mismatched.lint.map((diagnostic) => diagnostic.rule)).not.toContain(
      'file-name',
    );
    expect(mismatched.views).not.toBeNull();

    const failing = lintToolSource(fixture('tools', 'control_fit.yaml'));
    expect(failing.views).toBeNull();
    expect(failing.lint).toHaveLength(1);

    const coldOpen = lintToolSource(
      readFileSync(
        join(FIXTURE_PACKS, 'core', 'tools', 'cold_open.yaml'),
        'utf8',
      ),
      { name: 'cold_open', entityKinds: new Set(['claim']) },
    );
    expect(countsOf(coldOpen.lint)).toEqual({ errors: 0, warnings: 3 });
    const positions = coldOpen.lint.map((diagnostic) => [
      diagnostic.line,
      diagnostic.column,
    ]);
    expect(positions).toEqual(
      [...positions].sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    );
  });
});

// The runtime gates, through the composed routes on the fixture packs.
function json(reply: Reply): unknown {
  return JSON.parse(reply.body);
}

// A valid tool with an invalid control: only the lint gate refuses it, since the structural checks accept slider.
const SLIDER_TEXT = [
  'schemaVersion: 1',
  'name: slider_text',
  'description: A slider on a string.',
  'inputs:',
  '  type: object',
  '  properties:',
  '    topic:',
  '      type: string',
  '      title: Topic',
  '      x-scriba-type: text',
  '      x-scriba-port: true',
  '      x-scriba-control: slider',
  '  required: [topic]',
  'output: draft',
  'enabled: true',
  'prompt: |',
  '  Write about {{topic}}.',
  '',
].join('\n');

// X1: a file with a lint error is invalid at the runtime gate, with its spec kept (D10).
it('X1: a user tool with a lint error is listed invalid, keeps its output and switch, and its detail names the control-fit diagnostic', async () => {
  const library = makeLibrary();
  const userTools = join(library, '.scriba', 'packs', 'user', 'tools');
  mkdirSync(userTools, { recursive: true });
  writeFileSync(join(userTools, 'slider_text.yaml'), SLIDER_TEXT);
  let app: TestApp | undefined;
  try {
    app = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PACKS_DIR: FIXTURE_PACKS },
    });
    const cookie = await sessionCookie(app, library);
    const listed = await send(app.baseUrl, {
      host: LOOPBACK_HOST,
      cookie,
      path: TOOLS_ROUTE,
    });
    expect(listed.status).toBe(200);
    const rows: ToolSummary[] = toolListSchema.parse(json(listed)).tools;
    const row = rows.filter((tool) => tool.name === 'slider_text');
    expect(row).toEqual([
      expect.objectContaining({
        valid: false,
        output: 'draft',
        enabled: true,
        lintCounts: { errors: 1, warnings: 0 },
        error: expect.objectContaining({ code: 'TOOL_INVALID' }),
      }),
    ]);

    const detail = await send(app.baseUrl, {
      host: LOOPBACK_HOST,
      cookie,
      path: TOOL_ROUTE.replace(':name', 'slider_text'),
    });
    expect(detail.status).toBe(200);
    const body = toolDetailSchema.parse(json(detail));
    expect(body.lint).toEqual([
      expect.objectContaining({
        rule: 'control-fit',
        severity: 'error',
        line: 12,
        column: 25,
      }),
    ]);
  } finally {
    await app?.close();
    rmSync(library, { recursive: true, force: true });
  }
});

// X2: a warning does not invalidate. The built-in cold_open has three warnings and stays valid (D21).
it('X2: a built-in tool with warnings stays valid, and its detail holds the three warnings', async () => {
  const library = makeLibrary();
  let app: TestApp | undefined;
  try {
    app = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PACKS_DIR: FIXTURE_PACKS },
    });
    const cookie = await sessionCookie(app, library);
    const listed = await send(app.baseUrl, {
      host: LOOPBACK_HOST,
      cookie,
      path: TOOLS_ROUTE,
    });
    const rows: ToolSummary[] = toolListSchema.parse(json(listed)).tools;
    expect(rows.filter((tool) => tool.name === 'cold_open')).toEqual([
      expect.objectContaining({
        valid: true,
        lintCounts: { errors: 0, warnings: 3 },
      }),
    ]);

    const detail = await send(app.baseUrl, {
      host: LOOPBACK_HOST,
      cookie,
      path: TOOL_ROUTE.replace(':name', 'cold_open'),
    });
    const body = toolDetailSchema.parse(json(detail));
    expect(
      body.lint.map((diagnostic) => [diagnostic.severity, diagnostic.rule]),
    ).toEqual([
      ['warning', 'entity-kind'],
      ['warning', 'entity-kind'],
      ['warning', 'template-unused'],
    ]);
  } finally {
    await app?.close();
    rmSync(library, { recursive: true, force: true });
  }
});

// X3: an entity-type file with a lint error stops boot, and only the lint gate refuses this file (D12).
it('X3: an entity-type file that the structural checks accept but lint refuses stops boot, naming the file and the rule', async () => {
  const packs = mkdtempSync(join(tmpdir(), 'scriba-lint-packs-'));
  const library = makeLibrary();
  try {
    mkdirSync(join(packs, 'nonfiction', 'entity-types'), { recursive: true });
    writeFileSync(
      join(packs, 'nonfiction', 'entity-types', 'fixed-kind.yaml'),
      [
        'schemaVersion: 1',
        'kind: fixed-kind',
        'title: Fixed',
        'description: A kind with a constant field.',
        'folder: entities',
        'fields:',
        '  type: object',
        '  properties:',
        '    label:',
        '      type: string',
        '      const: fixed',
        '',
      ].join('\n'),
    );
    await expect(
      createTestApp({ libraryDir: library, env: { SCRIBA_PACKS_DIR: packs } }),
    ).rejects.toThrow(
      /nonfiction\/entity-types\/fixed-kind\.yaml.*line 11.*entity-field/,
    );
  } finally {
    rmSync(packs, { recursive: true, force: true });
    rmSync(library, { recursive: true, force: true });
  }
});
