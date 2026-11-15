import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Module,
  NotFoundException,
  Param,
  Post,
  Query,
  type Type,
} from '@nestjs/common';
import { expect, it } from 'vitest';
import { errorBodySchema } from '@bbartolome/scriba-contracts/platform';
import {
  TOOL_ROUTE,
  TOOL_VALIDATE_ROUTE,
  entityTypeListSchema,
  functionListSchema,
  toolDetailSchema,
  toolListSchema,
  type EntityTypeList,
  type FunctionList,
  type ToolSummary,
} from '@bbartolome/scriba-contracts/tool-registry';
import { PlatformModule } from '../src/modules/platform/platform.module';
import {
  CatalogService,
  ToolRegistryModule,
} from '../src/modules/tool-registry/tool-registry.module';
import { createTestApp, type TestApp } from './create-test-app';
import { send, type Reply } from './guard-request';
import { LOOPBACK_HOST } from './invariant-sweep';

// The loader tests boot the composed route set on fixture packs, with a kit module that calls the exported
// catalog. Every test boots its own app and removes its own temp folders.

// The built-in packs of the fixtures: cold_open is in core, myth_buster in nonfiction, scene_builder in fiction.
const FIXTURE_PACKS = join(__dirname, 'fixtures', 'packs');
const KIT = '/api/tool-registry-test';

// The kit module: plain routes over CatalogService, with no guard. `changes` is the list of the name lists that the
// catalog's onChange listener has seen, one entry per change.
function loaderKitModule(): Type<unknown> {
  @Controller('api/tool-registry-test')
  class LoaderKitController {
    private readonly changes: string[][] = [];

    constructor(private readonly catalog: CatalogService) {
      catalog.onChange((names) => this.changes.push(names));
    }

    @Get('list')
    list(@Query('genrePack') genrePack?: string) {
      return this.catalog.list({ genrePack });
    }

    @Get('functions/:genrePack')
    functions(@Param('genrePack') genrePack: string): FunctionList {
      return this.catalog.functions(genrePack);
    }

    @Post('refresh')
    @HttpCode(200)
    refresh(): string[] {
      return this.catalog.refresh();
    }

    @Get('changes')
    seen(): string[][] {
      return this.changes;
    }

    @Get('entity-types')
    entityTypes(): EntityTypeList {
      return this.catalog.entityTypes();
    }

    // Checks front matter against one kind. The front matter comes back too, to show that the check changed nothing.
    @Post('entity-validate')
    @HttpCode(200)
    entityValidate(@Body() body: { kind: string; frontMatter: unknown }) {
      const check = this.catalog.entityValidator(body.kind);
      if (check === undefined) {
        throw new NotFoundException(`No entity type "${body.kind}".`);
      }
      return { ...check(body.frontMatter), frontMatter: body.frontMatter };
    }
  }

  @Module({
    imports: [ToolRegistryModule],
    controllers: [LoaderKitController],
  })
  class LoaderKitModule {}

  return LoaderKitModule;
}

// A valid tool file: one text port `topic`, one line of description and a block-scalar prompt.
function toolYaml(name: string, description = `The ${name} tool.`): string {
  return [
    'schemaVersion: 1',
    `name: ${name}`,
    `description: ${description}`,
    'inputs:',
    '  type: object',
    '  properties:',
    '    topic:',
    '      type: string',
    '      title: Topic',
    '      x-scriba-type: text',
    '      x-scriba-port: true',
    '  required: [topic]',
    'output: draft',
    'enabled: true',
    'prompt: |',
    '  Write about {{topic}}.',
    '',
  ].join('\n');
}

function fixtureText(pack: string, file: string): string {
  return readFileSync(join(FIXTURE_PACKS, pack, 'tools', file), 'utf8');
}

// The user-pack folder of a library: `<library>/.scriba/packs/user/tools`.
function userFolder(library: string): string {
  return join(library, '.scriba', 'packs', 'user', 'tools');
}

