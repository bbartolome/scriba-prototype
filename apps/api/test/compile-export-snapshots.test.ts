import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { afterEach, expect, it, vi } from 'vitest';
import {
  MANUSCRIPT_STATUS_ROUTE,
  SNAPSHOTS_ROUTE,
  SNAPSHOT_RESTORE_ROUTE,
  snapshotListSchema,
  snapshotManifestSchema,
  snapshotSummarySchema,
  type ManuscriptView,
  type SnapshotSummary,
} from '@bbartolome/scriba-contracts/compile-export';
import {
  PROJECT_PENDING_ROUTE,
  pendingListSchema,
  type PendingList,
} from '@bbartolome/scriba-contracts/project-store';
import { COMPOSED_MODULES } from '../src/app.module';
import {
  EVENT_WAIT_MS,
  LOOPBACK_HOST,
  LOOPBACK_ORIGIN,
  observeEvents,
  type Observer,
} from './invariant-sweep';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import {
  getManuscript,
  manuscriptLibrary,
  manuscriptOf,
  STATIC_ROOT,
  withManuscript,
} from './compile-export-manuscript.kit';
import { pendingKitModule } from './project-store-pending.kit';
import { fileUrl, putFile } from './project-store-files.kit';

afterEach(() => {
  vi.useRealTimers();
});

// The project.yaml of a fixture: the base keys and an order key with the given entries.
function projectYaml(order: string): string {
  return `schemaVersion: 1\ntitle: Book\ngenrePack: nonfiction\norder:\n${order}`;
}

// One GET of a route, with the loopback Host and the session cookie.
function get(app: TestApp, cookie: string, path: string): Promise<Reply> {
  return send(app.baseUrl, { host: LOOPBACK_HOST, cookie, path });
}

// One POST of a route, with the loopback Host, the session cookie, the loopback Origin and a JSON body.
function post(
  app: TestApp,
  cookie: string,
  path: string,
  body: unknown,
): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie,
    origin: LOOPBACK_ORIGIN,
    method: 'POST',
    path,
    body: JSON.stringify(body),
  });
}

function createSnapshot(
  app: TestApp,
  cookie: string,
  label: string,
): Promise<Reply> {
  return post(app, cookie, SNAPSHOTS_ROUTE, { label });
}

function restoreSnapshot(
  app: TestApp,
  cookie: string,
  id: string,
): Promise<Reply> {
  return post(app, cookie, SNAPSHOT_RESTORE_ROUTE, { id });
}

// The id of a 200 create reply.
function idOf(reply: Reply): string {
  expect(reply.status).toBe(200);
  return snapshotSummarySchema.parse(JSON.parse(reply.body)).id;
}

function errorCode(reply: Reply): string {
  return (JSON.parse(reply.body) as { error: { code: string } }).error.code;
}

// The snapshot list, newest first, as the route returns it.
async function listOf(
  app: TestApp,
  cookie: string,
): Promise<SnapshotSummary[]> {
  const reply = await get(app, cookie, SNAPSHOTS_ROUTE);
  expect(reply.status).toBe(200);
  return snapshotListSchema.parse(JSON.parse(reply.body)).snapshots;
}

// The data of each observed event of one type from the compile-export slice.
function eventsOf(blocks: string[], type: string): Record<string, unknown>[] {
  return blocks.flatMap((block) => {
    const line = block.split('\n').find((text) => text.startsWith('data: '));
    if (line === undefined) return [];
    const envelope = JSON.parse(line.slice('data: '.length)) as {
      module?: string;
      type?: string;
      data: Record<string, unknown>;
    };
    return envelope.module === 'compile-export' && envelope.type === type
      ? [envelope.data]
      : [];
  });
}

// The snapshot ids of the snapshot-created events, waited for and taken from the observer.
async function createdAfter(observer: Observer): Promise<string[]> {
  const blocks = await observer.take(EVENT_WAIT_MS);
  return eventsOf(blocks, 'snapshot-created').map(
    (data) => (data.snapshot as { id: string }).id,
  );
}

// The order of project.yaml, as parsed.
function projectOrderOf(library: string): unknown {
  return (
    parse(readFileSync(join(library, 'book', 'project.yaml'), 'utf8')) as {
      order: unknown;
    }
  ).order;
}

// The top-level manuscript files of drafts/, with their text.
function draftsOf(library: string): Record<string, string> {
  const folder = join(library, 'book', 'drafts');
  const out: Record<string, string> = {};
  for (const name of readdirSync(folder)) {
    if (name.endsWith('.md')) {
      out[name] = readFileSync(join(folder, name), 'utf8');
    }
  }
  return out;
}

