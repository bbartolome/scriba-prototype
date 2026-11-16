import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { errorBodySchema } from '@bbartolome/scriba-contracts/platform';
import {
  LINT_ROUTE,
  TOOLS_ROUTE,
  TOOL_DELETE_ROUTE,
  TOOL_ENABLED_ROUTE,
  TOOL_ROUTE,
  TOOL_SAVE_ROUTE,
  lintResponseSchema,
  toolDetailSchema,
  toolListSchema,
  toolRegistryEventSchema,
  toolSpecLintFailedDetailsSchema,
  type ToolSummary,
} from '@bbartolome/scriba-contracts/tool-registry';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import {
  LOOPBACK_HOST,
  LOOPBACK_ORIGIN,
  observeEvents,
  snapshotLibrary,
  type Observer,
} from './invariant-sweep';
import { makeLibrary } from './settings.kit';
import { dataOf } from './sse';

// The fixture packs. Each test edits only its own copy of them, never these files.
const FIXTURE_PACKS = join(__dirname, 'fixtures', 'packs');
const COLD_OPEN_FILE = join('core', 'tools', 'cold_open.yaml');
const ORIGINAL_DESCRIPTION =
  'Drafts the cold open of a chapter from its core idea.';

// The temp library and the copy of the fixture packs, which each test removes in a finally.
interface Fixture {
  library: string;
  packsRoot: string;
  packs: string; // the packs root the app reads, SCRIBA_PACKS_DIR
}

function makeFixture(): Fixture {
  const library = makeLibrary();
  const packsRoot = mkdtempSync(join(tmpdir(), 'scriba-tool-packs-'));
  const packs = join(packsRoot, 'packs');
  cpSync(FIXTURE_PACKS, packs, { recursive: true });
  return { library, packsRoot, packs };
}

function removeFixture(fixture: Fixture): void {
  rmSync(fixture.library, { recursive: true, force: true });
  rmSync(fixture.packsRoot, { recursive: true, force: true });
}

// One boot of the app on the fixture, with its session cookie. The caller closes the app.
interface Booted {
  app: TestApp;
  cookie: string;
}

async function boot(fixture: Fixture): Promise<Booted> {
  const app = await createTestApp({
    libraryDir: fixture.library,
    env: { SCRIBA_PACKS_DIR: fixture.packs },
  });
  try {
    return { app, cookie: await sessionCookie(app, fixture.library) };
  } catch (error) {
    await app.close();
    throw error;
  }
}

function get(booted: Booted, path: string): Promise<Reply> {
  return send(booted.app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie: booted.cookie,
    path,
  });
}

// One command: a POST with a JSON body and the loopback Origin the guard requires.
function post(booted: Booted, path: string, body: unknown): Promise<Reply> {
  return send(booted.app.baseUrl, {
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie: booted.cookie,
    method: 'POST',
    path,
    body: JSON.stringify(body),
  });
}

// A POST with no body, as the delete command is sent.
function postEmpty(booted: Booted, path: string): Promise<Reply> {
  return send(booted.app.baseUrl, {
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie: booted.cookie,
    method: 'POST',
    path,
  });
}

function toolPath(template: string, name: string): string {
  return template.replace(':name', name);
}

function json(reply: Reply): unknown {
  return JSON.parse(reply.body);
}

// The row of a tool in the list, or undefined when the list has none.
async function rowOf(
  booted: Booted,
  name: string,
): Promise<ToolSummary | undefined> {
  const reply = await get(booted, TOOLS_ROUTE);
  return toolListSchema
    .parse(json(reply))
    .tools.find((row) => row.name === name);
}

// The user copy path of a tool in the library.
function userFileOf(library: string, name: string): string {
  return join(library, '.scriba', 'packs', 'user', 'tools', `${name}.yaml`);
}

// The built-in cold_open file, with its description replaced. It stays a valid tool file.
function coldOpenWith(description: string): string {
  return coldOpenSource().replace(
    `description: ${ORIGINAL_DESCRIPTION}`,
    `description: ${description}`,
  );
}

// The source of the built-in cold_open file as it is on disk.
function coldOpenSource(): string {
  return readFileSync(join(FIXTURE_PACKS, COLD_OPEN_FILE), 'utf8');
}

// The 1-based line of the first source line that holds the text.
function lineOf(source: string, text: string): number {
  const index = source.split('\n').findIndex((line) => line.includes(text));
  if (index === -1) throw new Error(`no line holds ${JSON.stringify(text)}`);
  return index + 1;
}

