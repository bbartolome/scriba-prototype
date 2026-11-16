import { readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  PREFERENCES_ROUTE,
  SETUP_CONTINUE_ROUTE,
  SETUP_STATUS_ROUTE,
  SETUP_STEP_ROUTE,
  setupStatusSchema,
  type Preferences,
  type SetupStatus,
} from '@bbartolome/scriba-contracts/setup-auth';
import { PROJECT_NEW_ROUTE } from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import {
  LOOPBACK_HOST,
  LOOPBACK_ORIGIN,
  snapshotLibrary,
  type Snapshot,
} from './invariant-sweep';
import { postJson, changedPaths } from './project-store-projects.kit';
import { makeLibrary, settingsFilePath } from './settings.kit';

const STATIC_ROOT = resolve(__dirname, 'fixtures/static');

// One GET to the loopback app, with the session cookie.
function get(app: TestApp, cookie: string, path: string): Promise<Reply> {
  return send(app.baseUrl, { host: LOOPBACK_HOST, path, cookie });
}

// One POST to the loopback app, with the loopback Origin and the session cookie.
function post(
  app: TestApp,
  cookie: string,
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

// Makes a fresh temp library, boots the composed app on it, runs the callback with a session cookie, and
// removes the library on every path.
async function withLibrary(
  run: (app: TestApp, cookie: string, library: string) => Promise<void>,
): Promise<void> {
  const library = makeLibrary();
  try {
    const app = await createTestApp({
      libraryDir: library,
      staticRoot: STATIC_ROOT,
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

// The parsed settings file of the library.
function readSettings(library: string): Record<string, unknown> {
  return parse(readFileSync(settingsFilePath(library), 'utf8')) as Record<
    string,
    unknown
  >;
}

// A copy of an object without one key.
function without(value: Record<string, unknown>, key: string) {
  const copy = { ...value };
  delete copy[key];
  return copy;
}

it('setup-flow gate, criterion 1: a fresh library walks through the steps, skipping providers and preferences still completes', async () => {
  await withLibrary(async (app, cookie) => {
    const fresh = await statusOf(app, cookie);
    expect(fresh.steps).toEqual({
      access: 'done',
      tailscale: 'pending',
      providers: 'pending',
      preferences: 'pending',
      firstProject: 'pending',
    });
    expect(fresh.complete).toBe(false);

    for (const key of ['providers', 'preferences'] as const) {
      const set = await post(
        app,
        cookie,
        SETUP_STEP_ROUTE.replace(':step', key),
        {
          state: 'skipped',
        },
      );
      expect(set.status).toBe(200);
      expect(setupStatusSchema.parse(JSON.parse(set.body)).steps[key]).toBe(
        'skipped',
      );
    }

    const cont = await post(app, cookie, SETUP_CONTINUE_ROUTE);
    expect(cont.status).toBe(200);

    const done = await statusOf(app, cookie);
    expect(done.steps).toEqual({
      access: 'done',
      tailscale: 'skipped',
      providers: 'skipped',
      preferences: 'skipped',
      firstProject: 'skipped',
    });
    expect(done.complete).toBe(true);
  });
});

it('setup-flow gate, criterion 2: re-running shows saved values, a step save changes only its own fields, and projects are unchanged', async () => {
  await withLibrary(async (app, cookie, library) => {
    const created = await postJson(app, cookie, PROJECT_NEW_ROUTE, {
      title: 'Kept book',
    });
    expect(created.status).toBe(201);

    const first = await post(app, cookie, PREFERENCES_ROUTE, {
      authorName: 'Ada',
    });
    expect(first.status).toBe(200);
    const s0: Snapshot = snapshotLibrary(library);
    const settings0 = readSettings(library);

    const second = await post(app, cookie, PREFERENCES_ROUTE, {
      defaultGenrePack: 'fiction',
    });
    expect(second.status).toBe(200);
    const saved: Preferences = {
      authorName: 'Ada',
      defaultGenrePack: 'fiction',
    };
    expect(JSON.parse(second.body)).toEqual(saved);
    const read = await get(app, cookie, PREFERENCES_ROUTE);
    expect(JSON.parse(read.body)).toEqual(saved);

    const s1: Snapshot = snapshotLibrary(library);
    expect(changedPaths(s0, s1)).toEqual(['.scriba/settings.yaml']);
    const settings1 = readSettings(library);
    expect(without(settings1, 'setupAuth')).toEqual(
      without(settings0, 'setupAuth'),
    );
    const auth0 = settings0.setupAuth as Record<string, unknown>;
    const auth1 = settings1.setupAuth as Record<string, unknown>;
    expect(without(auth1, 'preferences')).toEqual(
      without(auth0, 'preferences'),
    );
    expect(auth0.preferences).toEqual({ authorName: 'Ada' });
    expect(auth1.preferences).toEqual(saved);

    const step = await post(
      app,
      cookie,
      SETUP_STEP_ROUTE.replace(':step', 'preferences'),
      {
        state: 'done',
      },
    );
    expect(step.status).toBe(200);
    const s2: Snapshot = snapshotLibrary(library);
    expect(changedPaths(s1, s2)).toEqual(['.scriba/settings.yaml']);
    const settings2 = readSettings(library);
    expect(without(settings2, 'setupAuth')).toEqual(
      without(settings1, 'setupAuth'),
    );
    const auth2 = settings2.setupAuth as Record<string, unknown>;
    expect(without(auth2, 'steps')).toEqual(without(auth1, 'steps'));
    const steps1 = auth1.steps as Record<string, string>;
    const steps2 = auth2.steps as Record<string, string>;
    expect(steps1.preferences).not.toBe('done');
    expect(steps2).toEqual({ ...steps1, preferences: 'done' });
  });
});