// A fresh library. Its user-pack folder exists unless `withUserFolder` is false. The test removes it.
function newLibrary(withUserFolder = true): string {
  const library = mkdtempSync(join(tmpdir(), 'scriba-loader-'));
  if (withUserFolder) mkdirSync(userFolder(library), { recursive: true });
  return library;
}

function writeUserFile(library: string, file: string, text: string): string {
  const path = join(userFolder(library), file);
  writeFileSync(path, text);
  return path;
}

// Boots the composed tool routes and the kit on the packs root and the library. Both are removed afterwards.
async function withLoader(
  run: (app: TestApp, library: string) => Promise<void>,
  options: {
    packs?: string;
    userFiles?: Record<string, string>;
    withUserFolder?: boolean;
  } = {},
): Promise<void> {
  const library = newLibrary(options.withUserFolder ?? true);
  let app: TestApp | undefined;
  try {
    for (const [file, text] of Object.entries(options.userFiles ?? {})) {
      writeUserFile(library, file, text);
    }
    app = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PACKS_DIR: options.packs ?? FIXTURE_PACKS },
      modules: [PlatformModule, ToolRegistryModule, loaderKitModule()],
    });
    await run(app, library);
  } finally {
    await app?.close();
    rmSync(library, { recursive: true, force: true });
  }
}

function kitGet(app: TestApp, path: string): Promise<Reply> {
  return send(app.baseUrl, { host: LOOPBACK_HOST, path: `${KIT}/${path}` });
}

function kitPost(app: TestApp, path: string, body?: unknown): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    method: 'POST',
    path: `${KIT}/${path}`,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// A claim file whose fields block is `fields`, with the envelope of the claim fixture.
function claimFile(fields: string): string {
  return [
    'schemaVersion: 1',
    'kind: claim',
    'title: Claim',
    'description: A test kind.',
    'folder: entities',
    fields,
    '',
  ].join('\n');
}

function toolGet(app: TestApp, name: string): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    path: TOOL_ROUTE.replace(':name', name),
  });
}

function toolValidate(
  app: TestApp,
  name: string,
  body: unknown,
): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    method: 'POST',
    path: TOOL_VALIDATE_ROUTE.replace(':name', name),
    body: JSON.stringify(body),
  });
}

function json(reply: Reply): unknown {
  return JSON.parse(reply.body);
}

// The rows of a kit list reply, which must be a 200, parsed with the contract's list schema.
async function listRows(app: TestApp, path = 'list'): Promise<ToolSummary[]> {
  const reply = await kitGet(app, path);
  expect(reply.status).toBe(200);
  return toolListSchema.parse(json(reply)).tools;
}

// The rows that carry a name, in the order of the list.
function rowsNamed(rows: ToolSummary[], name: string): ToolSummary[] {
  return rows.filter((row) => row.name === name);
}

// The names of the functions of a kit functions reply, sorted.
async function functionNames(
  app: TestApp,
  genrePack: string,
): Promise<string[]> {
  const reply = await kitGet(app, `functions/${genrePack}`);
  expect(reply.status).toBe(200);
  const list = functionListSchema.parse(json(reply));
  return list.functions.map((fn) => fn.function.name).sort();
}

