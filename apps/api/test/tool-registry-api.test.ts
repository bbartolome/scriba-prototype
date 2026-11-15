import { rmSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import { expect, it } from 'vitest';
import { errorBodySchema } from '@bbartolome/scriba-contracts/platform';
import {
  TOOL_ROUTE,
  TOOL_VALIDATE_ROUTE,
  toolArgsInvalidDetailsSchema,
  toolDetailSchema,
  toolValidateResultSchema,
} from '@bbartolome/scriba-contracts/tool-registry';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from './invariant-sweep';
import { makeLibrary } from './settings.kit';

// The built-in packs of the fixtures: cold_open is in core.
const FIXTURE_PACKS = join(__dirname, 'fixtures', 'packs');

// The form fields of the cold-open fixture, as the contract test's coldOpenFields gives them.
const EXPECTED_FIELDS = [
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

// The input ports of the cold-open fixture, in property order.
const EXPECTED_PORT_INPUTS = [
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
];

// Boots the composed app on a fresh library. The app is closed and the library removed in a finally.
async function withApp(
  run: (app: TestApp, cookie: string) => Promise<void>,
): Promise<void> {
  const library = makeLibrary();
  let app: TestApp | undefined;
  try {
    app = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PACKS_DIR: FIXTURE_PACKS },
    });
    const cookie = await sessionCookie(app, library);
    await run(app, cookie);
  } finally {
    await app?.close();
    rmSync(library, { recursive: true, force: true });
  }
}

function toolPath(template: string, name: string): string {
  return template.replace(':name', name);
}

function get(app: TestApp, cookie: string, name: string): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie,
    path: toolPath(TOOL_ROUTE, name),
  });
}

// A POST with the loopback Origin, as the guard requires for a mutation.
function validate(
  app: TestApp,
  cookie: string,
  name: string,
  body: unknown,
): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie,
    method: 'POST',
    path: toolPath(TOOL_VALIDATE_ROUTE, name),
    body: JSON.stringify(body),
  });
}

function json(reply: Reply): unknown {
  return JSON.parse(reply.body);
}

function issuesOf(details: unknown) {
  return toolArgsInvalidDetailsSchema.parse(details).issues;
}

// Every key that starts with x- in a JSON value, at every depth.
function extensionKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(extensionKeys);
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) => [
    ...(key.startsWith('x-') ? [key] : []),
    ...extensionKeys(child),
  ]);
}

it('AC1: GET of cold_open returns the three views; the function schema has no x- key and passes draft-07; form and ports match the fixture', async () => {
  await withApp(async (app, cookie) => {
    const reply = await get(app, cookie, 'cold_open');
    expect(reply.status).toBe(200);
    const raw = json(reply) as { views: Record<string, unknown> };
    const detail = toolDetailSchema.parse(raw);
    const views = detail.views;
    if (views === null) throw new Error('The views of cold_open are null.');

    expect(Object.keys(raw.views).sort()).toEqual([
      'form',
      'functionSchema',
      'ports',
    ]);
    expect(extensionKeys(raw.views.functionSchema)).toEqual([]);
    const parameters = views.functionSchema.function.parameters;
    expect(new Ajv().validateSchema(parameters)).toBe(true);

    expect(views.form.fields).toEqual(EXPECTED_FIELDS);
    expect(views.ports).toEqual({
      inputs: EXPECTED_PORT_INPUTS,
      output: { key: 'output', type: 'text', kind: 'draft' },
      params: ['length', 'tone'],
    });

    expect(Object.keys(parameters.properties as object)).toEqual([
      'coreIdea',
      'entityIds',
      'styleProfile',
      'length',
      'tone',
      'person',
      'moment',
    ]);
    expect(parameters.required).toEqual(['coreIdea', 'person']);
    expect(parameters.additionalProperties).toBe(false);
    const properties = parameters.properties as Record<
      string,
      { description?: string }
    >;
    expect(properties.person?.description).toBe('Entity ID(s) of kind person.');
    expect(properties.styleProfile?.description).toBe(
      "Style-profile entity ID; defaults to the project's style profile.",
    );
  });
});