// Every file under drafts/.versions/, as a map from its path to its bytes (S3).
function versionsOf(library: string): Record<string, string> {
  const root = join(library, 'book', 'drafts', '.versions');
  const out: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out[relative(root, full)] = readFileSync(full).toString('hex');
    }
  };
  walk(root);
  return out;
}

// The pending changes of the book project.
async function pendingOf(app: TestApp, cookie: string): Promise<PendingList> {
  const reply = await get(app, cookie, fileUrl(PROJECT_PENDING_ROUTE, 'book'));
  expect(reply.status).toBe(200);
  return pendingListSchema.parse(JSON.parse(reply.body));
}

// The id of the pre-restore snapshot that the list holds.
async function preRestoreIdOf(app: TestApp, cookie: string): Promise<string> {
  const pre = (await listOf(app, cookie)).find(
    (snapshot) => snapshot.label === 'pre-restore',
  );
  expect(pre).toBeDefined();
  return pre?.id ?? '';
}

// S1: the fixture of the create test. Order: ch02 (final) and then ch01. Two files are not manuscript files.
const S1: Record<string, string> = {
  'project.yaml': projectYaml(
    '  - path: drafts/ch02.md\n    status: final\n  - path: drafts/ch01.md\n',
  ),
  'drafts/ch01.md': 'Alpha one.\n',
  'drafts/ch02.md': 'Beta two words here.\n',
  'drafts/notes.txt': 'Not a manuscript file.\n',
  'drafts/sub/x.md': 'In a subfolder.\n',
  'drafts/.versions/ch01.md/20261101T000000000Z.md': 'An old version.\n',
};

it('S1 a created snapshot holds the top-level drafts and a valid manifest, and the list returns it newest first', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-19T10:00:00.000Z'));
  await withManuscript(S1, async (app, cookie, library) => {
    const observer = await observeEvents(app.baseUrl, LOOPBACK_HOST, cookie);
    const created = await createSnapshot(app, cookie, 'Before Cut');
    expect(created.status).toBe(200);
    const summary = snapshotSummarySchema.parse(JSON.parse(created.body));
    expect(summary.id).toBe('before-cut-20261119T100000Z');
    expect(summary.fileCount).toBe(2);
    const view = manuscriptOf(await getManuscript(app, cookie));
    expect(summary.words).toEqual({
      body: view.totals.body,
      total: view.totals.manuscript,
    });

    const folder = join(library, 'book', 'snapshots', summary.id);
    expect(readdirSync(folder).sort()).toEqual([
      'ch01.md',
      'ch02.md',
      'snapshot.yaml',
    ]);
    for (const name of ['ch01.md', 'ch02.md']) {
      expect(readFileSync(join(folder, name))).toEqual(
        readFileSync(join(library, 'book', 'drafts', name)),
      );
    }
    const manifest = snapshotManifestSchema.parse(
      parse(readFileSync(join(folder, 'snapshot.yaml'), 'utf8')),
    );
    expect(manifest.label).toBe('before-cut');
    expect(manifest.order).toEqual([
      { path: 'drafts/ch02.md', status: 'final' },
      { path: 'drafts/ch01.md' },
    ]);
    expect(await createdAfter(observer)).toEqual([summary.id]);

    vi.setSystemTime(new Date('2026-11-19T10:00:05.000Z'));
    const later = await createSnapshot(app, cookie, 'Later');
    expect(later.status).toBe(200);
    expect(JSON.parse(later.body).id).toBe('later-20261119T100005Z');
    expect(await createdAfter(observer)).toEqual(['later-20261119T100005Z']);
    await observer.close();

    const listed = await listOf(app, cookie);
    expect(listed.map((snapshot) => snapshot.id)).toEqual([
      'later-20261119T100005Z',
      summary.id,
    ]);
    for (const snapshot of listed) {
      expect(snapshot.fileCount).toBe(2);
      expect(snapshot.words).not.toBeNull();
    }
    expect(listed[1]?.words).toEqual(summary.words);
  });
});

