import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { errorCodeSchema } from '../src/platform/index.js';
import * as registry from '../src/tool-registry/index.js';

// A cold-open-shaped envelope: seven properties, a draft output and a block-scalar prompt.
// It is built here, so no test reads the real packs.
const PROMPT = `Write the cold open of the chapter.

Core idea: {{coreIdea}}
{{#each entityIds}}{{entity this}}{{/each}}
`;

const coldOpen = {
  schemaVersion: 1,
  name: 'cold_open',
  description: 'Drafts the cold open of a chapter from its core idea.',
  inputs: {
    type: 'object',
    properties: {
      coreIdea: {
        type: 'string',
        title: 'Core idea',
        'x-scriba-type': 'text',
        'x-scriba-port': true,
      },
      entityIds: {
        type: 'array',
        title: 'Entities',
        items: { type: 'string' },
        'x-scriba-type': 'entity',
        'x-scriba-port': true,
        'x-scriba-entity-kinds': ['person'],
      },
      styleProfile: {
        type: 'string',
        title: 'Style',
        'x-scriba-type': 'style',
        'x-scriba-port': true,
        'x-scriba-control': 'style-picker',
      },
      length: {
        type: 'integer',
        title: 'Length',
        default: 800,
        minimum: 200,
        maximum: 2000,
        'x-scriba-control': 'slider',
      },
      tone: {
        type: 'string',
        title: 'Tone',
        enum: ['warm', 'dry'],
        'x-scriba-control': 'select',
      },
      person: {
        type: 'string',
        title: 'Person',
        'x-scriba-type': 'entity',
        'x-scriba-port': true,
        'x-scriba-entity-kinds': ['person'],
        'x-scriba-control': 'entity-picker',
      },
      moment: {
        type: 'string',
        title: 'Moment',
        'x-scriba-type': 'text',
        'x-scriba-port': true,
      },
    },
    required: ['coreIdea', 'person'],
  },
  output: 'draft',
  enabled: true,
  prompt: PROMPT,
};

// The three views of the cold-open fixture, as the emitter should produce them.
const coldOpenFields = [
  {
    key: 'coreIdea',
    title: 'Core idea',
    description: '',
    control: 'textarea',
    required: true,
    default: null,
    list: false,
    port: true,
    elementType: 'text',
    valueType: 'string',
  },
  {
    key: 'entityIds',
    title: 'Entities',
    description: '',
    control: 'entity-picker',
    required: false,
    default: null,
    list: true,
    entityKinds: ['person'],
    port: true,
    elementType: 'entity',
    valueType: 'string',
  },
  {
    key: 'styleProfile',
    title: 'Style',
    description: '',
    control: 'style-picker',
    required: false,
    default: null,
    list: false,
    port: true,
    elementType: 'style',
    valueType: 'string',
  },
  {
    key: 'length',
    title: 'Length',
    description: '',
    control: 'slider',
    required: false,
    default: 800,
    minimum: 200,
    maximum: 2000,
    list: false,
    port: false,
    valueType: 'integer',
  },
  {
    key: 'tone',
    title: 'Tone',
    description: '',
    control: 'select',
    required: false,
    default: null,
    enum: ['warm', 'dry'],
    list: false,
    port: false,
    valueType: 'string',
  },
  {
    key: 'person',
    title: 'Person',
    description: '',
    control: 'entity-picker',
    required: true,
    default: null,
    list: false,
    entityKinds: ['person'],
    port: true,
    elementType: 'entity',
    valueType: 'string',
  },
  {
    key: 'moment',
    title: 'Moment',
    description: '',
    control: 'text',
    required: false,
    default: null,
    list: false,
    port: true,
    elementType: 'text',
    valueType: 'string',
  },
];

function coldOpenViews() {
  return {
    functionSchema: {
      type: 'function',
      function: {
        name: 'cold_open',
        description: coldOpen.description,
        parameters: coldOpen.inputs,
      },
    },
    form: { fields: coldOpenFields },
    ports: {
      inputs: [
        {
          key: 'coreIdea',
          type: 'text',
          list: false,
          required: true,
          title: 'Core idea',
        },
        {
          key: 'entityIds',
          type: 'entity',
          list: true,
          required: false,
          title: 'Entities',
        },
        {
          key: 'styleProfile',
          type: 'style',
          list: false,
          required: false,
          title: 'Style',
        },
        {
          key: 'person',
          type: 'entity',
          list: false,
          required: true,
          title: 'Person',
        },
        {
          key: 'moment',
          type: 'text',
          list: false,
          required: false,
          title: 'Moment',
        },
      ],
      output: { key: 'output', type: 'text', kind: 'draft' },
      params: ['length', 'tone'],
    },
  };
}