it('AC1: the list holds core, nonfiction, fiction and user tools; a user copy replaces its built-in and deleting it restores the built-in', async () => {
  await withLoader(
    async (app, library) => {
      const first = await listRows(app);
      for (const [name, origin] of [
        ['cold_open', 'core'],
        ['myth_buster', 'nonfiction'],
        ['scene_builder', 'fiction'],
        ['my_notes', 'user'],
      ] as const) {
        expect(rowsNamed(first, name)).toEqual([
          expect.objectContaining({ origin, valid: true }),
        ]);
      }

      const copy = writeUserFile(
        library,
        'myth_buster.yaml',
        toolYaml('myth_buster', 'My own myth check.'),
      );
      const replaced = await listRows(app);
      expect(rowsNamed(replaced, 'myth_buster')).toEqual([
        expect.objectContaining({
          origin: 'user',
          overrides: 'nonfiction',
          valid: true,
          description: 'My own myth check.',
        }),
      ]);

      rmSync(copy);
      const restored = await listRows(app);
      expect(rowsNamed(restored, 'myth_buster')).toEqual([
        expect.objectContaining({
          origin: 'nonfiction',
          valid: true,
          description:
            'Tests the core idea of a nonfiction chapter against common myths.',
        }),
      ]);
    },
    {
      userFiles: {
        'my_notes.yaml': toolYaml('my_notes', 'Turns my notes into a summary.'),
      },
    },
  );
});

it('AC2: a user file with a newer schemaVersion is listed as refused and the other tools still load', async () => {
  const future = toolYaml('future').replace(
    'schemaVersion: 1',
    'schemaVersion: 2',
  );
  await withLoader(
    async (app, library) => {
      const rows = await listRows(app);
      const refused = rowsNamed(rows, 'future');
      expect(refused).toEqual([
        {
          name: 'future',
          description: '',
          output: null,
          enabled: false,
          origin: 'user',
          valid: false,
          lintCounts: { errors: 0, warnings: 0 },
          error: expect.objectContaining({
            code: 'TOOL_SCHEMA_VERSION_UNSUPPORTED',
          }),
        },
      ]);
      expect(rowsNamed(rows, 'cold_open')).toEqual([
        expect.objectContaining({ origin: 'core', valid: true }),
      ]);
      expect(rowsNamed(rows, 'myth_buster')).toEqual([
        expect.objectContaining({ origin: 'nonfiction', valid: true }),
      ]);

      // The same newer file with an extra top-level key: the version is read before the strict parse.
      writeUserFile(library, 'future.yaml', `${future}futureKey: 1\n`);
      const withKey = await listRows(app);
      expect(rowsNamed(withKey, 'future')).toEqual([
        expect.objectContaining({
          valid: false,
          output: null,
          description: '',
          enabled: false,
          error: expect.objectContaining({
            code: 'TOOL_SCHEMA_VERSION_UNSUPPORTED',
          }),
        }),
      ]);

      const detail = await toolGet(app, 'future');
      expect(detail.status).toBe(200);
      const body = toolDetailSchema.parse(json(detail));
      expect(body.spec).toBeNull();
      expect(body.views).toBeNull();
      expect(body.origin).toBe('user');
    },
    { userFiles: { 'future.yaml': future } },
  );
});

it('AC3: a file added to the user pack after boot appears in the next list; an edit of the same size is seen', async () => {
  await withLoader(async (app, library) => {
    const before = await listRows(app);
    expect(rowsNamed(before, 'extra')).toEqual([]);
    expect((await toolGet(app, 'extra')).status).toBe(404);

    const path = writeUserFile(
      library,
      'extra.yaml',
      toolYaml('extra', 'Gathers extra facts about a scene.'),
    );
    const added = await listRows(app);
    expect(rowsNamed(added, 'extra')).toEqual([
      expect.objectContaining({ origin: 'user', valid: true }),
    ]);
    const detail = await toolGet(app, 'extra');
    expect(detail.status).toBe(200);
    expect(toolDetailSchema.parse(json(detail)).origin).toBe('user');

    // One character changes and the size stays the same; the mtime is set two seconds later.
    const edited = toolYaml('extra', 'Gathers extra facts about a scent.');
    expect(edited.length).toBe(
      toolYaml('extra', 'Gathers extra facts about a scene.').length,
    );
    writeFileSync(path, edited);
    const mtime = statSync(path).mtimeMs / 1000 + 2;
    utimesSync(path, mtime, mtime);
    const seen = await listRows(app);
    expect(rowsNamed(seen, 'extra')).toEqual([
      expect.objectContaining({
        description: 'Gathers extra facts about a scent.',
      }),
    ]);
  });
});

