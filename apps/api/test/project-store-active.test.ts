import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  EVENTS_ROUTE,
  platformEventSchema,
} from '@bbartolome/scriba-contracts/platform';
import {
  ACTIVE_PROJECT_ROUTE,
  projectStoreEventSchema,
} from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import { send } from './guard-request';
import { LOOPBACK_HOST } from './invariant-sweep';
import {
  activeKitModule,
  addOkProject,
  postJsonPlain,
  type PlainReply,
  type SwitchProbe,
} from './project-store-active.kit';
import {
  buildProjectsLibrary,
  errorOf,
  postJson,
  readJson,
  withProjectsApp,
  type ErrorBody,
  type ProjectsLibrary,
} from './project-store-projects.kit';
import { dataOf, openSse, type OpenSse } from './sse';
import { backupEntries, settingsFilePath } from './settings.kit';

// Every test builds its own temp library and removes it. Nothing here reads examples/.

function readSettings(library: string): string {
  return readFileSync(settingsFilePath(library), 'utf8');
}

function codeOf(reply: PlainReply): string {
  return (reply.json as ErrorBody).error.code;
}

// The next block of the stream, parsed as JSON. Each block of this stream is one event.
async function nextJson(stream: OpenSse): Promise<unknown> {
  return JSON.parse(dataOf(await stream.next(2000)));
}

// Boots the kit module (a hook and a require-active route) on the fixture, and closes the app in every case.
async function withKitApp(
  fixture: ProjectsLibrary,
  probe: SwitchProbe,
  run: (app: TestApp) => Promise<void>,
): Promise<void> {
  const app = await createTestApp({
    libraryDir: fixture.library,
    modules: [activeKitModule(probe)],
  });
  try {
    await run(app);
  } finally {
    await app.close();
  }
}

it('C1: activating persists to settings.yaml, and a restarted app reports the same active id', async () => {
  const fixture = buildProjectsLibrary();
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const reply = await postJson(app, cookie, ACTIVE_PROJECT_ROUTE, {
        projectId: 'book',
      });
      expect(reply.status).toBe(200);
      expect(readJson(reply)).toEqual({ active: 'book' });
    });

    const doc = parse(readSettings(fixture.library)) as Record<string, unknown>;
    expect(doc.projects).toEqual({ schemaVersion: 1, active: 'book' });

    await withProjectsApp(fixture, async (app, cookie) => {
      const reply = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: ACTIVE_PROJECT_ROUTE,
        cookie,
      });
      expect(reply.status).toBe(200);
      expect(readJson(reply)).toEqual({ active: 'book' });
    });
    expect(backupEntries(fixture.library)).toEqual([]);
  } finally {
    fixture.remove();
  }
});

it('C2: a switch calls the registered hook before project-switched is observed on /events, with {from, to}', async () => {
  const fixture = buildProjectsLibrary();
  const probe: SwitchProbe = { calls: [], failNext: false };
  try {
    await withKitApp(fixture, probe, async (app) => {
      const stream = await openSse(app.baseUrl + EVENTS_ROUTE);
      try {
        const hello = platformEventSchema.parse(await nextJson(stream));
        expect(hello.type).toBe('hello');

        const reply = await postJsonPlain(app.baseUrl, ACTIVE_PROJECT_ROUTE, {
          projectId: 'book',
        });
        expect(reply.status).toBe(200);
        expect(reply.json).toEqual({ active: 'book' });
        expect(probe.calls).toEqual([{ from: null, to: 'book' }]);

        expect(await nextJson(stream)).toEqual({
          module: 'platform',
          type: 'hook-called',
          data: { from: null, to: 'book' },
        });
        const event = projectStoreEventSchema.parse(await nextJson(stream));
        expect(event).toMatchObject({
          module: 'project-store',
          type: 'project-switched',
          data: { from: null, to: 'book' },
        });
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('C3: a too-new project is refused with PROJECT_SCHEMA_TOO_NEW, an invalid one with PROJECT_INVALID, and settings.yaml does not change', async () => {
  const fixture = buildProjectsLibrary();
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const before = readSettings(fixture.library);

      const later = await postJson(app, cookie, ACTIVE_PROJECT_ROUTE, {
        projectId: 'later',
      });
      expect(later.status).toBe(409);
      expect(errorOf(later).code).toBe('PROJECT_SCHEMA_TOO_NEW');

      const bad = await postJson(app, cookie, ACTIVE_PROJECT_ROUTE, {
        projectId: 'bad',
      });
      expect(bad.status).toBe(422);
      const badError = errorOf(bad);
      expect(badError.code).toBe('PROJECT_INVALID');
      expect(Array.isArray(badError.details)).toBe(true);
      expect((badError.details as unknown[]).length).toBeGreaterThan(0);

      const broken = await postJson(app, cookie, ACTIVE_PROJECT_ROUTE, {
        projectId: 'broken',
      });
      expect(broken.status).toBe(422);
      expect(errorOf(broken).code).toBe('PROJECT_INVALID');

      expect(readSettings(fixture.library)).toBe(before);

      const active = await send(app.baseUrl, {
        host: LOOPBACK_HOST,
        path: ACTIVE_PROJECT_ROUTE,
        cookie,
      });
      expect(active.status).toBe(200);
      expect(readJson(active)).toEqual({ active: null });
    });
  } finally {
    fixture.remove();
  }
});

it('C4: a request naming a non-active project fails PROJECT_NOT_ACTIVE, and with none active it fails PROJECT_NO_ACTIVE', async () => {
  const fixture = buildProjectsLibrary();
  const probe: SwitchProbe = { calls: [], failNext: false };
  try {
    await withKitApp(fixture, probe, async (app) => {
      const requireActive = (projectId: string): Promise<PlainReply> =>
        postJsonPlain(app.baseUrl, '/api/project-store-test/require-active', {
          projectId,
        });

      const none = await requireActive('book');
      expect(none.status).toBe(409);
      expect(codeOf(none)).toBe('PROJECT_NO_ACTIVE');

      const activated = await postJsonPlain(app.baseUrl, ACTIVE_PROJECT_ROUTE, {
        projectId: 'book',
      });
      expect(activated.status).toBe(200);

      const active = await requireActive('book');
      expect(active.status).toBe(200);

      const other = await requireActive('draft-only');
      expect(other.status).toBe(409);
      expect(codeOf(other)).toBe('PROJECT_NOT_ACTIVE');
    });
  } finally {
    fixture.remove();
  }
});

it("E1: an importable folder, an unknown id and '..' are refused with PROJECT_NOT_FOUND, and settings.yaml does not change", async () => {
  const fixture = buildProjectsLibrary();
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const before = readSettings(fixture.library);
      for (const projectId of ['draft-only', 'bare', 'nope', '..']) {
        const reply = await postJson(app, cookie, ACTIVE_PROJECT_ROUTE, {
          projectId,
        });
        expect(reply.status, projectId).toBe(404);
        expect(errorOf(reply).code, projectId).toBe('PROJECT_NOT_FOUND');
      }
      expect(readSettings(fixture.library)).toBe(before);
    });
  } finally {
    fixture.remove();
  }
});