// The tool-registry events the observer received since its last call, parsed. The wait lets a published event arrive.
async function eventsSince(observer: Observer): Promise<unknown[]> {
  const blocks = await observer.take(300);
  return blocks.map((block) =>
    toolRegistryEventSchema.parse(JSON.parse(dataOf(block))),
  );
}

it('C1: save on a built-in writes the user-pack file and never touches the packs root', async () => {
  const fixture = makeFixture();
  let booted: Booted | undefined;
  try {
    booted = await boot(fixture);
    const packsBefore = snapshotLibrary(fixture.packs);
    const source = coldOpenWith('Saved as a copy.');

    const reply = await post(booted, toolPath(TOOL_SAVE_ROUTE, 'cold_open'), {
      source,
    });
    expect(reply.status).toBe(200);
    const detail = toolDetailSchema.parse(json(reply));
    expect(detail.origin).toBe('user');
    expect(detail.spec?.description).toBe('Saved as a copy.');

    const file = userFileOf(fixture.library, 'cold_open');
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf8')).toBe(source);
    expect(snapshotLibrary(fixture.packs)).toEqual(packsBefore);

    const row = await rowOf(booted, 'cold_open');
    expect(row?.origin).toBe('user');
    expect(row?.overrides).toBe('core');
  } finally {
    await booted?.app.close();
    removeFixture(fixture);
  }
});

it.each([
  {
    name: 'hint-unknown',
    rule: 'hint-unknown',
    // An unknown x-scriba key under coreIdea, after its x-scriba-control line.
    source: coldOpenSource().replace(
      '      x-scriba-control: textarea\n',
      '      x-scriba-control: textarea\n      x-scriba-colour: red\n',
    ),
    faultText: 'x-scriba-colour: red',
  },
  {
    name: 'template-variable',
    rule: 'template-variable',
    // A template variable at the end of the prompt, which is not an input.
    source: `${coldOpenSource()}  {{missing}}\n`,
    faultText: '{{missing}}',
  },
  {
    name: 'inputs-subset',
    rule: 'inputs-subset',
    // A keyword outside the subset under tone, at the indent of tone's keywords.
    source: coldOpenSource().replace(
      '      enum: [warm, dry]\n',
      '      enum: [warm, dry]\n      oneOf: []\n',
    ),
    faultText: 'oneOf: []',
  },
])(
  'C2 ($name): saving YAML with an unknown x-scriba-* key, a template variable that is not an input, or an out-of-subset keyword returns 422 with line-numbered diagnostics and writes no file',
  async ({ rule, source, faultText }) => {
    const fixture = makeFixture();
    let booted: Booted | undefined;
    try {
      booted = await boot(fixture);
      const libraryBefore = snapshotLibrary(fixture.library);

      const reply = await post(booted, toolPath(TOOL_SAVE_ROUTE, 'cold_open'), {
        source,
      });
      expect(reply.status).toBe(422);
      const error = errorBodySchema.parse(json(reply)).error;
      expect(error.code).toBe('TOOL_SPEC_LINT_FAILED');
      const details = toolSpecLintFailedDetailsSchema.parse(error.details);

      const expectedLine = lineOf(source, faultText);
      const diagnostic = details.lint.find(
        (item) => item.severity === 'error' && item.rule === rule,
      );
      expect(diagnostic).toBeDefined();
      expect(diagnostic?.line).toBe(expectedLine);
      expect(diagnostic?.column).toBeGreaterThanOrEqual(1);

      expect(existsSync(userFileOf(fixture.library, 'cold_open'))).toBe(false);
      expect(snapshotLibrary(fixture.library)).toEqual(libraryBefore);
    } finally {
      await booted?.app.close();
      removeFixture(fixture);
    }
  },
);