it('AC4: an invalid user copy shows the built-in as effective and beside it an invalid row; an invalid user-only tool is listed, not offered, not callable', async () => {
  const brokenOnly = [
    'schemaVersion: 1',
    'name: broken_only',
    'description: "An unclosed quote',
    'output: draft',
    '',
  ].join('\n');
  await withLoader(
    async (app) => {
      const rows = await listRows(app);
      expect(rowsNamed(rows, 'cold_open')).toEqual([
        expect.objectContaining({ origin: 'core', valid: true }),
        {
          name: 'cold_open',
          description: '',
          output: null,
          enabled: false,
          origin: 'user',
          overrides: 'core',
          valid: false,
          lintCounts: { errors: 0, warnings: 0 },
          error: {
            code: 'TOOL_INVALID',
            message: expect.stringContaining('output'),
          },
        },
      ]);

      const detail = await toolGet(app, 'cold_open');
      expect(detail.status).toBe(200);
      const body = toolDetailSchema.parse(json(detail));
      expect(body.origin).toBe('core');
      expect(body.spec).not.toBeNull();

      const offered = await functionNames(app, 'nonfiction');
      expect(offered).toContain('cold_open');

      const brokenRows = rowsNamed(rows, 'broken_only');
      expect(brokenRows).toEqual([
        expect.objectContaining({
          origin: 'user',
          valid: false,
          error: expect.objectContaining({ code: 'TOOL_INVALID' }),
        }),
      ]);
      expect(await functionNames(app, 'nonfiction')).not.toContain(
        'broken_only',
      );
      const check = await toolValidate(app, 'broken_only', {
        arguments: {},
        mode: 'full',
      });
      expect(check.status).toBe(422);
      expect(errorBodySchema.parse(json(check)).error.code).toBe(
        'TOOL_INVALID',
      );
    },
    {
      userFiles: {
        'cold_open.yaml': fixtureText('core', 'cold_open.yaml').replace(
          'output: draft',
          'output: summary',
        ),
        'broken_only.yaml': brokenOnly,
      },
    },
  );
});

it('AC6: a nonfiction project is offered core, nonfiction and user tools only', async () => {
  await withLoader(
    async (app) => {
      expect(await functionNames(app, 'nonfiction')).toEqual(
        ['cold_open', 'my_notes', 'myth_buster'].sort(),
      );
      const fiction = await functionNames(app, 'fiction');
      expect(fiction).toContain('scene_builder');
      expect(fiction).not.toContain('myth_buster');

      const rows = await listRows(app, 'list?genrePack=nonfiction');
      const origins = new Set(rows.map((row) => row.origin));
      for (const origin of origins) {
        expect(['core', 'nonfiction', 'user']).toContain(origin);
      }
      expect(rows.map((row) => row.name)).not.toContain('scene_builder');
    },
    {
      userFiles: {
        'my_notes.yaml': toolYaml('my_notes', 'Turns my notes into a summary.'),
      },
    },
  );
});

it('E1: a tool name in two built-in packs stops boot, and the message names the tool and both packs', async () => {
  const packs = mkdtempSync(join(tmpdir(), 'scriba-loader-packs-'));
  try {
    for (const pack of ['core', 'fiction']) {
      mkdirSync(join(packs, pack, 'tools'), { recursive: true });
      writeFileSync(join(packs, pack, 'tools', 'dup.yaml'), toolYaml('dup'));
    }
    const library = newLibrary();
    try {
      const boot = createTestApp({
        libraryDir: library,
        env: { SCRIBA_PACKS_DIR: packs },
        modules: [PlatformModule, ToolRegistryModule],
      });
      await expect(boot).rejects.toThrow(/dup/);
      await expect(boot).rejects.toThrow(/core/);
      await expect(boot).rejects.toThrow(/fiction/);
    } finally {
      rmSync(library, { recursive: true, force: true });
    }
  } finally {
    rmSync(packs, { recursive: true, force: true });
  }
});

