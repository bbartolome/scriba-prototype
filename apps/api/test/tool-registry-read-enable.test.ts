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
import { parse } from 'yaml';
import {
  ACTIVE_PROJECT_ROUTE,
  PROJECT_NEW_ROUTE,
} from '@bbartolome/scriba-contracts/project-store';
import { errorBodySchema } from '@bbartolome/scriba-contracts/platform';
import {
  ENTITY_TYPES_ROUTE,
  FUNCTIONS_ROUTE,
  TOOLS_ROUTE,
  TOOL_BUILTIN_ROUTE,
  TOOL_ENABLED_ROUTE,
  TOOL_ROUTE,
  TOOL_USER_ROUTE,
  TOOL_VALIDATE_ROUTE,
  functionListSchema,
  toolArgsInvalidDetailsSchema,
  toolDetailSchema,
  toolListSchema,
  toolSummarySchema,
  toolValidateResultSchema,
  type ToolSummary,
} from '@bbartolome/scriba-contracts/tool-registry';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import {
  LOOPBACK_HOST,
  LOOPBACK_ORIGIN,
  snapshotLibrary,
  type Snapshot,
} from './invariant-sweep';
import { makeLibrary } from './settings.kit';

// The fixture packs. Each test edits only its own copy of them, never these files.
const FIXTURE_PACKS = join(__dirname, 'fixtures', 'packs');
const COLD_OPEN = join('core', 'tools', 'cold_open.yaml');
const ORIGINAL_DESCRIPTION =
  'Drafts the cold open of a chapter from its core idea.';
const UPDATED_DESCRIPTION = 'Drafted again after a built-in update.';

// The temp library and the copy of the fixture packs, which the test removes in a finally.
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

function toolPath(template: string, name: string): string {
  return template.replace(':name', name);
}

function json(reply: Reply): unknown {
  return JSON.parse(reply.body);
}

// The names of the functions in a function list reply.
function functionNames(reply: Reply): string[] {
  return functionListSchema
    .parse(json(reply))
    .functions.map((entry) => entry.function.name);
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

function settingsOf(library: string): Record<string, unknown> {
  const text = readFileSync(join(library, '.scriba', 'settings.yaml'), 'utf8');
  return parse(text) as Record<string, unknown>;
}

function withoutTools(
  settings: Record<string, unknown>,
): Record<string, unknown> {
  const copy = { ...settings };
  delete copy.tools;
  return copy;
}

// The paths whose fingerprint differs between two snapshots, added and removed ones included, sorted.
function changedPaths(before: Snapshot, after: Snapshot): string[] {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths]
    .filter((path) => before.get(path) !== after.get(path))
    .sort();
}

// The built-in cold_open file, with its description replaced. It stays a valid tool file.
function coldOpenWith(description: string): string {
  const text = readFileSync(join(FIXTURE_PACKS, COLD_OPEN), 'utf8');
  return text.replace(
    `description: ${ORIGINAL_DESCRIPTION}`,
    `description: ${description}`,
  );
}

