import { rmSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { stringify } from 'yaml';
import { errorBodySchema } from '@bbartolome/scriba-contracts/platform';
import { PROVIDER_DEFAULTS } from '@bbartolome/scriba-contracts/providers';
import {
  TOOL_ENABLED_ROUTE,
  TOOL_EXECUTE_ROUTE,
  TOOL_RENDER_ROUTE,
  toolArgsInvalidDetailsSchema,
  toolCallResultSchema,
  toolRenderResultSchema,
  type ResolvedEntity,
} from '@bbartolome/scriba-contracts/tool-registry';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from './invariant-sweep';
import {
  recordsOf,
  startMockOpenAI,
  type MockOpenAI,
} from './providers-client.kit';
import { makeLibrary } from './settings.kit';

// The shared fixture packs (cold_open, myth_buster, scene_builder) and the render probe of this test's own pack.
const FIXTURE_PACKS = join(__dirname, 'fixtures', 'packs');
const EXECUTOR_PACKS = join(__dirname, 'fixtures', 'executor', 'packs');

// The system message of the draft output kind, written out here so the test does not import the executor.
const DRAFT_SYSTEM_MESSAGE =
  'Write the answer as Markdown prose. Return only the text of the answer, with no preface and no closing remarks.';

const DRAFT_TEXT = 'The cold open opens on the bench at dawn.';

interface OpenedApp {
  app: TestApp;
  cookie: string;
  mock: MockOpenAI;
  close: () => Promise<void>;
}

// A mock on the default scenario folder, a library whose one provider is that scenario, and the composed app with a
// session cookie. The app has no active project, so the app default applies.
async function openApp(packsDir: string, scenario: string): Promise<OpenedApp> {
  const mock = await startMockOpenAI();
  const library = makeLibrary(
    stringify({
      schemaVersion: 1,
      providers: {
        schemaVersion: 1,
        list: [
          {
            id: 'mock',
            kind: 'openai-compatible',
            baseURL: `${mock.baseUrl}/scenario/${scenario}/v1`,
            model: 'mock-model',
            ...PROVIDER_DEFAULTS,
          },
        ],
        appDefault: { providerId: 'mock', model: 'mock-model' },
      },
    }),
  );
  let app: TestApp | undefined;
  const close = async (): Promise<void> => {
    try {
      await app?.close();
    } finally {
      await mock.close();
      rmSync(library, { recursive: true, force: true });
    }
  };
  try {
    app = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PACKS_DIR: packsDir },
    });
    const cookie = await sessionCookie(app, library);
    return { app, cookie, mock, close };
  } catch (error) {
    await close();
    throw error;
  }
}

function toolPath(template: string, name: string): string {
  return template.replace(':name', name);
}

function post(
  app: TestApp,
  cookie: string,
  path: string,
  body: unknown,
): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie,
    method: 'POST',
    path,
    body: JSON.stringify(body),
  });
}

function json(reply: Reply): unknown {
  return JSON.parse(reply.body) as unknown;
}

function entity(ref: string, type: string): ResolvedEntity {
  return {
    ref,
    type,
    path: `entities/${ref}.md`,
    content: `${ref} is a ${type}.`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

it('C1 render returns the expected prompt, expands each entity in #each and renders an absent field as nothing', async () => {
  const { app, cookie, mock, close } = await openApp(
    EXECUTOR_PACKS,
    'tool-execute-draft',
  );
  try {
    const reply = await post(
      app,
      cookie,
      toolPath(TOOL_RENDER_ROUTE, 'render_probe'),
      {
        arguments: {
          coreIdea: 'Engines reward patience',
          entityIds: ['ada-lovelace', 'grace-hopper'],
        },
        entities: [
          {
            ref: 'ada-lovelace',
            type: 'person',
            path: 'entities/ada-lovelace.md',
            content: 'Ada wrote the first program.',
          },
          {
            ref: 'grace-hopper',
            type: 'person',
            path: 'entities/grace-hopper.md',
            content: 'Grace Hopper wrote the first compiler.',
          },
        ],
      },
    );
    expect(reply.status).toBe(200);
    expect(toolRenderResultSchema.parse(json(reply)).prompt).toBe(
      'Core idea: Engines reward patience. Tone: . [person ada-lovelace (entities/ada-lovelace.md)\nAda wrote the first program.] [person grace-hopper (entities/grace-hopper.md)\nGrace Hopper wrote the first compiler.]',
    );
    expect(await recordsOf(mock, 'tool-execute-draft')).toHaveLength(0);
  } finally {
    await close();
  }
});

it('C2 execute returns the draft and the sources it cites, and the mock got the draft system message then the rendered prompt', async () => {
  const { app, cookie, mock, close } = await openApp(
    FIXTURE_PACKS,
    'tool-execute-draft',
  );
  try {
    const request = {
      arguments: {
        coreIdea: 'Engines reward patience',
        entityIds: ['grace-hopper', 'ada-lovelace'],
        styleProfile: 'house-style',
        person: 'ada-lovelace',
      },
      entities: [
        entity('grace-hopper', 'person'),
        entity('ada-lovelace', 'person'),
        entity('house-style', 'style-profile'),
      ],
    };
    const path = toolPath(TOOL_EXECUTE_ROUTE, 'cold_open');
    const render = await post(
      app,
      cookie,
      toolPath(TOOL_RENDER_ROUTE, 'cold_open'),
      request,
    );
    expect(render.status).toBe(200);
    const prompt = toolRenderResultSchema.parse(json(render)).prompt;

    const reply = await post(app, cookie, path, request);
    expect(reply.status).toBe(200);
    const result = toolCallResultSchema.parse(json(reply));
    expect(result.output).toEqual({ kind: 'draft', content: DRAFT_TEXT });
    expect(result.sourcesUsed).toEqual(['grace-hopper', 'ada-lovelace']);

    const records = await recordsOf(mock, 'tool-execute-draft');
    expect(records).toHaveLength(1);
    const body = records[0]?.body as { messages: unknown[] };
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0]).toEqual({
      role: 'system',
      content: DRAFT_SYSTEM_MESSAGE,
    });
    expect(body.messages[1]).toEqual({ role: 'user', content: prompt });
  } finally {
    await close();
  }
});

