import {
  toolCallResultSchema,
  toolRenderResultSchema,
  LINT_ROUTE,
  lintResponseSchema,
  toolDetailSchema,
  TOOL_BUILTIN_ROUTE,
  TOOL_DELETE_ROUTE,
  TOOL_ENABLED_ROUTE,
  TOOL_EXECUTE_ROUTE,
  TOOL_NAME_PATTERN as CONTRACT_TOOL_NAME_PATTERN,
  TOOL_ORIGINS,
  TOOL_RENDER_ROUTE,
  TOOL_ROUTE,
  TOOL_SAVE_ROUTE,
  TOOL_USER_ROUTE,
  TOOL_VALIDATE_ROUTE,
  toolListSchema,
  toolSummarySchema,
  toolValidateResultSchema,
  TOOLS_ROUTE,
} from '@bbartolome/scriba-contracts/tool-registry';
import { describe, expect, it } from 'vitest';
import {
  toolCallResultCopy,
  toolRenderCopy,
  toolRenderPath,
  TOOL_RENDER_PATH_TEMPLATE,
  LINT_PATH,
  lintDetailsCopy,
  lintResponseCopy,
  toolBuiltinPath,
  toolDeletePath,
  toolDetailCopy,
  toolEnabledPath,
  toolExecutePath,
  toolListCopy,
  toolPath,
  toolSavePath,
  toolSourceCopy,
  toolSummaryCopy,
  toolUserPath,
  toolValidateCopy,
  toolValidatePath,
  TOOL_ENABLED_PATH_TEMPLATE,
  TOOL_EXECUTE_PATH_TEMPLATE,
  TOOL_NAME_PATTERN,
  TOOL_ORIGIN_ORDER,
  TOOL_PATH_TEMPLATE,
  TOOL_VALIDATE_PATH_TEMPLATE,
  TOOLS_PATH,
} from './tool-copy';

const VIEWS = {
  functionSchema: {
    type: 'function',
    function: {
      name: 'cold_open',
      description: 'Drafts the cold open of a chapter from its core idea.',
      parameters: { type: 'object', properties: {} },
    },
  },
  form: {
    fields: [
      {
        key: 'coreIdea',
        title: 'Core idea',
        description: '',
        control: 'textarea',
        required: true,
        default: null,
        list: false,
        port: true,
        valueType: 'string',
      },
    ],
  },
  ports: {
    inputs: [
      {
        key: 'coreIdea',
        type: 'text',
        list: false,
        required: true,
        title: 'Core idea',
      },
    ],
    output: { key: 'output', type: 'text', kind: 'draft' },
    params: [],
  },
};

const acceptedDetails: unknown[] = [
  {
    spec: null,
    source: 'schemaVersion: 1\nname: cold_open\n',
    origin: 'user',
    lint: [],
    views: VIEWS,
  },
  {
    spec: null,
    source: 'name: [',
    origin: 'user',
    lint: [
      {
        severity: 'error',
        rule: 'yaml-syntax',
        message: 'Unclosed sequence.',
        line: 1,
        column: 7,
      },
    ],
    views: null,
  },
];

const refusedDetails: unknown[] = [
  { spec: null, source: '', origin: 'user', lint: [] },
  {
    spec: null,
    source: '',
    origin: 'user',
    lint: [],
    views: { ports: VIEWS.ports },
  },
  { spec: null, source: '', origin: 'user', lint: null, views: null },
];

const acceptedValidateResults: unknown[] = [
  {
    arguments: { coreIdea: 'Seven days', person: 'ada', length: 800 },
    entityRefs: [],
  },
  {
    arguments: { coreIdea: 'Seven days', person: 'ada' },
    entityRefs: [{ field: 'person', id: 'ada', style: false }],
  },
];

const refusedValidateResults: unknown[] = [
  { arguments: {} },
  { arguments: 'none', entityRefs: [] },
  { arguments: {}, entityRefs: 'none' },
];

