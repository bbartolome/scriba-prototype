import {
  toolDetailSchema,
  TOOL_ENABLED_ROUTE,
  TOOL_ORIGINS,
  TOOL_ROUTE,
  TOOL_VALIDATE_ROUTE,
  toolListSchema,
  toolSummarySchema,
  toolValidateResultSchema,
  TOOLS_ROUTE,
} from '@bbartolome/scriba-contracts/tool-registry';
import { describe, expect, it } from 'vitest';
import {
  toolDetailCopy,
  toolEnabledPath,
  toolListCopy,
  toolPath,
  toolSummaryCopy,
  toolValidateCopy,
  toolValidatePath,
  TOOL_ENABLED_PATH_TEMPLATE,
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