it('T1: a disabled tool stays out of functions after a restart and after a built-in update', async () => {
  const fixture = makeFixture();
  try {
    // Boot A: cold_open is offered, then switched off.
    const a = await boot(fixture);
    try {
      expect(functionNames(await get(a, FUNCTIONS_ROUTE))).toContain(
        'cold_open',
      );
      const off = await post(a, toolPath(TOOL_ENABLED_ROUTE, 'cold_open'), {
        enabled: false,
      });
      expect(off.status).toBe(200);
      expect(toolSummarySchema.parse(json(off))).toMatchObject({
        name: 'cold_open',
        enabled: false,
      });
      expect(functionNames(await get(a, FUNCTIONS_ROUTE))).not.toContain(
        'cold_open',
      );
    } finally {
      await a.app.close();
    }

    // Boot B, on the same library: the switch survives the restart.
    const b = await boot(fixture);
    try {
      expect(functionNames(await get(b, FUNCTIONS_ROUTE))).not.toContain(
        'cold_open',
      );
      expect(await rowOf(b, 'cold_open')).toMatchObject({ enabled: false });
    } finally {
      await b.app.close();
    }

    // Boot C, after the copy's cold_open is replaced by a new file: a built-in update. The file is read again, and
    // the switch, keyed by name, still removes the tool.
    writeFileSync(
      join(fixture.packs, COLD_OPEN),
      coldOpenWith(UPDATED_DESCRIPTION),
    );
    const c = await boot(fixture);
    try {
      const detail = toolDetailSchema.parse(
        json(await get(c, toolPath(TOOL_ROUTE, 'cold_open'))),
      );
      expect(detail.spec?.description).toBe(UPDATED_DESCRIPTION);
      expect(functionNames(await get(c, FUNCTIONS_ROUTE))).not.toContain(
        'cold_open',
      );
    } finally {
      await c.app.close();
    }
  } finally {
    removeFixture(fixture);
  }
});

it('T2: a toggle writes only the tools section and no user-pack file', async () => {
  const fixture = makeFixture();
  try {
    const booted = await boot(fixture);
    try {
      const libraryBefore = snapshotLibrary(fixture.library);
      const packsBefore = snapshotLibrary(fixture.packs);
      const settingsBefore = settingsOf(fixture.library);
      expect(settingsBefore.tools).toBeUndefined();

      const off = await post(
        booted,
        toolPath(TOOL_ENABLED_ROUTE, 'cold_open'),
        {
          enabled: false,
        },
      );
      expect(off.status).toBe(200);

      const settingsOff = settingsOf(fixture.library);
      expect(settingsOff.tools).toEqual({
        schemaVersion: 1,
        enabled: { cold_open: false },
      });
      expect(withoutTools(settingsOff)).toEqual(withoutTools(settingsBefore));
      expect(
        changedPaths(libraryBefore, snapshotLibrary(fixture.library)),
      ).toEqual(['.scriba/settings.yaml']);
      expect(snapshotLibrary(fixture.packs)).toEqual(packsBefore);
      expect(existsSync(join(fixture.library, '.scriba', 'packs'))).toBe(false);

      // Back on: the value is the spec's default, so the override is removed (C1).
      const on = await post(booted, toolPath(TOOL_ENABLED_ROUTE, 'cold_open'), {
        enabled: true,
      });
      expect(on.status).toBe(200);
      expect(settingsOf(fixture.library).tools).toEqual({
        schemaVersion: 1,
        enabled: {},
      });
      expect(withoutTools(settingsOf(fixture.library))).toEqual(
        withoutTools(settingsBefore),
      );
      expect(existsSync(join(fixture.library, '.scriba', 'packs'))).toBe(false);
    } finally {
      await booted.app.close();
    }
  } finally {
    removeFixture(fixture);
  }
});

it('T4: the GET routes change neither the library nor the packs', async () => {
  const fixture = makeFixture();
  try {
    // A valid user copy of cold_open, so the user path is read.
    const userTools = join(
      fixture.library,
      '.scriba',
      'packs',
      'user',
      'tools',
    );
    mkdirSync(userTools, { recursive: true });
    writeFileSync(
      join(userTools, 'cold_open.yaml'),
      coldOpenWith(UPDATED_DESCRIPTION),
    );

    const booted = await boot(fixture);
    try {
      const libraryBefore = snapshotLibrary(fixture.library);
      const packsBefore = snapshotLibrary(fixture.packs);

      const paths = [
        TOOLS_ROUTE,
        `${TOOLS_ROUTE}?genrePack=nonfiction`,
        toolPath(TOOL_ROUTE, 'cold_open'),
        toolPath(TOOL_BUILTIN_ROUTE, 'cold_open'),
        toolPath(TOOL_USER_ROUTE, 'cold_open'),
        FUNCTIONS_ROUTE,
        ENTITY_TYPES_ROUTE,
      ];
      for (const path of paths) {
        expect((await get(booted, path)).status, path).toBe(200);
      }

      // The user path is the user copy, so the read reached it.
      const user = toolDetailSchema.parse(
        json(await get(booted, toolPath(TOOL_USER_ROUTE, 'cold_open'))),
      );
      expect(user.origin).toBe('user');
      expect(user.spec?.description).toBe(UPDATED_DESCRIPTION);

      expect(snapshotLibrary(fixture.library)).toEqual(libraryBefore);
      expect(snapshotLibrary(fixture.packs)).toEqual(packsBefore);
    } finally {
      await booted.app.close();
    }
  } finally {
    removeFixture(fixture);
  }
});