it('E2: a built-in tool file that does not parse, or is newer, is listed invalid and the app boots', async () => {
  const packs = mkdtempSync(join(tmpdir(), 'scriba-loader-packs-'));
  try {
    mkdirSync(join(packs, 'core', 'tools'), { recursive: true });
    mkdirSync(join(packs, 'fiction', 'tools'), { recursive: true });
    writeFileSync(join(packs, 'core', 'tools', 'good.yaml'), toolYaml('good'));
    writeFileSync(
      join(packs, 'core', 'tools', 'bad.yaml'),
      'schemaVersion: 1\nname: bad\ndescription: "unclosed\n',
    );
    writeFileSync(
      join(packs, 'fiction', 'tools', 'later.yaml'),
      toolYaml('later').replace('schemaVersion: 1', 'schemaVersion: 2'),
    );
    await withLoader(
      async (app) => {
        const rows = await listRows(app);
        expect(rowsNamed(rows, 'good')).toEqual([
          expect.objectContaining({ origin: 'core', valid: true }),
        ]);
        expect(rowsNamed(rows, 'bad')).toEqual([
          expect.objectContaining({
            origin: 'core',
            valid: false,
            error: expect.objectContaining({ code: 'TOOL_INVALID' }),
          }),
        ]);
        expect(rowsNamed(rows, 'later')).toEqual([
          expect.objectContaining({
            origin: 'fiction',
            valid: false,
            error: expect.objectContaining({
              code: 'TOOL_SCHEMA_VERSION_UNSUPPORTED',
            }),
          }),
        ]);
        expect(await functionNames(app, 'fiction')).toEqual(['good']);
      },
      { packs },
    );
  } finally {
    rmSync(packs, { recursive: true, force: true });
  }
});

it('E3: a missing packs root and missing pack folders are empty packs, not errors', async () => {
  const packs = mkdtempSync(join(tmpdir(), 'scriba-loader-packs-'));
  try {
    mkdirSync(join(packs, 'core', 'tools'), { recursive: true });
    writeFileSync(join(packs, 'core', 'tools', 'good.yaml'), toolYaml('good'));
    await withLoader(
      async (app) => {
        const rows = await listRows(app);
        expect(rows).toEqual([
          expect.objectContaining({
            name: 'good',
            origin: 'core',
            valid: true,
          }),
        ]);
      },
      { packs },
    );
  } finally {
    rmSync(packs, { recursive: true, force: true });
  }
  // A packs root that does not exist at all: the built-in packs are empty and the user pack still loads.
  await withLoader(
    async (app) => {
      expect(await listRows(app)).toEqual([]);
    },
    { packs: join(tmpdir(), 'scriba-no-such-packs-root') },
  );
});

it('E4: GET never writes to the library', async () => {
  await withLoader(
    async (app, library) => {
      expect((await toolGet(app, 'cold_open')).status).toBe(200);
      expect((await toolGet(app, 'no-such-tool')).status).toBe(404);
      await listRows(app);
      expect(existsSync(join(library, '.scriba', 'packs'))).toBe(false);
    },
    { withUserFolder: false },
  );
});

it('E5: a user file whose YAML name differs from its stem is invalid, under the stem', async () => {
  await withLoader(
    async (app) => {
      const rows = await listRows(app);
      expect(rowsNamed(rows, 'a_tool')).toEqual([
        expect.objectContaining({
          origin: 'user',
          valid: false,
          error: expect.objectContaining({ code: 'TOOL_INVALID' }),
        }),
      ]);
      expect(rowsNamed(rows, 'other_tool')).toEqual([]);
    },
    { userFiles: { 'a_tool.yaml': toolYaml('other_tool') } },
  );
});

