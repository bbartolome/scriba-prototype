import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  draftVersionListSchema,
  PROJECT_FILE_DELETE_ROUTE,
  PROJECT_FILE_EDIT_ROUTE,
  PROJECT_FILE_MOVE_ROUTE,
  PROJECT_FILE_ROUTE,
  PROJECT_FILE_WRITE_ROUTE,
  PROJECT_FILES_ROUTE,
  PROJECT_VERSION_RESTORE_ROUTE,
  PROJECT_VERSION_ROUTE,
  PROJECT_VERSIONS_ROUTE,
  type PendingChange,
} from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import { dataOf, openSse, type OpenSse } from './sse';
import {
  addOkProject,
  postJsonPlain,
  type PlainReply,
} from './project-store-active.kit';
import { bookLibrary, fileUrl, putFile } from './project-store-files.kit';
import { pendingKitModule } from './project-store-pending.kit';
import type { ErrorBody } from './project-store-projects.kit';

// Every test builds its own temp library and removes it. Proposals go through the kit module, which has no guard.
// The version routes, the file API and accept go through their real paths on the same app. Events come from GET
// /events on that app. The host edits the disk directly.

const BOOK = 'book';
const KIT = '/api/project-store-test/pending/propose';
const CH01 = 'drafts/ch01.md';
const OLD_ID = '20261104T231500123Z.md';
const OLD_PATH = `${BOOK}/drafts/.versions/ch01.md/${OLD_ID}`;
const ACCEPT = (id: string, projectId = BOOK): string =>
  `/api/project-store/projects/${projectId}/pending/${id}/accept`;

interface PendingEvent {
  type: string;
  data: { projectId: string; paths?: string[]; pendingChange?: PendingChange };
}

// Boots the kit module on the library, and closes the app in every case.
async function withKit(
  library: string,
  run: (app: TestApp) => Promise<void>,
): Promise<void> {
  const app = await createTestApp({
    libraryDir: library,
    modules: [pendingKitModule()],
  });
  try {
    await run(app);
  } finally {
    await app.close();
  }
}

// One GET with no cookie; the kit app has no guard.
async function getPlain(baseUrl: string, path: string): Promise<PlainReply> {
  const response = await fetch(baseUrl + path);
  return { status: response.status, json: (await response.json()) as unknown };
}

// The error code of a refused reply.
function codeOf(reply: PlainReply): string {
  return (reply.json as ErrorBody).error.code;
}

// Proposes a modify of a file through the kit module, and returns the change.
async function propose(
  app: TestApp,
  path: string,
  content: string,
): Promise<PendingChange> {
  const response = await fetch(app.baseUrl + KIT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      projectId: BOOK,
      origin: { kind: 'agent-run', runId: 'r1' },
      path,
      content,
    }),
  });
  expect(response.status).toBe(200);
  return (await response.json()) as PendingChange;
}

// The next event of the stream, after the hello block has been skipped.
async function nextEvent(stream: OpenSse): Promise<PendingEvent> {
  return JSON.parse(dataOf(await stream.next(2000))) as PendingEvent;
}

// The files of the versions folder of one draft, in name order. Empty when the folder is absent.
function versionNames(library: string, draftName: string): string[] {
  const folder = join(library, BOOK, 'drafts', '.versions', draftName);
  return existsSync(folder) ? readdirSync(folder).sort() : [];
}