it('AC2: missing required fields and wrong enum values give TOOL_ARGS_INVALID naming each field; unknown fields list the allowed fields', async () => {
  await withApp(async (app, cookie) => {
    const missing = await validate(app, cookie, 'cold_open', {
      arguments: { tone: 'loud' },
      mode: 'full',
    });
    expect(missing.status).toBe(422);
    const missingError = errorBodySchema.parse(json(missing)).error;
    expect(missingError.code).toBe('TOOL_ARGS_INVALID');
    expect(missingError.message).toContain(
      'Arguments for the tool "cold_open" are not valid:',
    );
    expect(missingError.message).toContain(
      '- coreIdea: required, expected a string, received nothing.',
    );
    expect(missingError.message).toContain(
      '- person: required, expected a string, received nothing.',
    );
    expect(missingError.message).toContain(
      '- tone: expected one of "warm", "dry", received "loud".',
    );
    expect(issuesOf(missingError.details).map((issue) => issue.path)).toEqual(
      expect.arrayContaining(['/coreIdea', '/person', '/tone']),
    );

    const extra = await validate(app, cookie, 'cold_open', {
      arguments: { coreIdea: 'x', person: 'ada', extra: 1, other: 2 },
      mode: 'full',
    });
    expect(extra.status).toBe(422);
    const extraError = errorBodySchema.parse(json(extra)).error;
    expect(extraError.code).toBe('TOOL_ARGS_INVALID');
    expect(extraError.message).toContain('"extra" and "other"');
    expect(extraError.message).toContain(
      'Allowed fields: coreIdea, entityIds, styleProfile, length, tone, person, moment.',
    );
    expect(issuesOf(extraError.details).map((issue) => issue.path)).toEqual(
      expect.arrayContaining(['/extra', '/other']),
    );
  });
});

it('AC3: a valid validate returns defaults applied and the tagged entity IDs', async () => {
  await withApp(async (app, cookie) => {
    const reply = await validate(app, cookie, 'cold_open', {
      arguments: {
        coreIdea: 'Seven days',
        entityIds: ['ada-1', 'ada-2'],
        styleProfile: 'house-style',
        person: 'ada-lovelace',
      },
      mode: 'full',
    });
    expect(reply.status).toBe(200);
    const result = toolValidateResultSchema.parse(json(reply));
    expect(result.arguments).toMatchObject({ length: 800 });
    expect(result.entityRefs).toEqual([
      { field: 'entityIds', id: 'ada-1', style: false },
      { field: 'entityIds', id: 'ada-2', style: false },
      { field: 'styleProfile', id: 'house-style', style: true },
      { field: 'person', id: 'ada-lovelace', style: false },
    ]);
  });
});

it('AC4: no coercion: "3" for an integer field is rejected', async () => {
  await withApp(async (app, cookie) => {
    const reply = await validate(app, cookie, 'cold_open', {
      arguments: { coreIdea: 'x', person: 'ada', length: '3' },
      mode: 'full',
    });
    expect(reply.status).toBe(422);
    const error = errorBodySchema.parse(json(reply)).error;
    expect(error.code).toBe('TOOL_ARGS_INVALID');
    expect(issuesOf(error.details)).toContainEqual({
      path: '/length',
      message: 'expected an integer, received "3"',
    });
  });
});

it('E1: an unknown tool is TOOL_NOT_FOUND on both routes', async () => {
  await withApp(async (app, cookie) => {
    const detail = await get(app, cookie, 'no-such-tool');
    expect(detail.status).toBe(404);
    expect(errorBodySchema.parse(json(detail)).error.code).toBe(
      'TOOL_NOT_FOUND',
    );

    const check = await validate(app, cookie, 'no-such-tool', {
      arguments: {},
      mode: 'full',
    });
    expect(check.status).toBe(404);
    expect(errorBodySchema.parse(json(check)).error.code).toBe(
      'TOOL_NOT_FOUND',
    );
  });
});

it('E2: params mode drops the port keys and checks no port is required', async () => {
  await withApp(async (app, cookie) => {
    const first = await validate(app, cookie, 'cold_open', {
      arguments: { coreIdea: 'x', length: 900 },
      mode: 'params',
    });
    expect(first.status).toBe(200);
    expect(toolValidateResultSchema.parse(json(first)).arguments).toEqual({
      length: 900,
    });

    const second = await validate(app, cookie, 'cold_open', {
      arguments: { tone: 'warm' },
      mode: 'params',
    });
    expect(second.status).toBe(200);
    expect(toolValidateResultSchema.parse(json(second)).arguments).toEqual({
      tone: 'warm',
      length: 800,
    });
  });
});

it('E3: an entity value that is not an entity ID is TOOL_ARGS_INVALID at its path', async () => {
  await withApp(async (app, cookie) => {
    const reply = await validate(app, cookie, 'cold_open', {
      arguments: { coreIdea: 'x', person: 'Ada Lovelace' },
      mode: 'full',
    });
    expect(reply.status).toBe(422);
    const error = errorBodySchema.parse(json(reply)).error;
    expect(error.code).toBe('TOOL_ARGS_INVALID');
    expect(issuesOf(error.details)).toEqual([
      {
        path: '/person',
        message:
          'expected an entity ID (lower-case letters, digits and hyphens), received "Ada Lovelace"',
      },
    ]);
  });
});