// The dotted paths of the issues of a failed parse, so a test can name the field that was refused.
function issuePaths<T>(result: z.ZodSafeParseResult<T>): string[] {
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.'));
}

// A copy of an object with one key left out.
function without(value: object, key: string): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([name]) => name !== key),
  );
}

// A copy of an object with one key replaced.
function withField(value: object, key: string, next: unknown) {
  return { ...value, [key]: next };
}

// Parses a value, passes the result through JSON, parses it again, and checks the two results are equal.
function roundTrips(schema: z.ZodType, value: unknown): void {
  const first = schema.parse(value);
  expect(schema.parse(JSON.parse(JSON.stringify(first)))).toEqual(first);
}

describe('C2: tool spec envelope', () => {
  it('C2: toolSpecSchema accepts the cold-open-shaped envelope and refuses a wrong output kind, bad names and a missing prompt, each for its own field', () => {
    expect(registry.toolSpecSchema.safeParse(coldOpen).success).toBe(true);

    for (const output of ['summary', 'Draft', 'claim']) {
      const result = registry.toolSpecSchema.safeParse(
        withField(coldOpen, 'output', output),
      );
      expect(issuePaths(result)).toEqual(['output']);
    }

    for (const name of [
      'ColdOpen',
      'cold-open',
      '1cold',
      '_cold',
      '',
      'a'.repeat(65),
    ]) {
      const result = registry.toolSpecSchema.safeParse(
        withField(coldOpen, 'name', name),
      );
      expect(issuePaths(result)).toEqual(['name']);
    }
    expect(
      registry.toolSpecSchema.safeParse(
        withField(coldOpen, 'name', 'a'.repeat(64)),
      ).success,
    ).toBe(true);

    const noPrompt = registry.toolSpecSchema.safeParse(
      without(coldOpen, 'prompt'),
    );
    expect(issuePaths(noPrompt)).toEqual(['prompt']);

    for (const description of ['a'.repeat(201), 'first\nsecond', '']) {
      const result = registry.toolSpecSchema.safeParse(
        withField(coldOpen, 'description', description),
      );
      expect(issuePaths(result)).toEqual(['description']);
    }
    expect(
      registry.toolSpecSchema.safeParse(
        withField(coldOpen, 'description', 'a'.repeat(200)),
      ).success,
    ).toBe(true);

    expect(
      issuePaths(
        registry.toolSpecSchema.safeParse(withField(coldOpen, 'inputs', [])),
      ),
    ).toEqual(['inputs']);
    expect(
      issuePaths(
        registry.toolSpecSchema.safeParse(
          withField(coldOpen, 'enabled', 'true'),
        ),
      ),
    ).toEqual(['enabled']);
    expect(
      issuePaths(
        registry.toolSpecSchema.safeParse(
          withField(coldOpen, 'schemaVersion', 0),
        ),
      ),
    ).toEqual(['schemaVersion']);
    expect(
      issuePaths(
        registry.toolSpecSchema.safeParse(
          withField(coldOpen, 'schemaVersion', 1.5),
        ),
      ),
    ).toEqual(['schemaVersion']);
    expect(
      registry.toolSpecSchema.safeParse(withField(coldOpen, 'typo', true))
        .success,
    ).toBe(false);

    // A higher schemaVersion parses; the loader refuses it (D3).
    expect(
      registry.toolSpecSchema.safeParse(withField(coldOpen, 'schemaVersion', 2))
        .success,
    ).toBe(true);
    expect(
      registry.toolSpecSchema.safeParse({
        ...withField(coldOpen, 'schemaVersion', 2),
        added: 'key',
      }).success,
    ).toBe(false);
  });
});