it('V1: the list is newest first with byte sizes, and the read returns the stored text exactly', async () => {
  const fixture = bookLibrary();
  try {
    putFile(fixture.library, `${BOOK}/drafts/ch01.md`, 'Current\n');
    putFile(
      fixture.library,
      `${BOOK}/drafts/.versions/ch01.md/20261104T231500123Z.md`,
      'Old one\n',
    );
    putFile(
      fixture.library,
      `${BOOK}/drafts/.versions/ch01.md/20261104T231500124Z.md`,
      'Second, é\n',
    );
    putFile(
      fixture.library,
      `${BOOK}/drafts/.versions/ch01.md/20261104T231500124Z-2.md`,
      'Third\n',
    );
    await withKit(fixture.library, async (app) => {
      const listed = await getPlain(
        app.baseUrl,
        fileUrl(PROJECT_VERSIONS_ROUTE, BOOK, { draftPath: CH01 }),
      );
      expect(listed.status).toBe(200);
      const list = draftVersionListSchema.parse(listed.json);
      expect(list.draftPath).toBe(CH01);
      expect(list.versions.map((version) => version.id)).toEqual([
        '20261104T231500124Z-2.md',
        '20261104T231500124Z.md',
        '20261104T231500123Z.md',
      ]);
      expect(list.versions.map((version) => version.size)).toEqual([6, 11, 8]);
      expect(list.versions[1]?.createdAt).toBe('2026-11-04T23:15:00.124Z');
      expect(list.versions[2]?.createdAt).toBe('2026-11-04T23:15:00.123Z');

      const read = await getPlain(
        app.baseUrl,
        fileUrl(PROJECT_VERSION_ROUTE, BOOK, {
          draftPath: CH01,
          id: '20261104T231500124Z.md',
        }),
      );
      expect(read.status).toBe(200);
      expect((read.json as { content: string }).content).toBe('Second, é\n');
    });
  } finally {
    fixture.remove();
  }
});

it('V2: restore saves the current text as a new version and then writes the restored text to the draft', async () => {
  const fixture = bookLibrary();
  try {
    putFile(fixture.library, `${BOOK}/drafts/ch01.md`, 'Current\n');
    putFile(fixture.library, OLD_PATH, 'Old\n');
    await withKit(fixture.library, async (app) => {
      const restored = await postJsonPlain(
        app.baseUrl,
        fileUrl(PROJECT_VERSION_RESTORE_ROUTE, BOOK),
        { draftPath: CH01, id: OLD_ID },
      );
      expect(restored.status).toBe(200);
      expect(restored.json).toEqual({
        draftPath: CH01,
        id: OLD_ID,
        content: 'Old\n',
      });
      expect(readFileSync(join(fixture.library, BOOK, CH01), 'utf8')).toBe(
        'Old\n',
      );

      const listed = draftVersionListSchema.parse(
        (
          await getPlain(
            app.baseUrl,
            fileUrl(PROJECT_VERSIONS_ROUTE, BOOK, { draftPath: CH01 }),
          )
        ).json,
      );
      expect(listed.versions).toHaveLength(2);
      const newest = listed.versions[0]?.id as string;
      expect(newest).not.toBe(OLD_ID);
      const saved = await getPlain(
        app.baseUrl,
        fileUrl(PROJECT_VERSION_ROUTE, BOOK, { draftPath: CH01, id: newest }),
      );
      expect((saved.json as { content: string }).content).toBe('Current\n');
    });
  } finally {
    fixture.remove();
  }
});

it('V3: the file API refuses drafts/.versions for read, list, write, edit, delete and move, and the version is unchanged', async () => {
  const fixture = bookLibrary();
  try {
    putFile(fixture.library, `${BOOK}/drafts/ch01.md`, 'Current\n');
    putFile(fixture.library, OLD_PATH, 'Old\n');
    const versionPath = `drafts/.versions/ch01.md/${OLD_ID}`;
    await withKit(fixture.library, async (app) => {
      const fileGet = await getPlain(
        app.baseUrl,
        fileUrl(PROJECT_FILE_ROUTE, BOOK, { path: versionPath }),
      );
      expect(fileGet.status).toBe(400);
      expect(codeOf(fileGet)).toBe('PROJECT_PATH_RESERVED');

      const folderList = await getPlain(
        app.baseUrl,
        fileUrl(PROJECT_FILES_ROUTE, BOOK, { path: 'drafts/.versions' }),
      );
      expect(folderList.status).toBe(400);
      expect(codeOf(folderList)).toBe('PROJECT_PATH_RESERVED');

      const writes: Array<[string, unknown]> = [
        [PROJECT_FILE_WRITE_ROUTE, { path: versionPath, content: 'New\n' }],
        [
          PROJECT_FILE_EDIT_ROUTE,
          { path: versionPath, old: 'Old', new: 'New' },
        ],
        [PROJECT_FILE_DELETE_ROUTE, { path: versionPath }],
        [
          PROJECT_FILE_MOVE_ROUTE,
          { from: CH01, to: 'drafts/.versions/ch01.md/new.md' },
        ],
        [PROJECT_FILE_MOVE_ROUTE, { from: versionPath, to: 'drafts/x.md' }],
      ];
      for (const [route, body] of writes) {
        const reply = await postJsonPlain(
          app.baseUrl,
          fileUrl(route, BOOK),
          body,
        );
        expect(reply.status).toBe(400);
        expect(codeOf(reply)).toBe('PROJECT_PATH_RESERVED');
      }

      const recursive = await getPlain(
        app.baseUrl,
        fileUrl(PROJECT_FILES_ROUTE, BOOK, {
          path: 'drafts',
          recursive: 'true',
        }),
      );
      expect(recursive.status).toBe(200);
      const paths = (
        recursive.json as { entries: Array<{ path: string }> }
      ).entries.map((entry) => entry.path);
      expect(paths.some((path) => path.startsWith('drafts/.versions'))).toBe(
        false,
      );
    });
    expect(readFileSync(join(fixture.library, OLD_PATH), 'utf8')).toBe('Old\n');
    expect(readFileSync(join(fixture.library, BOOK, CH01), 'utf8')).toBe(
      'Current\n',
    );
    expect(
      existsSync(
        join(fixture.library, BOOK, 'drafts/.versions/ch01.md/new.md'),
      ),
    ).toBe(false);
    expect(existsSync(join(fixture.library, BOOK, 'drafts/x.md'))).toBe(false);
  } finally {
    fixture.remove();
  }
});