it('E1: functions follow the active project genre pack and the switch', async () => {
  const fixture = makeFixture();
  try {
    const booted = await boot(fixture);
    try {
      // No active project: core and the user pack only.
      const none = functionNames(await get(booted, FUNCTIONS_ROUTE));
      expect(none).toContain('cold_open');
      expect(none).not.toContain('myth_buster');
      expect(none).not.toContain('scene_builder');

      const created = await post(booted, PROJECT_NEW_ROUTE, {
        title: 'Switch check',
        genrePack: 'nonfiction',
      });
      expect(created.status).toBe(201);
      const { id } = json(created) as { id: string };
      const activated = await post(booted, ACTIVE_PROJECT_ROUTE, {
        projectId: id,
      });
      expect(activated.status).toBe(200);

      // The active project is nonfiction: its pack is offered, fiction's is not.
      const offered = functionNames(await get(booted, FUNCTIONS_ROUTE));
      expect(offered).toContain('cold_open');
      expect(offered).toContain('myth_buster');
      expect(offered).not.toContain('scene_builder');

      // A switch removes the tool from the functions, and no other.
      const off = await post(
        booted,
        toolPath(TOOL_ENABLED_ROUTE, 'myth_buster'),
        {
          enabled: false,
        },
      );
      expect(off.status).toBe(200);
      const afterSwitch = functionNames(await get(booted, FUNCTIONS_ROUTE));
      expect(afterSwitch).not.toContain('myth_buster');
      expect(afterSwitch).toContain('cold_open');
    } finally {
      await booted.app.close();
    }
  } finally {
    removeFixture(fixture);
  }
});

it('T3: params mode ignores pinned port values and required ports', async () => {
  const fixture = makeFixture();
  try {
    const booted = await boot(fixture);
    try {
      // The pinned style value is not an entity ID, and the required ports are absent: params mode drops the port
      // keys before validation, so none of them is checked.
      const params = await post(
        booted,
        toolPath(TOOL_VALIDATE_ROUTE, 'cold_open'),
        {
          arguments: { length: 900, styleProfile: 'Not A Ref!!' },
          mode: 'params',
        },
      );
      expect(params.status).toBe(200);
      expect(toolValidateResultSchema.parse(json(params)).arguments).toEqual({
        length: 900,
      });

      // The same pinned value in full mode, with both required ports supplied, is refused at its own path only.
      const full = await post(
        booted,
        toolPath(TOOL_VALIDATE_ROUTE, 'cold_open'),
        {
          arguments: {
            coreIdea: 'x',
            person: 'ada',
            length: 900,
            styleProfile: 'Not A Ref!!',
          },
          mode: 'full',
        },
      );
      expect(full.status).toBe(422);
      const error = errorBodySchema.parse(json(full)).error;
      expect(error.code).toBe('TOOL_ARGS_INVALID');
      expect(
        toolArgsInvalidDetailsSchema
          .parse(error.details)
          .issues.map((issue) => issue.path),
      ).toEqual(['/styleProfile']);
    } finally {
      await booted.app.close();
    }
  } finally {
    removeFixture(fixture);
  }
});