describe('C3: closed enums', () => {
  it('C3: the output kind enum has exactly five values and the port type enum exactly three, as constants, schemas and types', () => {
    expect(registry.OUTPUT_KINDS).toEqual([
      'draft',
      'entity',
      'claims',
      'graph',
      'check',
    ]);
    expect(registry.outputKindSchema.options).toEqual([
      ...registry.OUTPUT_KINDS,
    ]);
    expect(registry.PORT_TYPES).toEqual(['text', 'entity', 'style']);
    expect(registry.portTypeSchema.options).toEqual([...registry.PORT_TYPES]);

    for (const value of ['summary', 'Draft', 'claim', '']) {
      expect(registry.outputKindSchema.safeParse(value).success).toBe(false);
    }
    for (const value of ['number', 'Text', 'entities']) {
      expect(registry.portTypeSchema.safeParse(value).success).toBe(false);
    }

    expectTypeOf<registry.OutputKind>().toEqualTypeOf<
      'draft' | 'entity' | 'claims' | 'graph' | 'check'
    >();
    expectTypeOf<registry.PortType>().toEqualTypeOf<
      'text' | 'entity' | 'style'
    >();
  });
});

describe('E1: hint vocabulary and entity-type envelope', () => {
  it('E1: the closed hint vocabulary and the entity-type envelope', () => {
    const hints = registry.toolHintsSchema;
    expect(
      hints.safeParse({
        'x-scriba-type': 'entity',
        'x-scriba-port': true,
        'x-scriba-entity-kinds': ['person'],
        'x-scriba-control': 'entity-picker',
      }).success,
    ).toBe(true);
    expect(hints.safeParse({ 'x-scriba-foo': 'bar' }).success).toBe(false);
    expect(hints.safeParse({ 'x-scriba-type': 'number' }).success).toBe(false);
    expect(hints.safeParse({ 'x-scriba-control': 'dial' }).success).toBe(false);

    expect(registry.CONTROL_TYPES).toEqual([
      'text',
      'textarea',
      'select',
      'slider',
      'number',
      'toggle',
      'entity-picker',
      'style-picker',
    ]);
    expect(registry.HINT_KEYS).toEqual([
      'x-scriba-type',
      'x-scriba-port',
      'x-scriba-entity-kinds',
      'x-scriba-control',
    ]);

    expect(registry.ENTITY_FOLDERS).toEqual(['sources', 'entities']);
    expect(registry.entityFolderSchema.options).toEqual([
      'sources',
      'entities',
    ]);

    const styleProfile = {
      schemaVersion: 1,
      kind: 'style-profile',
      title: 'Style profile',
      description: 'A voice and rules for prose.',
      folder: 'entities',
      fields: { voice: { type: 'string' } },
    };
    expect(registry.entityTypeSchema.safeParse(styleProfile).success).toBe(
      true,
    );
    for (const kind of [
      'Style_Profile',
      'style_profile',
      'style--profile',
      '-style',
    ]) {
      expect(
        registry.entityTypeSchema.safeParse(
          withField(styleProfile, 'kind', kind),
        ).success,
      ).toBe(false);
    }
    expect(
      registry.entityTypeSchema.safeParse(
        withField(styleProfile, 'folder', 'drafts'),
      ).success,
    ).toBe(false);
    expect(
      registry.entityTypeSchema.safeParse(without(styleProfile, 'fields'))
        .success,
    ).toBe(false);
    expect(
      registry.entityTypeSchema.safeParse({ ...styleProfile, extra: 1 })
        .success,
    ).toBe(false);
  });
});

