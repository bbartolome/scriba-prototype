import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { afterEach, expect, it, vi } from 'vitest';
import {
  SNAPSHOTS_ROUTE,
  snapshotListSchema,
  snapshotManifestSchema,
  snapshotSummarySchema,
  type SnapshotSummary,
} from '@bbartolome/scriba-contracts/compile-export';
import {
  EVENT_WAIT_MS,
  LOOPBACK_HOST,
  LOOPBACK_ORIGIN,
  observeEvents,
  type Observer,
} from './invariant-sweep';
import { send, type Reply } from './guard-request';
import {
  getManuscript,
  manuscriptOf,
  withManuscript,
} from './compile-export-manuscript.kit';
import type { TestApp } from './create-test-app';

afterEach(() => {
  vi.useRealTimers();
});

// The project.yaml of a fixture: the base keys and an order key with the given entries.
function projectYaml(order: string): string {
  return `schemaVersion: 1\ntitle: Book\ngenrePack: nonfiction\norder:\n${order}`;
}

// One GET of the snapshots route, with the loopback Host and the session cookie.
function list(app: TestApp, cookie: string): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie,
    path: SNAPSHOTS_ROUTE,
  });
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

// The snapshot ids of the snapshot-created events among the observed blocks.
function createdIdsOf(blocks: string[]): string[] {
  return blocks.flatMap((block) => {
    const line = block.split('\n').find((text) => text.startsWith('data: '));
    if (line === undefined) return [];
    const envelope = JSON.parse(line.slice('data: '.length)) as {
      module?: string;
      type?: string;
      data: { snapshot: { id: string } };
    };
    return envelope.module === 'compile-export' &&
      envelope.type === 'snapshot-created'
      ? [envelope.data.snapshot.id]
      : [];
  });
}

// Waits for the events of the window, and returns the snapshot ids created in it.
async function createdAfter(observer: Observer): Promise<string[]> {
  return createdIdsOf(await observer.take(EVENT_WAIT_MS));
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

    const listed = snapshotListSchema.parse(
      JSON.parse((await list(app, cookie)).body),
    );
    const ids = listed.snapshots.map(
      (snapshot: SnapshotSummary) => snapshot.id,
    );
    expect(ids).toEqual(['later-20261119T100005Z', summary.id]);
    for (const snapshot of listed.snapshots) {
      expect(snapshot.fileCount).toBe(2);
      expect(snapshot.words).not.toBeNull();
    }
    expect(listed.snapshots[1]?.words).toEqual(summary.words);
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

    const listed = snapshotListSchema.parse(
      JSON.parse((await list(app, cookie)).body),
    );
    const broken = listed.snapshots.find(
      (snapshot) => snapshot.id === 'broken-20261118T120000Z',
    );
    expect(broken).toMatchObject({
      label: 'broken',
      fileCount: 1,
      words: null,
      unreadable: true,
    });
    const gap = listed.snapshots.find(
      (snapshot) => snapshot.id === 'gap-20261118T130000Z',
    );
    expect(gap).toMatchObject({ words: null, unreadable: true });
    expect(
      existsSync(
        join(library, 'book', 'snapshots', 'gap-20261118T130000Z', 'ch09.md'),
      ),
    ).toBe(false);
  });

  await withManuscript(
    { 'drafts/ch01.md': 'Alpha one.\n' },
    async (app, cookie, library) => {
      const empty = await list(app, cookie);
      expect(empty.status).toBe(200);
      expect(JSON.parse(empty.body)).toEqual({ snapshots: [] });
      expect(existsSync(join(library, 'book', 'snapshots'))).toBe(false);
    },
  );
});