it('E2: activating the active project again changes nothing, and a second switch publishes its own event', async () => {
  const fixture = buildProjectsLibrary();
  addOkProject(fixture.library, 'second');
  const probe: SwitchProbe = { calls: [], failNext: false };
  try {
    await withKitApp(fixture, probe, async (app) => {
      const stream = await openSse(app.baseUrl + EVENTS_ROUTE);
      try {
        await nextJson(stream); // hello

        const first = await postJsonPlain(app.baseUrl, ACTIVE_PROJECT_ROUTE, {
          projectId: 'book',
        });
        expect(first.status).toBe(200);
        expect(await nextJson(stream)).toEqual({
          module: 'platform',
          type: 'hook-called',
          data: { from: null, to: 'book' },
        });
        expect(
          projectStoreEventSchema.parse(await nextJson(stream)).data,
        ).toEqual({ from: null, to: 'book' });

        const again = await postJsonPlain(app.baseUrl, ACTIVE_PROJECT_ROUTE, {
          projectId: 'book',
        });
        expect(again.status).toBe(200);
        expect(again.json).toEqual({ active: 'book' });
        expect(probe.calls).toEqual([{ from: null, to: 'book' }]);

        const second = await postJsonPlain(app.baseUrl, ACTIVE_PROJECT_ROUTE, {
          projectId: 'second',
        });
        expect(second.status).toBe(200);
        expect(await nextJson(stream)).toEqual({
          module: 'platform',
          type: 'hook-called',
          data: { from: 'book', to: 'second' },
        });
        expect(
          projectStoreEventSchema.parse(await nextJson(stream)).data,
        ).toEqual({ from: 'book', to: 'second' });

        expect(probe.calls).toEqual([
          { from: null, to: 'book' },
          { from: 'book', to: 'second' },
        ]);
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('E3: a hook that throws fails the request with PLATFORM_INTERNAL, changes nothing and publishes nothing, and a retry publishes the switch once', async () => {
  const fixture = buildProjectsLibrary();
  const probe: SwitchProbe = { calls: [], failNext: true };
  try {
    await withKitApp(fixture, probe, async (app) => {
      const stream = await openSse(app.baseUrl + EVENTS_ROUTE);
      try {
        await nextJson(stream); // hello
        const before = readSettings(fixture.library);

        const failed = await postJsonPlain(app.baseUrl, ACTIVE_PROJECT_ROUTE, {
          projectId: 'book',
        });
        expect(failed.status).toBe(500);
        expect(codeOf(failed)).toBe('PLATFORM_INTERNAL');

        const active = await send(app.baseUrl, {
          host: LOOPBACK_HOST,
          path: ACTIVE_PROJECT_ROUTE,
        });
        expect(active.status).toBe(200);
        expect(readJson(active)).toEqual({ active: null });
        expect(readSettings(fixture.library)).toBe(before);

        probe.failNext = false;
        const retry = await postJsonPlain(app.baseUrl, ACTIVE_PROJECT_ROUTE, {
          projectId: 'book',
        });
        expect(retry.status).toBe(200);
        expect(await nextJson(stream)).toEqual({
          module: 'platform',
          type: 'hook-called',
          data: { from: null, to: 'book' },
        });
        expect(
          projectStoreEventSchema.parse(await nextJson(stream)).data,
        ).toEqual({ from: null, to: 'book' });
        expect(probe.calls).toEqual([{ from: null, to: 'book' }]);
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});