it('D1 a same-second collision, a blank label, an empty store and unreadable folders', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-19T10:00:00.000Z'));
  const D1: Record<string, string> = {
    'drafts/ch01.md': 'Alpha one.\n',
    'snapshots/broken-20261118T120000Z/ch01.md': 'No manifest here.\n',
    'snapshots/gap-20261118T130000Z/snapshot.yaml': [
      'schemaVersion: 1',
      'label: gap',
      'createdAt: 2026-11-18T13:00:00.000Z',
      'appVersion: 0.0.0-dev',
      'order:',
      '  - path: drafts/ch09.md',
      'words:',
      '  body: 0',
      '  total: 0',
      '',
    ].join('\n'),
  };
  await withManuscript(D1, async (app, cookie, library) => {
    const first = await createSnapshot(app, cookie, 'Before Cut');
    expect(JSON.parse(first.body).id).toBe('before-cut-20261119T100000Z');
    const second = await createSnapshot(app, cookie, 'Before Cut');
    expect(second.status).toBe(200);
    expect(JSON.parse(second.body).id).toBe('before-cut-20261119T100000Z-2');
    const blank = await createSnapshot(app, cookie, '!!!');
    expect(JSON.parse(blank.body).id).toMatch(/^snapshot-/);

    const listed = await listOf(app, cookie);
    expect(
      listed.find((snapshot) => snapshot.id === 'broken-20261118T120000Z'),
    ).toMatchObject({
      label: 'broken',
      fileCount: 1,
      words: null,
      unreadable: true,
    });
    expect(
      listed.find((snapshot) => snapshot.id === 'gap-20261118T130000Z'),
    ).toMatchObject({ words: null, unreadable: true });
    expect(
      existsSync(
        join(library, 'book', 'snapshots', 'gap-20261118T130000Z', 'ch09.md'),
      ),
    ).toBe(false);
  });

  await withManuscript(
    { 'drafts/ch01.md': 'Alpha one.\n' },
    async (app, cookie, library) => {
      const empty = await get(app, cookie, SNAPSHOTS_ROUTE);
      expect(empty.status).toBe(200);
      expect(JSON.parse(empty.body)).toEqual({ snapshots: [] });
      expect(existsSync(join(library, 'book', 'snapshots'))).toBe(false);
    },
  );
});

// S2: the fixture of the restore test. Order: ch02 (final) and then ch01.
const S2: Record<string, string> = {
  'project.yaml': projectYaml(
    '  - path: drafts/ch02.md\n    status: final\n  - path: drafts/ch01.md\n',
  ),
  'drafts/ch01.md': 'A1\n',
  'drafts/ch02.md': 'B1\n',
};

it('S2 a restore brings back drafts, order and statuses, removes files created after the snapshot, and creates a pre-restore snapshot', async () => {
  await withManuscript(S2, async (app, cookie, library) => {
    const baseId = idOf(await createSnapshot(app, cookie, 'base'));
    const entriesOf = (view: ManuscriptView): unknown =>
      view.entries.map(({ path, part, status }) => ({ path, part, status }));
    const e0 = entriesOf(manuscriptOf(await getManuscript(app, cookie)));

    putFile(library, join('book', 'drafts', 'ch01.md'), 'A2\n');
    putFile(library, join('book', 'drafts', 'ch03.md'), 'C1\n');
    const revision = manuscriptOf(await getManuscript(app, cookie)).revision;
    const status = await post(app, cookie, MANUSCRIPT_STATUS_ROUTE, {
      revision,
      path: 'drafts/ch02.md',
      status: 'draft',
    });
    expect(status.status).toBe(200);

    const observer = await observeEvents(app.baseUrl, LOOPBACK_HOST, cookie);
    const restored = await restoreSnapshot(app, cookie, baseId);
    expect(restored.status).toBe(200);
    const blocks = await observer.take(EVENT_WAIT_MS);
    await observer.close();

    expect(
      eventsOf(blocks, 'snapshot-restored').map((data) => data.snapshotId),
    ).toEqual([baseId]);
    expect(eventsOf(blocks, 'manuscript-updated')).toHaveLength(1);

    expect(draftsOf(library)).toEqual({ 'ch01.md': 'A1\n', 'ch02.md': 'B1\n' });
    expect(entriesOf(manuscriptOf(await getManuscript(app, cookie)))).toEqual(
      e0,
    );
    const manifest = parse(
      readFileSync(
        join(library, 'book', 'snapshots', baseId, 'snapshot.yaml'),
        'utf8',
      ),
    ) as { order: unknown };
    expect(projectOrderOf(library)).toEqual(manifest.order);

    const preId = await preRestoreIdOf(app, cookie);
    expect(preId).toMatch(/^pre-restore-/);
    expect(
      readFileSync(
        join(library, 'book', 'snapshots', preId, 'ch03.md'),
        'utf8',
      ),
    ).toBe('C1\n');
    expect(
      readFileSync(
        join(library, 'book', 'snapshots', preId, 'ch01.md'),
        'utf8',
      ),
    ).toBe('A2\n');
  });
});

