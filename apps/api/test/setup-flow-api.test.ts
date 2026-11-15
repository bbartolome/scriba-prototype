import { readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { Controller, Get, Module, type Type } from '@nestjs/common';
import { expect, it } from 'vitest';
import { parse } from 'yaml';
import { errorBodySchema } from '@bbartolome/scriba-contracts/platform';
import {
  PREFERENCES_ROUTE,
  SETUP_CONTINUE_ROUTE,
  SETUP_STATUS_ROUTE,
  SETUP_STEP_KEYS,
  SETUP_STEP_ROUTE,
  setupStatusSchema,
  type Preferences,
  type SetupStatus,
} from '@bbartolome/scriba-contracts/setup-auth';
import { COMPOSED_MODULES } from '../src/app.module';
import {
  PreferencesReader,
  SetupAuthModule,
} from '../src/modules/setup-auth/setup-auth.module';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import {
  LOOPBACK_HOST,
  LOOPBACK_ORIGIN,
  snapshotLibrary,
} from './invariant-sweep';
import { backupEntries, makeLibrary, settingsFilePath } from './settings.kit';

const STATIC_ROOT = resolve(__dirname, 'fixtures/static');
const PROBE_PATH = '/api/setup-flow-probe/preferences';

// A test-only probe. Its GET route returns what the reader returns, because the reader has no HTTP route of its own.
// The probe imports SetupAuthModule, so the reader resolves through that module's exports.
@Controller('api/setup-flow-probe')
class ReaderProbeController {
  constructor(private readonly reader: PreferencesReader) {}

  @Get('preferences')
  read(): Preferences {
    return this.reader.read();
  }
}

@Module({
  imports: [SetupAuthModule],
  controllers: [ReaderProbeController],
})
class ReaderProbeModule {}

// A step route for one step key, from the contract's template.
function stepPath(key: string): string {
  return SETUP_STEP_ROUTE.replace(':step', key);
}

// One GET to the loopback app. The cookie is sent when given.
function get(app: TestApp, cookie: string | undefined, path: string) {
  return send(app.baseUrl, { host: LOOPBACK_HOST, path, cookie });
}

// One POST to the loopback app, with the loopback Origin. The body is JSON when given, and no body otherwise.
function post(
  app: TestApp,
  cookie: string | undefined,
  path: string,
  body?: unknown,
): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie,
    method: 'POST',
    path,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// The status body, read from GET and checked against the contract schema.
async function statusOf(app: TestApp, cookie: string): Promise<SetupStatus> {
  const reply = await get(app, cookie, SETUP_STATUS_ROUTE);
  expect(reply.status).toBe(200);
  return setupStatusSchema.parse(JSON.parse(reply.body));
}

// The error code of an error body, checked against the platform error schema.
function errorCode(reply: Reply): string {
  return errorBodySchema.parse(JSON.parse(reply.body)).error.code;
}

// Makes a library, boots the app with the given modules on it, runs the callback with a session cookie, and
// removes the library on every path.
async function withApp(
  run: (app: TestApp, cookie: string, library: string) => Promise<void>,
  modules: Type<unknown>[] = COMPOSED_MODULES,
): Promise<void> {
  const library = makeLibrary();
  try {
    const app = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
      modules,
    });
    try {
      const cookie = await sessionCookie(app, library);
      await run(app, cookie, library);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
}

it('criterion 1: each step can be set done and skipped, and Continue sets complete with providers and preferences skipped', async () => {
  await withApp(async (app, cookie) => {
    for (const key of SETUP_STEP_KEYS) {
      for (const state of ['done', 'skipped'] as const) {
        const set = await post(app, cookie, stepPath(key), { state });
        expect(set.status).toBe(200);
        const body = setupStatusSchema.parse(JSON.parse(set.body));
        expect(body.steps[key]).toBe(state);
        const read = await statusOf(app, cookie);
        expect(read.steps[key]).toBe(state);
      }
    }
    expect((await statusOf(app, cookie)).complete).toBe(false);

    for (const key of ['access', 'tailscale', 'firstProject'] as const) {
      const set = await post(app, cookie, stepPath(key), { state: 'done' });
      expect(set.status).toBe(200);
    }
    for (const key of ['providers', 'preferences'] as const) {
      const set = await post(app, cookie, stepPath(key), { state: 'skipped' });
      expect(set.status).toBe(200);
    }
    expect((await statusOf(app, cookie)).complete).toBe(false);

    const cont = await post(app, cookie, SETUP_CONTINUE_ROUTE);
    expect(cont.status).toBe(200);
    expect(setupStatusSchema.parse(JSON.parse(cont.body)).complete).toBe(true);
    const after = await statusOf(app, cookie);
    expect(after.complete).toBe(true);
    expect(after.steps).toEqual({
      access: 'done',
      tailscale: 'done',
      providers: 'skipped',
      preferences: 'skipped',
      firstProject: 'done',
    });
  });
});

it('criterion 2: a preferences POST with only defaultGenrePack changes no other settings.yaml byte', async () => {
  await withApp(async (app, cookie, library) => {
    const settingsPath = settingsFilePath(library);
    const first = await post(app, cookie, PREFERENCES_ROUTE, {
      authorName: 'Ada',
    });
    expect(first.status).toBe(200);
    const before = readFileSync(settingsPath, 'utf8');

    const second = await post(app, cookie, PREFERENCES_ROUTE, {
      defaultGenrePack: 'fiction',
    });
    expect(second.status).toBe(200);
    expect(JSON.parse(second.body)).toEqual({
      authorName: 'Ada',
      defaultGenrePack: 'fiction',
    });

    const after = readFileSync(settingsPath, 'utf8');
    expect(before).toContain('    authorName: Ada\n');
    expect(after).toBe(
      before.replace(
        '    authorName: Ada\n',
        '    authorName: Ada\n    defaultGenrePack: fiction\n',
      ),
    );
  });
});

it('criterion 3: the preferences reader returns the stored values', async () => {
  await withApp(
    async (app, cookie) => {
      const fresh = await get(app, cookie, PROBE_PATH);
      expect(fresh.status).toBe(200);
      expect(JSON.parse(fresh.body)).toEqual({});

      const first = await post(app, cookie, PREFERENCES_ROUTE, {
        authorName: 'Ada',
        defaultGenrePack: 'nonfiction',
      });
      expect(first.status).toBe(200);
      const read = await get(app, cookie, PROBE_PATH);
      expect(JSON.parse(read.body)).toEqual({
        authorName: 'Ada',
        defaultGenrePack: 'nonfiction',
      });

      const second = await post(app, cookie, PREFERENCES_ROUTE, {
        defaultGenrePack: 'fiction',
      });
      expect(second.status).toBe(200);
      const merged = await get(app, cookie, PROBE_PATH);
      expect(JSON.parse(merged.body)).toEqual({
        authorName: 'Ada',
        defaultGenrePack: 'fiction',
      });
    },
    [...COMPOSED_MODULES, ReaderProbeModule],
  );
});

it('criterion 4: GET status and GET preferences leave the library unchanged', async () => {
  await withApp(async (app, cookie, library) => {
    const before = snapshotLibrary(library);
    const status = await get(app, cookie, SETUP_STATUS_ROUTE);
    expect(status.status).toBe(200);
    const preferences = await get(app, cookie, PREFERENCES_ROUTE);
    expect(preferences.status).toBe(200);
    expect(snapshotLibrary(library)).toEqual(before);
    expect(backupEntries(library)).toEqual([]);
  });
});

it('refusals: an unknown step, a pending state, a non-string author name and a missing cookie', async () => {
  await withApp(async (app, cookie) => {
    const unknownStep = await post(app, cookie, stepPath('nope'), {
      state: 'done',
    });
    expect(unknownStep.status).toBe(400);
    expect(errorCode(unknownStep)).toBe('PLATFORM_VALIDATION_FAILED');

    const pending = await post(app, cookie, stepPath('providers'), {
      state: 'pending',
    });
    expect(pending.status).toBe(400);
    expect(errorCode(pending)).toBe('PLATFORM_VALIDATION_FAILED');

    const authorName = await post(app, cookie, PREFERENCES_ROUTE, {
      authorName: 42,
    });
    expect(authorName.status).toBe(400);
    expect(errorCode(authorName)).toBe('PLATFORM_VALIDATION_FAILED');

    const noCookie = await post(app, undefined, PREFERENCES_ROUTE, {
      authorName: 'Ada',
    });
    expect(noCookie.status).toBe(401);
    expect(errorCode(noCookie)).toBe('AUTH_REQUIRED');

    const noOrigin = await send(app.baseUrl, {
      host: LOOPBACK_HOST,
      method: 'POST',
      path: PREFERENCES_ROUTE,
      cookie,
      body: JSON.stringify({ authorName: 'Ada' }),
    });
    expect(noOrigin.status).toBe(403);
    expect(errorCode(noOrigin)).toBe('AUTH_ORIGIN_REJECTED');
  });
});

it('theme is dropped and never stored', async () => {
  await withApp(async (app, cookie, library) => {
    const reply = await post(app, cookie, PREFERENCES_ROUTE, {
      theme: 'dark',
      authorName: 'Ada',
    });
    expect(reply.status).toBe(200);
    expect(JSON.parse(reply.body)).toEqual({ authorName: 'Ada' });

    const text = readFileSync(settingsFilePath(library), 'utf8');
    expect(text).not.toContain('theme');
    const doc = parse(text) as { setupAuth: { preferences: unknown } };
    expect(doc.setupAuth.preferences).toEqual({ authorName: 'Ada' });
  });
});