describe('tool-registry copies', () => {
  it('the route paths agree with the contract', () => {
    expect(TOOL_PATH_TEMPLATE).toBe(TOOL_ROUTE);
    expect(TOOL_VALIDATE_PATH_TEMPLATE).toBe(TOOL_VALIDATE_ROUTE);
    expect(toolPath('cold_open')).toBe(
      TOOL_ROUTE.replace(':name', 'cold_open'),
    );
    expect(toolValidatePath('cold_open')).toBe(
      TOOL_VALIDATE_ROUTE.replace(':name', 'cold_open'),
    );
    expect(toolValidatePath('a b/c')).toBe(
      '/api/tool-registry/tools/a%20b%2Fc/validate',
    );
  });

  it('the detail answer agrees with toolDetailSchema', () => {
    for (const sample of acceptedDetails) {
      expect(toolDetailSchema.safeParse(sample).success).toBe(true);
      expect(toolDetailCopy.safeParse(sample).success).toBe(true);
    }
    for (const sample of refusedDetails) {
      expect(toolDetailSchema.safeParse(sample).success).toBe(false);
      expect(toolDetailCopy.safeParse(sample).success).toBe(false);
    }
  });

  it('the validate answer agrees with toolValidateResultSchema', () => {
    for (const sample of acceptedValidateResults) {
      expect(toolValidateResultSchema.safeParse(sample).success).toBe(true);
      expect(toolValidateCopy.safeParse(sample).success).toBe(true);
    }
    for (const sample of refusedValidateResults) {
      expect(toolValidateResultSchema.safeParse(sample).success).toBe(false);
      expect(toolValidateCopy.safeParse(sample).success).toBe(false);
    }
  });

  // S1a: the list and enabled paths agree with the contract.
  it('S1a the list and enabled paths agree with the contract', () => {
    expect(TOOLS_PATH).toBe(TOOLS_ROUTE);
    expect(TOOL_ENABLED_PATH_TEMPLATE).toBe(TOOL_ENABLED_ROUTE);
    expect(toolEnabledPath('cold_open')).toBe(
      TOOL_ENABLED_ROUTE.replace(':name', 'cold_open'),
    );
    expect(toolEnabledPath('a b/c')).toBe(
      '/api/tool-registry/tools/a%20b%2Fc/enabled',
    );
  });

  // S1b: the origin order of the groups is the contract's origins.
  it('S1b TOOL_ORIGIN_ORDER equals TOOL_ORIGINS', () => {
    expect([...TOOL_ORIGIN_ORDER]).toEqual([...TOOL_ORIGINS]);
  });

  // S1c: the list answer agrees with toolListSchema.
  it('S1c the list answer agrees with toolListSchema', () => {
    expect(toolListSchema.safeParse({ tools: sampleRows }).success).toBe(true);
    expect(toolListCopy.safeParse({ tools: sampleRows }).success).toBe(true);
    for (const sample of [
      {},
      { tools: 'none' },
      { tools: [{ ...sampleRows[0], valid: undefined }] },
    ]) {
      expect(toolListCopy.safeParse(sample).success).toBe(false);
      expect(toolListSchema.safeParse(sample).success).toBe(false);
    }
  });

  // S1d: one summary agrees with toolSummarySchema.
  it('S1d one summary agrees with toolSummarySchema', () => {
    for (const row of sampleRows) {
      expect(toolSummarySchema.safeParse(row).success).toBe(true);
      expect(toolSummaryCopy.safeParse(row).success).toBe(true);
    }
    const foreign = { ...sampleRows[0], origin: 'other' };
    expect(toolSummarySchema.safeParse(foreign).success).toBe(false);
    expect(toolSummaryCopy.safeParse(foreign).success).toBe(false);
  });
});

// The four sample rows of the list tests: a valid core row, an invalid user copy with an error, a
// valid user copy with an overrides marker, and an invalid user row with output and lint errors.
const sampleRows: Record<string, unknown>[] = [
  {
    name: 'cold_open',
    description: 'Opens a scene',
    output: 'draft',
    enabled: true,
    origin: 'core',
    valid: true,
    lintCounts: { errors: 0, warnings: 0 },
  },
  {
    name: 'broken',
    description: '',
    output: null,
    enabled: false,
    origin: 'user',
    valid: false,
    lintCounts: { errors: 1, warnings: 0 },
    error: { code: 'TOOL_INVALID', message: 'The file cannot be parsed.' },
  },
  {
    name: 'house_note',
    description: 'A note',
    output: 'draft',
    enabled: true,
    origin: 'user',
    overrides: 'nonfiction',
    valid: true,
    lintCounts: { errors: 0, warnings: 0 },
  },
  {
    name: 'lint_fail',
    description: 'Fails lint',
    output: 'draft',
    enabled: false,
    origin: 'user',
    valid: false,
    lintCounts: { errors: 2, warnings: 0 },
  },
];

