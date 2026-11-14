import { describe, expect, expectTypeOf, it } from 'vitest';
import type { EntityRef } from '../src/project-store/index.js';
import type {
  ControlType,
  EntityToResolve,
  EntityTypeSpec,
  FormDescriptor,
  FormField,
  FunctionList,
  HintKey,
  LintDiagnostic,
  LintResult,
  ModelFunction,
  OutputKind,
  PortDescriptor,
  PortInput,
  PortOutput,
  PortType,
  ResolvedEntity,
  ToolArgsInvalidDetails,
  ToolArgsIssue,
  ToolCallRequest,
  ToolCallResult,
  ToolDetail,
  ToolErrorCode,
  ToolHints,
  ToolList,
  ToolOutput,
  ToolRegistryEvent,
  ToolSpec,
  ToolSummary,
  ToolValidateRequest,
  ToolValidateResult,
  ToolViews,
  ValueType,
} from '../src/tool-registry/index.js';
import {
  CONTROL_TYPES,
  ENTITY_KIND_PATTERN,
  ENTITY_TYPE_SCHEMA_VERSION,
  HINT_KEYS,
  OUTPUT_KINDS,
  OUTPUT_PORT_KEY,
  PORT_TYPES,
  TOOL_ERROR_CODES,
  TOOL_EXECUTE_ROUTE,
  TOOL_NAME_PATTERN,
  TOOL_ROUTE,
  TOOL_SPEC_SCHEMA_VERSION,
  TOOL_VALIDATE_ROUTE,
  TOOLS_ROUTE,
  entityTypeSchema,
  toolSpecSchema,
} from '../src/tool-registry/index.js';