describe('E2: descriptors, function schema, lint, catalog and call shapes', () => {
  it('E2: the descriptors, the function schema, the lint shapes, the catalog shapes and the call shapes accept valid input, refuse invalid input and round-trip', () => {
    const views = coldOpenViews();

    // Validate modes and value types.
    expect(registry.VALIDATE_MODES).toEqual(['full', 'params']);
    expect(registry.validateModeSchema.options).toEqual(['full', 'params']);
    expect(registry.VALUE_TYPES).toEqual([
      'string',
      'integer',
      'number',
      'boolean',
    ]);
    expect(registry.valueTypeSchema.options).toEqual([
      'string',
      'integer',
      'number',
      'boolean',
    ]);

    // Port descriptor.
    expect(registry.portDescriptorSchema.safeParse(views.ports).success).toBe(
      true,
    );
    expect(
      registry.portDescriptorSchema.safeParse({
        ...views.ports,
        output: { ...views.ports.output, key: 'out' },
      }).success,
    ).toBe(false);
    expect(
      registry.portDescriptorSchema.safeParse({
        ...views.ports,
        output: { ...views.ports.output, type: 'entity' },
      }).success,
    ).toBe(false);
    expect(
      registry.portDescriptorSchema.safeParse({
        ...views.ports,
        inputs: [{ ...views.ports.inputs[0], type: 'number' }],
      }).success,
    ).toBe(false);

    // Form descriptor: a field with no default key is refused; null is a default.
    expect(registry.formDescriptorSchema.safeParse(views.form).success).toBe(
      true,
    );
    const [coreIdea, , , length, tone] = coldOpenFields;
    expect(
      registry.formFieldSchema.safeParse(without(coreIdea, 'default')).success,
    ).toBe(false);
    expect(
      registry.formFieldSchema.safeParse(withField(coreIdea, 'control', 'dial'))
        .success,
    ).toBe(false);
    expect(
      registry.formFieldSchema.safeParse(
        withField(coreIdea, 'elementType', 'string'),
      ).success,
    ).toBe(false);
    expect(registry.formFieldSchema.safeParse(length).success).toBe(true);
    expect(registry.formFieldSchema.safeParse(tone).success).toBe(true);

    // valueType: each of the four values, none at all, and an unknown value.
    for (const valueType of ['string', 'integer', 'number', 'boolean']) {
      expect(
        registry.formFieldSchema.safeParse(
          withField(coreIdea, 'valueType', valueType),
        ).success,
      ).toBe(true);
    }
    expect(
      registry.formFieldSchema.safeParse(without(coreIdea, 'valueType'))
        .success,
    ).toBe(true);
    const badValueType = registry.formFieldSchema.safeParse(
      withField(coreIdea, 'valueType', 'object'),
    );
    expect(badValueType.success).toBe(false);
    expect(
      !badValueType.success
        ? badValueType.error.issues.map((issue) => issue.path)
        : [],
    ).toEqual([['valueType']]);

    // Model function schema.
    expect(
      registry.modelFunctionSchema.safeParse(views.functionSchema).success,
    ).toBe(true);
    expect(
      registry.modelFunctionSchema.safeParse(
        withField(views.functionSchema, 'type', 'tool'),
      ).success,
    ).toBe(false);
    expect(
      registry.modelFunctionSchema.safeParse({
        ...views.functionSchema,
        function: { ...views.functionSchema.function, name: 'Cold Open' },
      }).success,
    ).toBe(false);

    // Lint diagnostics and the lint response.
    const warning = {
      severity: 'warning',
      rule: 'prompt-empty',
      message: 'The prompt is empty.',
      line: 3,
      column: 1,
    };
    expect(registry.lintDiagnosticSchema.safeParse(warning).success).toBe(true);
    expect(
      registry.lintDiagnosticSchema.safeParse(withField(warning, 'line', 0))
        .success,
    ).toBe(false);
    expect(
      registry.lintDiagnosticSchema.safeParse(
        withField(warning, 'severity', 'info'),
      ).success,
    ).toBe(false);
    expect(
      registry.lintResponseSchema.safeParse({ lint: [warning], views: null })
        .success,
    ).toBe(true);
    expect(
      registry.lintResponseSchema.safeParse({ lint: [], views }).success,
    ).toBe(true);
    const noPorts = without(views, 'ports');
    expect(registry.toolViewsSchema.safeParse(noPorts).success).toBe(false);
    expect(issuePaths(registry.toolViewsSchema.safeParse(noPorts))).toEqual([
      'ports',
    ]);
    expect(
      registry.lintResponseSchema.safeParse({ lint: [], views: noPorts })
        .success,
    ).toBe(false);

    // Catalog: summaries.
    const summary = {
      name: 'cold_open',
      description: 'Drafts the cold open.',
      output: 'draft',
      enabled: true,
      origin: 'core',
      valid: true,
      lintCounts: { errors: 0, warnings: 0 },
    };
    expect(registry.toolSummarySchema.safeParse(summary).success).toBe(true);
    const refusedFile = {
      name: 'cold_open',
      description: '',
      output: null,
      enabled: false,
      origin: 'user',
      valid: false,
      lintCounts: { errors: 1, warnings: 0 },
      error: {
        code: 'TOOL_SCHEMA_VERSION_UNSUPPORTED',
        message: 'schemaVersion 2 is newer than this build reads.',
      },
    };
    expect(registry.toolSummarySchema.safeParse(refusedFile).success).toBe(
      true,
    );
    expect(
      registry.toolSummarySchema.safeParse({
        ...summary,
        output: 'draft',
        valid: false,
        enabled: true,
      }).success,
    ).toBe(true);
    const unparsable = {
      name: 'broken',
      description: '',
      output: null,
      enabled: false,
      origin: 'user',
      valid: false,
      lintCounts: { errors: 1, warnings: 0 },
      error: { code: 'TOOL_INVALID', message: 'The file is not YAML.' },
    };
    expect(registry.toolSummarySchema.safeParse(unparsable).success).toBe(true);
    expect(
      registry.toolSummarySchema.safeParse(without(summary, 'output')).success,
    ).toBe(false);
    expect(
      registry.toolSummarySchema.safeParse({
        ...unparsable,
        error: { code: 'SOMETHING_ELSE', message: 'x' },
      }).success,
    ).toBe(false);
    expect(
      registry.toolSummarySchema.safeParse(
        withField(summary, 'origin', 'builtin'),
      ).success,
    ).toBe(false);
    expect(
      registry.toolSummarySchema.safeParse({ ...summary, overrides: 'user' })
        .success,
    ).toBe(false);

    // Catalog: details.
    const detail = {
      spec: coldOpen,
      source: 'schemaVersion: 1\nname: cold_open\n',
      origin: 'user',
      lint: [warning],
      views,
    };
    expect(registry.toolDetailSchema.safeParse(detail).success).toBe(true);
    const invalidDetail = {
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
    };
    expect(registry.toolDetailSchema.safeParse(invalidDetail).success).toBe(
      true,
    );
    expect(
      registry.toolDetailSchema.safeParse(without(invalidDetail, 'source'))
        .success,
    ).toBe(false);
    expect(
      registry.toolDetailSchema.safeParse(
        withField(invalidDetail, 'source', null),
      ).success,
    ).toBe(false);
    expect(
      registry.toolDetailSchema.safeParse(
        withField(invalidDetail, 'lint', null),
      ).success,
    ).toBe(false);
    expect(
      registry.toolDetailSchema.safeParse(without(detail, 'views')).success,
    ).toBe(false);
    expect(
      registry.toolDetailSchema.safeParse(
        withField(detail, 'origin', 'builtin'),
      ).success,
    ).toBe(false);

    // Validate and call shapes.
    const validateRequest = {
      arguments: { coreIdea: 'A lighthouse keeper.' },
      mode: 'params',
    };
    expect(
      registry.toolValidateRequestSchema.safeParse(validateRequest).success,
    ).toBe(true);
    expect(
      registry.toolValidateRequestSchema.safeParse(
        without(validateRequest, 'mode'),
      ).success,
    ).toBe(false);
    expect(
      registry.toolValidateRequestSchema.safeParse(
        withField(validateRequest, 'mode', 'partial'),
      ).success,
    ).toBe(false);

    const ann = {
      ref: 'ann',
      type: 'person',
      path: 'entities/ann.md',
      content: 'Ann keeps the light.',
    };
    const callRequest = {
      arguments: { coreIdea: 'A lighthouse keeper.' },
      entities: [ann],
    };
    expect(registry.toolCallRequestSchema.safeParse(callRequest).success).toBe(
      true,
    );
    expect(
      registry.toolCallRequestSchema.safeParse({
        ...callRequest,
        entities: [withField(ann, 'ref', 'Ann')],
      }).success,
    ).toBe(false);
    expect(
      registry.toolCallRequestSchema.safeParse({
        ...callRequest,
        entities: [without(ann, 'content')],
      }).success,
    ).toBe(false);

    const callResult = {
      output: { kind: 'draft', content: 'The light went out at dusk.' },
      sourcesUsed: ['ann'],
    };
    expect(registry.toolCallResultSchema.safeParse(callResult).success).toBe(
      true,
    );
    expect(
      registry.toolCallResultSchema.safeParse({
        ...callResult,
        output: { kind: 'summary', content: 'x' },
      }).success,
    ).toBe(false);

    // Every valid value survives a JSON round trip unchanged.
    roundTrips(registry.portDescriptorSchema, views.ports);
    roundTrips(registry.formDescriptorSchema, views.form);
    roundTrips(registry.formFieldSchema, length);
    roundTrips(registry.modelFunctionSchema, views.functionSchema);
    roundTrips(registry.lintResponseSchema, { lint: [warning], views });
    roundTrips(registry.toolSummarySchema, refusedFile);
    roundTrips(registry.toolSummarySchema, unparsable);
    roundTrips(registry.toolDetailSchema, detail);
    roundTrips(registry.toolDetailSchema, invalidDetail);
    roundTrips(registry.toolValidateRequestSchema, validateRequest);
    roundTrips(registry.toolCallRequestSchema, callRequest);
    roundTrips(registry.toolCallResultSchema, callResult);

    // Every exported type of section 2 is the z.infer of its schema.
    expectTypeOf<registry.ToolName>().toEqualTypeOf<
      z.infer<typeof registry.toolNameSchema>
    >();
    expectTypeOf<registry.JsonSchemaObject>().toEqualTypeOf<
      z.infer<typeof registry.jsonSchemaObjectSchema>
    >();
    expectTypeOf<registry.ControlType>().toEqualTypeOf<
      z.infer<typeof registry.controlTypeSchema>
    >();
    expectTypeOf<registry.HintKey>().toEqualTypeOf<
      z.infer<typeof registry.hintKeySchema>
    >();
    expectTypeOf<registry.ToolHints>().toEqualTypeOf<
      z.infer<typeof registry.toolHintsSchema>
    >();
    expectTypeOf<registry.ToolSpec>().toEqualTypeOf<
      z.infer<typeof registry.toolSpecSchema>
    >();
    expectTypeOf<registry.EntityKind>().toEqualTypeOf<
      z.infer<typeof registry.entityKindSchema>
    >();
    expectTypeOf<registry.EntityFolder>().toEqualTypeOf<
      z.infer<typeof registry.entityFolderSchema>
    >();
    expectTypeOf<registry.EntityTypeSpec>().toEqualTypeOf<
      z.infer<typeof registry.entityTypeSchema>
    >();
    expectTypeOf<registry.PortInput>().toEqualTypeOf<
      z.infer<typeof registry.portInputSchema>
    >();
    expectTypeOf<registry.PortOutput>().toEqualTypeOf<
      z.infer<typeof registry.portOutputSchema>
    >();
    expectTypeOf<registry.PortDescriptor>().toEqualTypeOf<
      z.infer<typeof registry.portDescriptorSchema>
    >();
    expectTypeOf<registry.ValueType>().toEqualTypeOf<
      z.infer<typeof registry.valueTypeSchema>
    >();
    expectTypeOf<registry.FormField>().toEqualTypeOf<
      z.infer<typeof registry.formFieldSchema>
    >();
    expectTypeOf<registry.FormDescriptor>().toEqualTypeOf<
      z.infer<typeof registry.formDescriptorSchema>
    >();
    expectTypeOf<registry.ModelFunction>().toEqualTypeOf<
      z.infer<typeof registry.modelFunctionSchema>
    >();
    expectTypeOf<registry.ToolViews>().toEqualTypeOf<
      z.infer<typeof registry.toolViewsSchema>
    >();
    expectTypeOf<registry.LintSeverity>().toEqualTypeOf<
      z.infer<typeof registry.lintSeveritySchema>
    >();
    expectTypeOf<registry.LintDiagnostic>().toEqualTypeOf<
      z.infer<typeof registry.lintDiagnosticSchema>
    >();
    expectTypeOf<registry.LintResult>().toEqualTypeOf<
      z.infer<typeof registry.lintResultSchema>
    >();
    expectTypeOf<registry.LintCounts>().toEqualTypeOf<
      z.infer<typeof registry.lintCountsSchema>
    >();
    expectTypeOf<registry.LintRequest>().toEqualTypeOf<
      z.infer<typeof registry.lintRequestSchema>
    >();
    expectTypeOf<registry.LintResponse>().toEqualTypeOf<
      z.infer<typeof registry.lintResponseSchema>
    >();
    expectTypeOf<registry.ToolErrorCode>().toEqualTypeOf<
      z.infer<typeof registry.toolErrorCodeSchema>
    >();
    expectTypeOf<registry.ToolArgsIssue>().toEqualTypeOf<
      z.infer<typeof registry.toolArgsIssueSchema>
    >();
    expectTypeOf<registry.ToolArgsInvalidDetails>().toEqualTypeOf<
      z.infer<typeof registry.toolArgsInvalidDetailsSchema>
    >();
    expectTypeOf<registry.ToolSpecLintFailedDetails>().toEqualTypeOf<
      z.infer<typeof registry.toolSpecLintFailedDetailsSchema>
    >();
    expectTypeOf<registry.ToolOrigin>().toEqualTypeOf<
      z.infer<typeof registry.toolOriginSchema>
    >();
    expectTypeOf<registry.BuiltinOrigin>().toEqualTypeOf<
      z.infer<typeof registry.builtinOriginSchema>
    >();
    expectTypeOf<registry.ToolErrorInfo>().toEqualTypeOf<
      z.infer<typeof registry.toolErrorInfoSchema>
    >();
    expectTypeOf<registry.ToolSummary>().toEqualTypeOf<
      z.infer<typeof registry.toolSummarySchema>
    >();
    expectTypeOf<registry.ToolListQuery>().toEqualTypeOf<
      z.infer<typeof registry.toolListQuerySchema>
    >();
    expectTypeOf<registry.ToolList>().toEqualTypeOf<
      z.infer<typeof registry.toolListSchema>
    >();
    expectTypeOf<registry.ToolDetail>().toEqualTypeOf<
      z.infer<typeof registry.toolDetailSchema>
    >();
    expectTypeOf<registry.FunctionList>().toEqualTypeOf<
      z.infer<typeof registry.functionListSchema>
    >();
    expectTypeOf<registry.EntityTypeList>().toEqualTypeOf<
      z.infer<typeof registry.entityTypeListSchema>
    >();
    expectTypeOf<registry.ToolSaveRequest>().toEqualTypeOf<
      z.infer<typeof registry.toolSaveRequestSchema>
    >();
    expectTypeOf<registry.ToolEnabledRequest>().toEqualTypeOf<
      z.infer<typeof registry.toolEnabledRequestSchema>
    >();
    expectTypeOf<registry.ToolArguments>().toEqualTypeOf<
      z.infer<typeof registry.toolArgumentsSchema>
    >();
    expectTypeOf<registry.ResolvedEntity>().toEqualTypeOf<
      z.infer<typeof registry.resolvedEntitySchema>
    >();
    expectTypeOf<registry.EntityToResolve>().toEqualTypeOf<
      z.infer<typeof registry.entityToResolveSchema>
    >();
    expectTypeOf<registry.ValidateMode>().toEqualTypeOf<
      z.infer<typeof registry.validateModeSchema>
    >();
    expectTypeOf<registry.ToolValidateRequest>().toEqualTypeOf<
      z.infer<typeof registry.toolValidateRequestSchema>
    >();
    expectTypeOf<registry.ToolValidateResult>().toEqualTypeOf<
      z.infer<typeof registry.toolValidateResultSchema>
    >();
    expectTypeOf<registry.ToolCallRequest>().toEqualTypeOf<
      z.infer<typeof registry.toolCallRequestSchema>
    >();
    expectTypeOf<registry.ToolRenderRequest>().toEqualTypeOf<
      z.infer<typeof registry.toolRenderRequestSchema>
    >();
    expectTypeOf<registry.ToolRenderResult>().toEqualTypeOf<
      z.infer<typeof registry.toolRenderResultSchema>
    >();
    expectTypeOf<registry.ToolOutput>().toEqualTypeOf<
      z.infer<typeof registry.toolOutputSchema>
    >();
    expectTypeOf<registry.ToolCallResult>().toEqualTypeOf<
      z.infer<typeof registry.toolCallResultSchema>
    >();
    expectTypeOf<registry.CatalogChangedData>().toEqualTypeOf<
      z.infer<typeof registry.catalogChangedDataSchema>
    >();
    expectTypeOf<registry.ToolRegistryEvent>().toEqualTypeOf<
      z.infer<typeof registry.toolRegistryEventSchema>
    >();
    expectTypeOf<registry.ToolsSection>().toEqualTypeOf<
      z.infer<typeof registry.toolsSectionSchema>
    >();
  });
});