it('X1: list and read create no drafts/.versions folder, and a draft without versions lists as empty', async () => {
  const fixture = bookLibrary();
  try {
    putFile(fixture.library, `${BOOK}/drafts/ch01.md`, 'Current\n');
    await withKit(fixture.library, async (app) => {
      const listed = await getPlain(
        app.baseUrl,
        fileUrl(PROJECT_VERSIONS_ROUTE, BOOK, { draftPath: CH01 }),
      );
      expect(listed.status).toBe(200);
      expect(listed.json).toEqual({ draftPath: CH01, versions: [] });

      const read = await getPlain(
        app.baseUrl,
        fileUrl(PROJECT_VERSION_ROUTE, BOOK, {
          draftPath: CH01,
          id: '20261104T231500999Z.md',
        }),
      );
      expect(read.status).toBe(404);
      expect(codeOf(read)).toBe('PROJECT_NOT_FOUND');
    });
    expect(existsSync(join(fixture.library, BOOK, 'drafts', '.versions'))).toBe(
      false,
    );
  } finally {
    fixture.remove();
  }
});

it('X2: a path that is not a top-level draft, a malformed id, an inactive project and a missing draft are refused, and restore writes nothing', async () => {
  const fixture = bookLibrary();
  try {
    putFile(fixture.library, `${BOOK}/drafts/ch01.md`, 'Current\n');
    putFile(fixture.library, `${BOOK}/drafts/sub/ch01.md`, 'Sub\n');
    putFile(fixture.library, `${BOOK}/sources/outline.md`, 'Outline\n');
    putFile(fixture.library, OLD_PATH, 'Old\n');
    addOkProject(fixture.library, 'second');
    await withKit(fixture.library, async (app) => {
      const list = (draftPath: string): string =>
        fileUrl(PROJECT_VERSIONS_ROUTE, BOOK, { draftPath });

      const notTop = await getPlain(app.baseUrl, list('sources/outline.md'));
      expect(notTop.status).toBe(400);
      expect(codeOf(notTop)).toBe('PROJECT_PATH_INVALID');

      const nested = await getPlain(app.baseUrl, list('drafts/sub/ch01.md'));
      expect(nested.status).toBe(400);
      expect(codeOf(nested)).toBe('PROJECT_PATH_INVALID');

      const reserved = await getPlain(
        app.baseUrl,
        list('drafts/.versions/ch01.md'),
      );
      expect(reserved.status).toBe(400);
      expect(codeOf(reserved)).toBe('PROJECT_PATH_RESERVED');

      for (const id of ['../ch01.md', 'ch01.md']) {
        const read = await getPlain(
          app.baseUrl,
          fileUrl(PROJECT_VERSION_ROUTE, BOOK, { draftPath: CH01, id }),
        );
        expect(read.status).toBe(404);
        expect(codeOf(read)).toBe('PROJECT_NOT_FOUND');
      }

      const before = versionNames(fixture.library, 'ch01.md');
      const unknown = await postJsonPlain(
        app.baseUrl,
        fileUrl(PROJECT_VERSION_RESTORE_ROUTE, BOOK),
        { draftPath: CH01, id: '20261104T231500999Z.md' },
      );
      expect(unknown.status).toBe(404);
      expect(codeOf(unknown)).toBe('PROJECT_NOT_FOUND');
      expect(readFileSync(join(fixture.library, BOOK, CH01), 'utf8')).toBe(
        'Current\n',
      );
      expect(versionNames(fixture.library, 'ch01.md')).toEqual(before);

      putFile(
        fixture.library,
        `${BOOK}/drafts/.versions/new.md/20261104T231500123Z.md`,
        'Kept\n',
      );
      const missingDraft = await postJsonPlain(
        app.baseUrl,
        fileUrl(PROJECT_VERSION_RESTORE_ROUTE, BOOK),
        { draftPath: 'drafts/new.md', id: OLD_ID },
      );
      expect(missingDraft.status).toBe(404);
      expect(codeOf(missingDraft)).toBe('PROJECT_NOT_FOUND');
      expect(versionNames(fixture.library, 'new.md')).toEqual([OLD_ID]);
      expect(existsSync(join(fixture.library, BOOK, 'drafts/new.md'))).toBe(
        false,
      );

      const inactiveList = await getPlain(
        app.baseUrl,
        fileUrl(PROJECT_VERSIONS_ROUTE, 'second', { draftPath: CH01 }),
      );
      expect(inactiveList.status).toBe(409);
      expect(codeOf(inactiveList)).toBe('PROJECT_NOT_ACTIVE');

      const inactiveRestore = await postJsonPlain(
        app.baseUrl,
        fileUrl(PROJECT_VERSION_RESTORE_ROUTE, 'second'),
        { draftPath: CH01, id: OLD_ID },
      );
      expect(inactiveRestore.status).toBe(409);
      expect(codeOf(inactiveRestore)).toBe('PROJECT_NOT_ACTIVE');
    });
  } finally {
    fixture.remove();
  }
});