it('C3 malformed arguments name every bad field; wrong-kind and unresolved entities are refused by name; the model is never called', async () => {
  const { app, cookie, mock, close } = await openApp(
    FIXTURE_PACKS,
    'tool-execute-draft',
  );
  try {
    const path = toolPath(TOOL_EXECUTE_ROUTE, 'cold_open');

    // (a) bad types, an unknown field and a malformed entity ID next to them: each is named.
    const malformed = await post(app, cookie, path, {
      arguments: {
        coreIdea: 42,
        entityIds: ['Bad Id'],
        unexpected: 'x',
      },
      entities: [],
    });
    expect(malformed.status).toBe(422);
    const malformedError = errorBodySchema.parse(json(malformed)).error;
    expect(malformedError.code).toBe('TOOL_ARGS_INVALID');
    expect(
      toolArgsInvalidDetailsSchema
        .parse(malformedError.details)
        .issues.map((issue) => issue.path)
        .sort(),
    ).toEqual(['/coreIdea', '/entityIds/0', '/person', '/unexpected']);
    for (const word of ['coreIdea', 'person', '"unexpected"', 'entityIds']) {
      expect(malformedError.message).toContain(word);
    }

    // (b) the entity is of kind claim, and the field takes person.
    const wrongKind = await post(app, cookie, path, {
      arguments: { coreIdea: 'x', person: 'ada-lovelace' },
      entities: [entity('ada-lovelace', 'claim')],
    });
    expect(wrongKind.status).toBe(422);
    const wrongKindError = errorBodySchema.parse(json(wrongKind)).error;
    expect(wrongKindError.code).toBe('TOOL_ENTITY_KIND_MISMATCH');
    for (const word of ['ada-lovelace', 'person', 'claim']) {
      expect(wrongKindError.message).toContain(word);
    }

    // (c) the entity is not among the resolved entities of the request.
    const unresolved = await post(app, cookie, path, {
      arguments: { coreIdea: 'x', person: 'ada-lovelace' },
      entities: [],
    });
    expect(unresolved.status).toBe(422);
    const unresolvedError = errorBodySchema.parse(json(unresolved)).error;
    expect(unresolvedError.code).toBe('TOOL_ENTITY_UNRESOLVED');
    expect(unresolvedError.message).toContain('ada-lovelace');
    expect(unresolvedError.message).toContain('person');

    // (d) a style reference resolved to a person: the style field takes style-profile.
    const wrongStyle = await post(app, cookie, path, {
      arguments: {
        coreIdea: 'x',
        person: 'ada-lovelace',
        styleProfile: 'grace-hopper',
      },
      entities: [
        entity('ada-lovelace', 'person'),
        entity('grace-hopper', 'person'),
      ],
    });
    expect(wrongStyle.status).toBe(422);
    const wrongStyleError = errorBodySchema.parse(json(wrongStyle)).error;
    expect(wrongStyleError.code).toBe('TOOL_ENTITY_KIND_MISMATCH');
    for (const word of ['grace-hopper', 'styleProfile', 'style-profile']) {
      expect(wrongStyleError.message).toContain(word);
    }

    expect(await recordsOf(mock, 'tool-execute-draft')).toHaveLength(0);
  } finally {
    await close();
  }
});