// The Model providers client's tool schema, copied from apps/api/src/modules/providers/client/types.ts
// (lines 11 to 19). The test cannot import the API, so the copy is a drift risk and this block is informative.
interface ClientToolSchemaCopy {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

describe('C4: Genre packs, Agent loop and Graph runner can import every type and value they consume (compile-only; tsc in npm run build is the check)', () => {
  describe('Genre packs', () => {
    it('imports the spec, the entity-type envelope and the closed sets they need', () => {
      expectTypeOf<keyof ToolSpec>().toEqualTypeOf<
        | 'schemaVersion'
        | 'name'
        | 'description'
        | 'inputs'
        | 'output'
        | 'enabled'
        | 'prompt'
      >();
      expectTypeOf<ToolSpec['output']>().toEqualTypeOf<OutputKind>();
      expectTypeOf<EntityTypeSpec['folder']>().toEqualTypeOf<
        'sources' | 'entities'
      >();
      expectTypeOf<ControlType>().not.toBeAny();
      expectTypeOf<HintKey>().not.toBeAny();
      expectTypeOf<ToolHints>().not.toBeAny();
      expectTypeOf<LintDiagnostic>().not.toBeAny();
      expectTypeOf<LintResult>().not.toBeAny();
      expectTypeOf<ToolCallRequest>().not.toBeAny();
      expectTypeOf<ResolvedEntity>().not.toBeAny();
      expectTypeOf<ToolCallResult>().not.toBeAny();
      expectTypeOf<ToolErrorCode>().not.toBeAny();
      expectTypeOf<ToolArgsInvalidDetails>().not.toBeAny();
      expectTypeOf<PortType>().not.toBeAny();

      expect(
        toolSpecSchema.safeParse({
          schemaVersion: TOOL_SPEC_SCHEMA_VERSION,
          name: 'cold_open',
          description: 'Drafts the cold open.',
          inputs: { type: 'object', properties: {} },
          output: 'draft',
          enabled: true,
          prompt: 'Write the cold open.',
        }).success,
      ).toBe(true);
      expect(
        entityTypeSchema.safeParse({
          schemaVersion: ENTITY_TYPE_SCHEMA_VERSION,
          kind: 'source',
          title: 'Source',
          description: 'A source file.',
          folder: 'sources',
          fields: {},
        }).success,
      ).toBe(true);
      expect(TOOL_NAME_PATTERN.test('cold_open')).toBe(true);
      expect(TOOL_NAME_PATTERN.test('ColdOpen')).toBe(false);
      expect(ENTITY_KIND_PATTERN.test('style-profile')).toBe(true);
      expect(TOOL_SPEC_SCHEMA_VERSION).toBe(1);
      expect(ENTITY_TYPE_SCHEMA_VERSION).toBe(1);
      expect(OUTPUT_KINDS).toEqual([
        'draft',
        'entity',
        'claims',
        'graph',
        'check',
      ]);
      expect(PORT_TYPES).toEqual(['text', 'entity', 'style']);
      expect(CONTROL_TYPES).toHaveLength(8);
      expect(HINT_KEYS).toHaveLength(4);
      expect(TOOL_EXECUTE_ROUTE).toBe('/api/tool-registry/tools/:name/execute');
      expect(Object.values(TOOL_ERROR_CODES)).toContain('TOOL_NOT_FOUND');
    });

    it('negative control: summary is not an output kind', () => {
      // @ts-expect-error summary is not an output kind
      const bad: OutputKind = 'summary';
      expect(bad).toBe('summary');
    });
  });

  describe('Agent loop', () => {
    it('references the function, catalog, descriptor, validate and call shapes', () => {
      // 'entity' and 'style' fit the element type of a form field and the type of a port input.
      const elementType: FormField['elementType'] = 'entity';
      const portType: PortInput['type'] = 'style';
      expect([elementType, portType]).toEqual(['entity', 'style']);

      expectTypeOf<ToolCallResult['sourcesUsed']>().toEqualTypeOf<
        EntityRef[]
      >();
      expectTypeOf<ToolOutput['kind']>().toEqualTypeOf<OutputKind>();
      expectTypeOf<ToolArgsIssue['path']>().toEqualTypeOf<string>();

      expectTypeOf<ModelFunction>().not.toBeAny();
      expectTypeOf<FunctionList>().not.toBeAny();
      expectTypeOf<ToolSummary>().not.toBeAny();
      expectTypeOf<ToolList>().not.toBeAny();
      expectTypeOf<PortDescriptor>().not.toBeAny();
      expectTypeOf<PortInput>().not.toBeAny();
      expectTypeOf<FormDescriptor>().not.toBeAny();
      expectTypeOf<FormField>().not.toBeAny();
      expectTypeOf<ToolValidateRequest>().not.toBeAny();
      expectTypeOf<ToolValidateResult>().not.toBeAny();
      expectTypeOf<EntityToResolve>().not.toBeAny();
      expectTypeOf<ToolOutput>().not.toBeAny();
      expectTypeOf<ToolArgsIssue>().not.toBeAny();
      expectTypeOf<ToolCallRequest>().not.toBeAny();
      expectTypeOf<ResolvedEntity>().not.toBeAny();
      expectTypeOf<ToolErrorCode>().not.toBeAny();
      expectTypeOf<ToolArgsInvalidDetails>().not.toBeAny();

      expect(OUTPUT_KINDS).toContain('draft');
      expect(Object.values(TOOL_ERROR_CODES)).toContain('TOOL_ARGS_INVALID');
    });
  });

  describe('Graph runner', () => {
    it('references the port, form, view, catalog, call and event shapes and the routes', () => {
      expectTypeOf<PortOutput['key']>().toEqualTypeOf<'output'>();
      const key: PortOutput['key'] = OUTPUT_PORT_KEY;
      expect(key).toBe('output');
      expect(OUTPUT_PORT_KEY).toBe('output');

      expectTypeOf<ToolValidateRequest['mode']>().toEqualTypeOf<
        'full' | 'params'
      >();
      expectTypeOf<PortInput['type']>().toEqualTypeOf<PortType>();
      expectTypeOf<keyof ToolViews>().toEqualTypeOf<
        'functionSchema' | 'form' | 'ports'
      >();
      expectTypeOf<FormField['valueType']>().toEqualTypeOf<
        ValueType | undefined
      >();
      expectTypeOf<ValueType>().toEqualTypeOf<
        'string' | 'integer' | 'number' | 'boolean'
      >();

      expectTypeOf<ToolDetail>().not.toBeAny();
      expectTypeOf<ToolRegistryEvent>().not.toBeAny();
      expectTypeOf<PortDescriptor>().not.toBeAny();
      expectTypeOf<FormDescriptor>().not.toBeAny();
      expectTypeOf<ToolSummary>().not.toBeAny();
      expectTypeOf<ToolList>().not.toBeAny();
      expectTypeOf<ToolValidateResult>().not.toBeAny();
      expectTypeOf<EntityToResolve>().not.toBeAny();
      expectTypeOf<ResolvedEntity>().not.toBeAny();
      expectTypeOf<ToolCallRequest>().not.toBeAny();
      expectTypeOf<ToolCallResult>().not.toBeAny();
      expectTypeOf<ToolOutput>().not.toBeAny();
      expectTypeOf<OutputKind>().not.toBeAny();
      expectTypeOf<ToolErrorCode>().not.toBeAny();
      expectTypeOf<ToolArgsIssue>().not.toBeAny();
      expectTypeOf<ToolArgsInvalidDetails>().not.toBeAny();

      expect(PORT_TYPES).toEqual(['text', 'entity', 'style']);
      expect(TOOLS_ROUTE).toBe('/api/tool-registry/tools');
      expect(TOOL_ROUTE).toBe('/api/tool-registry/tools/:name');
      expect(TOOL_VALIDATE_ROUTE).toBe(
        '/api/tool-registry/tools/:name/validate',
      );
    });
  });

  describe('Model providers client (informative)', () => {
    it('a ModelFunction is assignable to a copy of the client ToolSchema', () => {
      const fn: ModelFunction = {
        type: 'function',
        function: {
          name: 'cold_open',
          description: 'Drafts the cold open.',
          parameters: { type: 'object', properties: {} },
        },
      };
      const copy: ClientToolSchemaCopy = fn;
      expect(copy.function.name).toBe('cold_open');
    });
  });
});
