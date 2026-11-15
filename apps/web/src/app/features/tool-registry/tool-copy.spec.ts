import {
  toolDetailSchema,
  TOOL_ROUTE,
  TOOL_VALIDATE_ROUTE,
  toolValidateResultSchema,
} from '@bbartolome/scriba-contracts/tool-registry';
import { describe, expect, it } from 'vitest';
import {
  toolDetailCopy,
  toolPath,
  toolValidateCopy,
  toolValidatePath,
  TOOL_PATH_TEMPLATE,
  TOOL_VALIDATE_PATH_TEMPLATE,
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
});