it('C4 a disabled tool answers TOOL_DISABLED, and a dropped client connection stops the model request', async () => {
  // Part 1: a disabled tool is refused before the model is called.
  const disabled = await openApp(FIXTURE_PACKS, 'tool-execute-draft');
  try {
    const toggled = await post(
      disabled.app,
      disabled.cookie,
      toolPath(TOOL_ENABLED_ROUTE, 'cold_open'),
      { enabled: false },
    );
    expect(toggled.status).toBe(200);

    const request = {
      arguments: { coreIdea: 'x', person: 'ada-lovelace' },
      entities: [entity('ada-lovelace', 'person')],
    };
    const render = await post(
      disabled.app,
      disabled.cookie,
      toolPath(TOOL_RENDER_ROUTE, 'cold_open'),
      request,
    );
    expect(render.status).toBe(409);
    expect(errorBodySchema.parse(json(render)).error.code).toBe(
      'TOOL_DISABLED',
    );

    const execute = await post(
      disabled.app,
      disabled.cookie,
      toolPath(TOOL_EXECUTE_ROUTE, 'cold_open'),
      request,
    );
    expect(execute.status).toBe(409);
    expect(errorBodySchema.parse(json(execute)).error.code).toBe(
      'TOOL_DISABLED',
    );
    expect(await recordsOf(disabled.mock, 'tool-execute-draft')).toHaveLength(
      0,
    );
  } finally {
    await disabled.close();
  }

  // Part 2: the client drops the connection while the model is still answering.
  const stalled = await openApp(FIXTURE_PACKS, 'stalled');
  try {
    const { hostname, port } = new URL(stalled.app.baseUrl);
    const body = JSON.stringify({
      arguments: { coreIdea: 'x', person: 'ada-lovelace' },
      entities: [entity('ada-lovelace', 'person')],
    });
    const client = httpRequest({
      hostname,
      port,
      path: toolPath(TOOL_EXECUTE_ROUTE, 'cold_open'),
      method: 'POST',
      agent: false,
      headers: {
        Host: LOOPBACK_HOST,
        Origin: LOOPBACK_ORIGIN,
        Cookie: stalled.cookie,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    });
    client.on('error', () => {
      // The socket is destroyed on purpose below; the resulting error is expected.
    });
    client.end(body);

    let records = await recordsOf(stalled.mock, 'stalled');
    const arrival = Date.now() + 2000;
    while (records.length === 0 && Date.now() < arrival) {
      await sleep(50);
      records = await recordsOf(stalled.mock, 'stalled');
    }
    expect(records).toHaveLength(1);

    client.destroy();
    const closed = Date.now() + 2000;
    while (
      (await recordsOf(stalled.mock, 'stalled'))[0]?.closedByClient !== true &&
      Date.now() < closed
    ) {
      await sleep(50);
    }
    expect((await recordsOf(stalled.mock, 'stalled'))[0]?.closedByClient).toBe(
      true,
    );
  } finally {
    await stalled.close();
  }
});

it('C5 each workhorse-shaped fixture tool returns a draft that cites its entity files through sourcesUsed', async () => {
  const { app, cookie, mock, close } = await openApp(
    FIXTURE_PACKS,
    'tool-execute-draft',
  );
  try {
    const myth = await post(
      app,
      cookie,
      toolPath(TOOL_EXECUTE_ROUTE, 'myth_buster'),
      {
        arguments: { coreIdea: 'x', entityIds: ['claim-one', 'claim-two'] },
        entities: [entity('claim-one', 'claim'), entity('claim-two', 'claim')],
      },
    );
    expect(myth.status).toBe(200);
    const mythResult = toolCallResultSchema.parse(json(myth));
    expect(mythResult.output).toEqual({ kind: 'draft', content: DRAFT_TEXT });
    expect(mythResult.sourcesUsed).toEqual(['claim-one', 'claim-two']);

    const coldOpen = await post(
      app,
      cookie,
      toolPath(TOOL_EXECUTE_ROUTE, 'cold_open'),
      {
        arguments: {
          coreIdea: 'x',
          entityIds: ['grace-hopper'],
          person: 'ada-lovelace',
        },
        entities: [
          entity('grace-hopper', 'person'),
          entity('ada-lovelace', 'person'),
        ],
      },
    );
    expect(coldOpen.status).toBe(200);
    const coldOpenResult = toolCallResultSchema.parse(json(coldOpen));
    expect(coldOpenResult.output).toEqual({
      kind: 'draft',
      content: DRAFT_TEXT,
    });
    expect(coldOpenResult.sourcesUsed).toEqual([
      'grace-hopper',
      'ada-lovelace',
    ]);

    expect(await recordsOf(mock, 'tool-execute-draft')).toHaveLength(2);
  } finally {
    await close();
  }
});

it('X1 a provider failure answers TOOL_MODEL_ERROR with the provider message', async () => {
  const { app, cookie, close } = await openApp(FIXTURE_PACKS, 'unknown-model');
  try {
    const reply = await post(
      app,
      cookie,
      toolPath(TOOL_EXECUTE_ROUTE, 'cold_open'),
      {
        arguments: { coreIdea: 'x', person: 'ada-lovelace' },
        entities: [entity('ada-lovelace', 'person')],
      },
    );
    expect(reply.status).toBe(502);
    const error = errorBodySchema.parse(json(reply)).error;
    expect(error.code).toBe('TOOL_MODEL_ERROR');
    expect(error.message).toBe('The model provider does not know the model.');
  } finally {
    await close();
  }
});