it('E7: refresh returns the changed names once, and the onChange listener runs once per change', async () => {
  await withLoader(async (app, library) => {
    expect(await kitGet(app, 'changes').then((r) => json(r))).toEqual([]);

    writeUserFile(library, 'extra.yaml', toolYaml('extra'));
    const first = await kitPost(app, 'refresh');
    expect(first.status).toBe(200);
    expect(json(first)).toEqual(['extra']);
    expect(await kitGet(app, 'changes').then((r) => json(r))).toEqual([
      ['extra'],
    ]);

    const second = await kitPost(app, 'refresh');
    expect(json(second)).toEqual([]);
    expect(await kitGet(app, 'changes').then((r) => json(r))).toEqual([
      ['extra'],
    ]);
  });
});

it('AC5: the claim entity type loads; its validator accepts a valid front matter and rejects a bad evidence item', async () => {
  const frontMatter = {
    statement: 'Ada wrote the first program.',
    status: 'supported',
    evidence: [{ source: 'Lovelace 1843', pages: 12 }, { source: 'Notes G' }],
    aliases: ['Ada'],
  };
  await withLoader(async (app) => {
    const types = await kitGet(app, 'entity-types');
    expect(types.status).toBe(200);
    const kinds = entityTypeListSchema
      .parse(json(types))
      .entityTypes.map((type) => type.kind);
    expect(kinds).toContain('claim');

    const valid = await kitPost(app, 'entity-validate', {
      kind: 'claim',
      frontMatter,
    });
    expect(valid.status).toBe(200);
    expect(json(valid)).toEqual({
      valid: true,
      issues: [],
      frontMatter,
    });

    const extraKey = await kitPost(app, 'entity-validate', {
      kind: 'claim',
      frontMatter: {
        statement: 'A claim.',
        evidence: [{ source: 'Notes', note: 'an extra key' }],
      },
    });
    expect(json(extraKey)).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: '/evidence/0' }),
      ]),
    });

    const noSource = await kitPost(app, 'entity-validate', {
      kind: 'claim',
      frontMatter: {
        statement: 'A claim.',
        evidence: [{ source: 'Notes' }, { pages: 2 }],
      },
    });
    expect(json(noSource)).toMatchObject({
      valid: false,
      issues: [expect.objectContaining({ path: '/evidence/1' })],
    });
  });
});

it('E6: a two-level object, a list item without additionalProperties false, or an object field stops boot, and the message names the file', async () => {
  const refused = [
    // A list item that holds an object: two levels.
    claimFile(
      'fields: {type: object, properties: {evidence: {type: array, items: {type: object, properties: {source: {type: object, properties: {title: {type: string}}}}, additionalProperties: false}}}}',
    ),
    // A list item that does not declare additionalProperties: false.
    claimFile(
      'fields: {type: object, properties: {evidence: {type: array, items: {type: object, properties: {source: {type: string}}}}}}',
    ),
    // An object field at the top of the fields.
    claimFile(
      'fields: {type: object, properties: {meta: {type: object, properties: {title: {type: string}}}}}',
    ),
  ];
  for (const text of refused) {
    const packs = mkdtempSync(join(tmpdir(), 'scriba-loader-packs-'));
    const library = newLibrary();
    try {
      mkdirSync(join(packs, 'nonfiction', 'entity-types'), { recursive: true });
      writeFileSync(
        join(packs, 'nonfiction', 'entity-types', 'claim.yaml'),
        text,
      );
      const boot = createTestApp({
        libraryDir: library,
        env: { SCRIBA_PACKS_DIR: packs },
        modules: [PlatformModule, ToolRegistryModule],
      });
      await expect(boot).rejects.toThrow(/claim\.yaml/);
    } finally {
      rmSync(library, { recursive: true, force: true });
      rmSync(packs, { recursive: true, force: true });
    }
  }
});