describe('E3: errors, routes, the catalog-changed member and the tools section', () => {
  it('E3: error codes and statuses, issue details, route constants, the catalog-changed member and the tools section', () => {
    const codes = [
      'TOOL_NOT_FOUND',
      'TOOL_DISABLED',
      'TOOL_INVALID',
      'TOOL_ARGS_INVALID',
      'TOOL_ENTITY_UNRESOLVED',
      'TOOL_ENTITY_KIND_MISMATCH',
      'TOOL_SPEC_LINT_FAILED',
      'TOOL_BUILTIN_READONLY',
      'TOOL_SCHEMA_VERSION_UNSUPPORTED',
      'TOOL_MODEL_ERROR',
    ];
    expect(registry.TOOL_ERROR_CODE_VALUES).toEqual(codes);
    expect(Object.values(registry.TOOL_ERROR_CODES).sort()).toEqual(
      [...codes].sort(),
    );
    expect(registry.toolErrorCodeSchema.options).toEqual(codes);
    for (const code of codes) {
      expect(errorCodeSchema.safeParse(code).success).toBe(true);
    }

    expect(Object.keys(registry.TOOL_ERROR_STATUS).sort()).toEqual(
      [...codes].sort(),
    );
    const statuses = Object.values(registry.TOOL_ERROR_STATUS);
    expect(
      statuses.every((status) => [404, 409, 422, 502].includes(status)),
    ).toBe(true);
    expect(statuses).not.toContain(401);
    expect(registry.TOOL_ERROR_STATUS.TOOL_SPEC_LINT_FAILED).toBe(422);

    expect(
      registry.toolArgsInvalidDetailsSchema.safeParse({
        issues: [{ path: '/length', message: 'must be an integer' }],
      }).success,
    ).toBe(true);
    expect(
      registry.toolArgsInvalidDetailsSchema.safeParse({
        issues: [{ path: '/entityIds/0', message: 'not an entity id' }],
      }).success,
    ).toBe(true);
    expect(
      registry.toolArgsInvalidDetailsSchema.safeParse({
        issues: [{ path: '', message: 'arguments must be an object' }],
      }).success,
    ).toBe(true);
    expect(
      registry.toolArgsInvalidDetailsSchema.safeParse({
        issues: [{ path: '/length' }],
      }).success,
    ).toBe(false);
    expect(
      registry.toolArgsInvalidDetailsSchema.safeParse({
        issues: [{ message: 'no path' }],
      }).success,
    ).toBe(false);
    expect(
      registry.toolArgsInvalidDetailsSchema.safeParse({
        issues: [{ path: ['length'], message: 'zod path' }],
      }).success,
    ).toBe(false);

    const routes = [
      registry.TOOLS_ROUTE,
      registry.TOOL_ROUTE,
      registry.TOOL_BUILTIN_ROUTE,
      registry.TOOL_USER_ROUTE,
      registry.FUNCTIONS_ROUTE,
      registry.ENTITY_TYPES_ROUTE,
      registry.LINT_ROUTE,
      registry.TOOL_VALIDATE_ROUTE,
      registry.TOOL_ENABLED_ROUTE,
      registry.TOOL_SAVE_ROUTE,
      registry.TOOL_DELETE_ROUTE,
      registry.TOOL_RENDER_ROUTE,
      registry.TOOL_EXECUTE_ROUTE,
    ];
    expect(
      routes.every((route) => route.startsWith('/api/tool-registry/')),
    ).toBe(true);
    expect(
      routes.filter((route) => route.includes('/tools/:name')),
    ).toHaveLength(9);
    expect(
      routes.filter((route) => !route.includes('/tools/:name')),
    ).toHaveLength(4);
    expect(new Set(routes).size).toBe(13);

    const member = {
      module: 'tool-registry',
      type: 'catalog-changed',
      data: { names: ['cold_open'] },
    };
    expect(registry.toolRegistryEventSchema.safeParse(member).success).toBe(
      true,
    );
    expect(
      registry.toolRegistryEventSchema.safeParse({
        ...member,
        data: { names: [] },
      }).success,
    ).toBe(true);
    expect(
      registry.toolRegistryEventSchema.safeParse(
        withField(member, 'module', 'project-store'),
      ).success,
    ).toBe(false);
    expect(
      registry.toolRegistryEventSchema.safeParse(
        withField(member, 'type', 'catalog-updated'),
      ).success,
    ).toBe(false);
    expect(
      registry.toolRegistryEventSchema.safeParse(without(member, 'data'))
        .success,
    ).toBe(false);
    expect(
      registry.toolRegistryEventSchema.safeParse({
        ...member,
        data: { names: [1] },
      }).success,
    ).toBe(false);

    expect(
      registry.toolsSectionSchema.safeParse({ schemaVersion: 1, enabled: {} })
        .success,
    ).toBe(true);
    expect(
      registry.toolsSectionSchema.safeParse({
        schemaVersion: 1,
        enabled: { cold_open: false },
      }).success,
    ).toBe(true);
    const kept = registry.toolsSectionSchema.parse({
      schemaVersion: 1,
      enabled: {},
      future: 'kept',
    });
    expect(kept).toHaveProperty('future', 'kept');
    expect(
      registry.toolsSectionSchema.safeParse({ schemaVersion: 2, enabled: {} })
        .success,
    ).toBe(false);
    expect(
      registry.toolsSectionSchema.safeParse({
        schemaVersion: 1,
        enabled: { a: 'no' },
      }).success,
    ).toBe(false);
  });
});