it('C3: delete of a user copy restores the built-in; delete of a plain built-in returns TOOL_BUILTIN_READONLY', async () => {
  const fixture = makeFixture();
  let booted: Booted | undefined;
  try {
    booted = await boot(fixture);
    const saved = await post(booted, toolPath(TOOL_SAVE_ROUTE, 'cold_open'), {
      source: coldOpenWith('Saved as a copy.'),
    });
    expect(saved.status).toBe(200);

    const deleted = await postEmpty(
      booted,
      toolPath(TOOL_DELETE_ROUTE, 'cold_open'),
    );
    expect(deleted.status).toBe(200);
    expect(deleted.body).toBe('');
    expect(existsSync(userFileOf(fixture.library, 'cold_open'))).toBe(false);

    const restored = toolDetailSchema.parse(
      json(await get(booted, toolPath(TOOL_ROUTE, 'cold_open'))),
    );
    expect(restored.origin).toBe('core');
    expect(restored.spec?.description).toBe(ORIGINAL_DESCRIPTION);

    const packsBefore = snapshotLibrary(fixture.packs);
    const readonly = await postEmpty(
      booted,
      toolPath(TOOL_DELETE_ROUTE, 'myth_buster'),
    );
    expect(readonly.status).toBe(409);
    expect(errorBodySchema.parse(json(readonly)).error.code).toBe(
      'TOOL_BUILTIN_READONLY',
    );
    expect(snapshotLibrary(fixture.packs)).toEqual(packsBefore);
  } finally {
    await booted?.app.close();
    removeFixture(fixture);
  }
});

it('C4: catalog-changed arrives on /events after save, delete, toggle and a host-side file add', async () => {
  const fixture = makeFixture();
  let booted: Booted | undefined;
  let observer: Observer | undefined;
  try {
    booted = await boot(fixture);
    // Opens GET /events with the loopback Host and the cookie, and consumes the observer's own hello.
    observer = await observeEvents(
      booted.app.baseUrl,
      LOOPBACK_HOST,
      booted.cookie,
    );
    const changed = (...names: string[]): unknown[] => [
      {
        module: 'tool-registry',
        type: 'catalog-changed',
        data: { names },
      },
    ];

    const saved = await post(booted, toolPath(TOOL_SAVE_ROUTE, 'cold_open'), {
      source: coldOpenWith('Changed on save.'),
    });
    expect(saved.status).toBe(200);
    expect(await eventsSince(observer)).toEqual(changed('cold_open'));

    const deleted = await postEmpty(
      booted,
      toolPath(TOOL_DELETE_ROUTE, 'cold_open'),
    );
    expect(deleted.status).toBe(200);
    expect(await eventsSince(observer)).toEqual(changed('cold_open'));

    const toggled = await post(
      booted,
      toolPath(TOOL_ENABLED_ROUTE, 'cold_open'),
      { enabled: false },
    );
    expect(toggled.status).toBe(200);
    expect(await eventsSince(observer)).toEqual(changed('cold_open'));

    // A file the host adds to the user pack, found by the re-scan at the next list.
    const userFolder = join(
      fixture.library,
      '.scriba',
      'packs',
      'user',
      'tools',
    );
    mkdirSync(userFolder, { recursive: true });
    writeFileSync(
      join(userFolder, 'extra.yaml'),
      coldOpenSource().replace('name: cold_open', 'name: extra'),
    );
    const listed = await get(booted, TOOLS_ROUTE);
    expect(listed.status).toBe(200);
    expect(await eventsSince(observer)).toEqual(changed('extra'));
  } finally {
    await observer?.close();
    await booted?.app.close();
    removeFixture(fixture);
  }
});

it('C5: lint writes nothing and returns views for valid YAML', async () => {
  const fixture = makeFixture();
  let booted: Booted | undefined;
  try {
    booted = await boot(fixture);
    const libraryBefore = snapshotLibrary(fixture.library);
    const packsBefore = snapshotLibrary(fixture.packs);

    const valid = await post(booted, LINT_ROUTE, {
      source: coldOpenSource(),
    });
    expect(valid.status).toBe(200);
    const validBody = lintResponseSchema.parse(json(valid));
    expect(validBody.views).not.toBeNull();
    expect(validBody.views).toHaveProperty('functionSchema');
    expect(validBody.views).toHaveProperty('form');
    expect(validBody.views).toHaveProperty('ports');
    expect(validBody.lint.some((item) => item.severity === 'error')).toBe(
      false,
    );

    const broken = await post(booted, LINT_ROUTE, {
      source: coldOpenSource().replace(
        '      x-scriba-control: textarea\n',
        '      x-scriba-control: textarea\n      x-scriba-colour: red\n',
      ),
    });
    expect(broken.status).toBe(200);
    const brokenBody = lintResponseSchema.parse(json(broken));
    expect(brokenBody.views).toBeNull();
    expect(brokenBody.lint.some((item) => item.severity === 'error')).toBe(
      true,
    );

    expect(snapshotLibrary(fixture.library)).toEqual(libraryBefore);
    expect(snapshotLibrary(fixture.packs)).toEqual(packsBefore);
  } finally {
    await booted?.app.close();
    removeFixture(fixture);
  }
});