describe('tool-registry execute copies', () => {
  // S3a: the execute path and the call result agree with the contract.
  it('S3a toolExecutePath and toolCallResultCopy agree with the contract', () => {
    expect(TOOL_EXECUTE_PATH_TEMPLATE).toBe(TOOL_EXECUTE_ROUTE);
    expect(toolExecutePath('cold_open')).toBe(
      TOOL_EXECUTE_ROUTE.replace(':name', 'cold_open'),
    );
    const accepted = {
      output: { kind: 'draft', content: 'The cold open.' },
      sourcesUsed: ['ada'],
    };
    const refused = { output: { kind: 'draft', content: 'The cold open.' } };
    expect(toolCallResultSchema.safeParse(accepted).success).toBe(true);
    expect(toolCallResultCopy.safeParse(accepted).success).toBe(true);
    expect(toolCallResultSchema.safeParse(refused).success).toBe(false);
    expect(toolCallResultCopy.safeParse(refused).success).toBe(false);
  });
});

describe('tool-registry render copies', () => {
  // S4a: the render path and the render result agree with the contract.
  it('S4a toolRenderPath and toolRenderCopy agree with the contract', () => {
    expect(TOOL_RENDER_PATH_TEMPLATE).toBe(TOOL_RENDER_ROUTE);
    expect(toolRenderPath('cold open')).toBe(
      '/api/tool-registry/tools/cold%20open/render',
    );
    const accepted = { prompt: 'Core idea: Engines.' };
    const refused = { text: 'Core idea: Engines.' };
    expect(toolRenderResultSchema.safeParse(accepted).success).toBe(true);
    expect(toolRenderCopy.safeParse(accepted).success).toBe(true);
    expect(toolRenderResultSchema.safeParse(refused).success).toBe(false);
    expect(toolRenderCopy.safeParse(refused).success).toBe(false);
  });
});

describe('tool-registry copies of the editor routes', () => {
  it('S2a the paths equal the routes with :name in place', () => {
    expect(LINT_PATH).toBe(LINT_ROUTE);
    expect(toolBuiltinPath('cold_open')).toBe(
      TOOL_BUILTIN_ROUTE.replace(':name', 'cold_open'),
    );
    expect(toolUserPath('cold_open')).toBe(
      TOOL_USER_ROUTE.replace(':name', 'cold_open'),
    );
    expect(toolSavePath('cold_open')).toBe(
      TOOL_SAVE_ROUTE.replace(':name', 'cold_open'),
    );
    expect(toolDeletePath('cold_open')).toBe(
      TOOL_DELETE_ROUTE.replace(':name', 'cold_open'),
    );
  });

  it('S2b TOOL_NAME_PATTERN equals the contract pattern', () => {
    expect(TOOL_NAME_PATTERN.source).toBe(CONTRACT_TOOL_NAME_PATTERN.source);
    expect(TOOL_NAME_PATTERN.flags).toBe(CONTRACT_TOOL_NAME_PATTERN.flags);
  });

  it('S2c the lint and source copies accept the contract samples and refuse a diagnostic with no line', () => {
    const diagnostic = {
      severity: 'error',
      rule: 'file-name',
      message: 'the name "x" must match the file name "cold_open"',
      line: 3,
      column: 1,
    };
    const lint = { lint: [diagnostic], views: null };
    expect(lintResponseSchema.safeParse(lint).success).toBe(true);
    expect(lintResponseCopy.safeParse(lint).success).toBe(true);
    expect(
      toolSourceCopy.safeParse({
        source: 'schemaVersion: 1\nname: cold_open\n',
        origin: 'user',
        spec: null,
        views: VIEWS,
        lint: [],
      }).success,
    ).toBe(true);
    const noLine = { ...diagnostic, line: undefined };
    expect(
      lintResponseCopy.safeParse({ lint: [noLine], views: null }).success,
    ).toBe(false);
    expect(
      toolSourceCopy.safeParse({ source: 'x', lint: [noLine], views: null })
        .success,
    ).toBe(false);
    expect(lintDetailsCopy({ lint: [diagnostic] })).toEqual([diagnostic]);
    expect(lintDetailsCopy({})).toBeUndefined();
  });
});