// S3: the fixture of the versions test. Two draft versions and two drafts.
const S3: Record<string, string> = {
  'drafts/ch01.md': 'A1\n',
  'drafts/ch02.md': 'B1\n',
  'drafts/.versions/ch01.md/20261101T000000000Z.md': 'version one\n',
  'drafts/.versions/ch02.md/20261102T000000000Z.md': 'version two\n',
};

it('S3 drafts/.versions/ is byte-identical before and after a restore', async () => {
  await withManuscript(S3, async (app, cookie, library) => {
    const baseId = idOf(await createSnapshot(app, cookie, 'base'));
    putFile(library, join('book', 'drafts', 'ch01.md'), 'A2\n');
    rmSync(join(library, 'book', 'drafts', 'ch02.md'));
    const before = versionsOf(library);
    expect(Object.keys(before)).toHaveLength(2);

    const restored = await restoreSnapshot(app, cookie, baseId);
    expect(restored.status).toBe(200);
    expect(versionsOf(library)).toEqual(before);

    const preId = await preRestoreIdOf(app, cookie);
    expect(
      readdirSync(join(library, 'book', 'snapshots', preId)),
    ).not.toContain('.versions');
  });
});

it('S4 a pending change against a restored file shows as a conflict', async () => {
  const fixture = manuscriptLibrary({ 'drafts/ch01.md': 'A1\n' });
  try {
    const app = await createTestApp({
      libraryDir: fixture.library,
      staticRoot: STATIC_ROOT,
      modules: [...COMPOSED_MODULES, pendingKitModule()],
    });
    try {
      const cookie = await sessionCookie(app, fixture.library);
      const baseId = idOf(await createSnapshot(app, cookie, 'base'));
      putFile(fixture.library, join('book', 'drafts', 'ch01.md'), 'A2\n');
      const proposed = await post(
        app,
        cookie,
        '/api/project-store-test/pending/propose',
        {
          projectId: 'book',
          path: 'drafts/ch01.md',
          content: 'A3\n',
          origin: { kind: 'agent-run', runId: 'run-1' },
        },
      );
      expect(proposed.status).toBe(200);

      const before = await pendingOf(app, cookie);
      expect(before.changes).toHaveLength(1);
      expect(before.changes[0]).toMatchObject({ status: 'pending' });
      expect(before.changes[0]?.conflict).toBeNull();

      expect((await restoreSnapshot(app, cookie, baseId)).status).toBe(200);

      const after = await pendingOf(app, cookie);
      expect(after.changes).toHaveLength(1);
      expect(after.changes[0]).toMatchObject({
        status: 'pending',
        conflict: { reason: 'base-changed' },
      });
    } finally {
      await app.close();
    }
  } finally {
    fixture.remove();
  }
});

it('D2 a restore refuses an unknown id, a path and an unreadable folder before any write', async () => {
  await withManuscript(
    {
      'drafts/ch01.md': 'A1\n',
      'snapshots/broken-20261118T120000Z/ch01.md': 'No manifest here.\n',
    },
    async (app, cookie, library) => {
      const unknown = await restoreSnapshot(
        app,
        cookie,
        'no-such-20261119T100000Z',
      );
      expect(unknown.status).toBe(404);
      expect(errorCode(unknown)).toBe('COMPILE_SNAPSHOT_NOT_FOUND');

      const traversal = await restoreSnapshot(app, cookie, '../drafts');
      expect(traversal.status).toBe(404);
      expect(errorCode(traversal)).toBe('COMPILE_SNAPSHOT_NOT_FOUND');

      const before = draftsOf(library);
      const unreadable = await restoreSnapshot(
        app,
        cookie,
        'broken-20261118T120000Z',
      );
      expect(unreadable.status).toBe(409);
      expect(errorCode(unreadable)).toBe('COMPILE_SNAPSHOT_UNREADABLE');

      const snapshots = readdirSync(join(library, 'book', 'snapshots'));
      expect(
        snapshots.filter((name) => name.startsWith('pre-restore-')),
      ).toEqual([]);
      expect(draftsOf(library)).toEqual(before);
    },
  );
});