it('X1: a source with warnings saves, and the detail keeps its warnings', async () => {
  const fixture = makeFixture();
  let booted: Booted | undefined;
  try {
    booted = await boot(fixture);
    const reply = await post(booted, toolPath(TOOL_SAVE_ROUTE, 'cold_open'), {
      source: coldOpenWith('Saved with warnings.'),
    });
    expect(reply.status).toBe(200);
    const detail = toolDetailSchema.parse(json(reply));
    expect(
      detail.lint.filter((item) => item.severity === 'error'),
    ).toHaveLength(0);
    expect(
      detail.lint.filter((item) => item.severity === 'warning'),
    ).toHaveLength(3);

    const row = await rowOf(booted, 'cold_open');
    expect(row?.lintCounts).toEqual({ errors: 0, warnings: 3 });
  } finally {
    await booted?.app.close();
    removeFixture(fixture);
  }
});

it('X2: save refuses a YAML name that differs from the route name, and a route name that is not a tool name, and writes nothing', async () => {
  const fixture = makeFixture();
  let booted: Booted | undefined;
  try {
    booted = await boot(fixture);
    const libraryBefore = snapshotLibrary(fixture.library);

    const mismatch = await post(booted, toolPath(TOOL_SAVE_ROUTE, 'extra'), {
      source: coldOpenSource(),
    });
    expect(mismatch.status).toBe(422);
    const details = toolSpecLintFailedDetailsSchema.parse(
      errorBodySchema.parse(json(mismatch)).error.details,
    );
    expect(
      details.lint.some(
        (item) => item.severity === 'error' && item.rule === 'file-name',
      ),
    ).toBe(true);
    expect(existsSync(userFileOf(fixture.library, 'extra'))).toBe(false);

    const badName = await post(
      booted,
      '/api/tool-registry/tools/..%2Fescape/save',
      { source: coldOpenSource() },
    );
    expect(badName.status).toBe(404);
    expect(errorBodySchema.parse(json(badName)).error.code).toBe(
      'TOOL_NOT_FOUND',
    );
    expect(snapshotLibrary(fixture.library)).toEqual(libraryBefore);
  } finally {
    await booted?.app.close();
    removeFixture(fixture);
  }
});

it('X3: lint with a name reports file-name and returns null views', async () => {
  const fixture = makeFixture();
  let booted: Booted | undefined;
  try {
    booted = await boot(fixture);
    const reply = await post(booted, LINT_ROUTE, {
      source: coldOpenSource(),
      name: 'extra',
    });
    expect(reply.status).toBe(200);
    const body = lintResponseSchema.parse(json(reply));
    expect(
      body.lint.some(
        (item) => item.severity === 'error' && item.rule === 'file-name',
      ),
    ).toBe(true);
    expect(body.views).toBeNull();
  } finally {
    await booted?.app.close();
    removeFixture(fixture);
  }
});

it('X4: delete of a user-only tool removes it, and delete of an unknown name is TOOL_NOT_FOUND', async () => {
  const fixture = makeFixture();
  let booted: Booted | undefined;
  try {
    booted = await boot(fixture);
    const userFolder = join(
      fixture.library,
      '.scriba',
      'packs',
      'user',
      'tools',
    );
    mkdirSync(userFolder, { recursive: true });
    writeFileSync(
      join(userFolder, 'extra.yaml'),
      coldOpenSource().replace('name: cold_open', 'name: extra'),
    );

    const detail = toolDetailSchema.parse(
      json(await get(booted, toolPath(TOOL_ROUTE, 'extra'))),
    );
    expect(detail.origin).toBe('user');

    const deleted = await postEmpty(
      booted,
      toolPath(TOOL_DELETE_ROUTE, 'extra'),
    );
    expect(deleted.status).toBe(200);
    expect(deleted.body).toBe('');

    const gone = await get(booted, toolPath(TOOL_ROUTE, 'extra'));
    expect(gone.status).toBe(404);
    expect(errorBodySchema.parse(json(gone)).error.code).toBe('TOOL_NOT_FOUND');
    expect(await rowOf(booted, 'extra')).toBeUndefined();

    const unknown = await postEmpty(
      booted,
      toolPath(TOOL_DELETE_ROUTE, 'no-such-tool'),
    );
    expect(unknown.status).toBe(404);
    expect(errorBodySchema.parse(json(unknown)).error.code).toBe(
      'TOOL_NOT_FOUND',
    );
  } finally {
    await booted?.app.close();
    removeFixture(fixture);
  }
});