it('X3: restore publishes files-changed for the draft, and then pending-updated for an open change of that draft', async () => {
  const fixture = bookLibrary();
  try {
    putFile(fixture.library, `${BOOK}/drafts/ch01.md`, 'Current\n');
    putFile(fixture.library, OLD_PATH, 'Old\n');
    await withKit(fixture.library, async (app) => {
      await propose(app, CH01, 'Proposed\n');
      const stream = await openSse(app.baseUrl + '/events');
      try {
        await stream.next(2000); // hello

        const restored = await postJsonPlain(
          app.baseUrl,
          fileUrl(PROJECT_VERSION_RESTORE_ROUTE, BOOK),
          { draftPath: CH01, id: OLD_ID },
        );
        expect(restored.status).toBe(200);

        const first = await nextEvent(stream);
        expect(first.type).toBe('files-changed');
        expect(first.data.paths).toEqual([CH01]);
        const flagged = await nextEvent(stream);
        expect(flagged.type).toBe('pending-updated');
        expect(flagged.data.pendingChange?.conflict?.reason).toBe(
          'base-changed',
        );
      } finally {
        await stream.cancel();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('X4: a version written by accept is listed, and its id and content are as the accept left them', async () => {
  const fixture = bookLibrary();
  try {
    putFile(fixture.library, `${BOOK}/drafts/ch01.md`, 'Current\n');
    await withKit(fixture.library, async (app) => {
      const change = await propose(app, CH01, 'Proposed\n');
      const accepted = await postJsonPlain(app.baseUrl, ACCEPT(change.id), {});
      expect(accepted.status).toBe(200);

      const listed = draftVersionListSchema.parse(
        (
          await getPlain(
            app.baseUrl,
            fileUrl(PROJECT_VERSIONS_ROUTE, BOOK, { draftPath: CH01 }),
          )
        ).json,
      );
      expect(listed.versions).toHaveLength(1);
      const id = listed.versions[0]?.id as string;
      expect(id).toMatch(/^\d{8}T\d{9}Z\.md$/);

      const read = await getPlain(
        app.baseUrl,
        fileUrl(PROJECT_VERSION_ROUTE, BOOK, { draftPath: CH01, id }),
      );
      expect((read.json as { content: string }).content).toBe('Current\n');
    });
  } finally {
    fixture.remove();
  }
});
