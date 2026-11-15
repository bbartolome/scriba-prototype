import { symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  FILE_SIZE_CAP_BYTES,
  type FileList,
  type FileRead,
} from '@bbartolome/scriba-contracts/project-store';
import { dataOf } from './sse';
import {
  EVENT_WAIT_MS,
  LOOPBACK_HOST,
  observeEvents,
  snapshotLibrary,
} from './invariant-sweep';
import {
  bookLibrary,
  entryPaths,
  listFiles,
  putFile,
  readFile,
} from './project-store-files.kit';
import {
  changedPaths,
  errorOf,
  readJson,
  withProjectsApp,
} from './project-store-projects.kit';

// Every test builds its own temp library and removes it. Nothing here reads the sample projects.

it('R2: a file over 5 MiB and a binary or non-UTF-8 file are listed, and their reads are refused with 413 or 415', async () => {
  const fixture = bookLibrary();
  try {
    putFile(
      fixture.library,
      'book/sources/big.md',
      Buffer.alloc(FILE_SIZE_CAP_BYTES + 1, 'a'),
    );
    putFile(
      fixture.library,
      'book/sources/exact.md',
      Buffer.alloc(FILE_SIZE_CAP_BYTES, 'b'),
    );
    putFile(
      fixture.library,
      'book/sources/image.bin',
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
    );
    putFile(
      fixture.library,
      'book/sources/latin1.md',
      Buffer.from([0x63, 0x61, 0x66, 0xe9]),
    );

    await withProjectsApp(fixture, async (app, cookie) => {
      const list = await listFiles(app, cookie, 'book', 'sources');
      expect(list.status).toBe(200);
      const entries = readJson<FileList>(list).entries;
      expect(
        entries.find((entry) => entry.path === 'sources/big.md'),
      ).toMatchObject({
        kind: 'file',
        size: FILE_SIZE_CAP_BYTES + 1,
      });
      for (const path of ['sources/image.bin', 'sources/latin1.md']) {
        expect(
          entries.find((entry) => entry.path === path),
          path,
        ).toMatchObject({
          kind: 'file',
        });
      }

      const tooLarge = await readFile(app, cookie, 'book', 'sources/big.md');
      expect(tooLarge.status).toBe(413);
      expect(errorOf(tooLarge).code).toBe('PROJECT_FILE_TOO_LARGE');

      const exact = await readFile(app, cookie, 'book', 'sources/exact.md');
      expect(exact.status).toBe(200);
      expect(readJson<FileRead>(exact).content.length).toBe(
        FILE_SIZE_CAP_BYTES,
      );

      for (const path of ['sources/image.bin', 'sources/latin1.md']) {
        const refused = await readFile(app, cookie, 'book', path);
        expect(refused.status, path).toBe(415);
        expect(errorOf(refused).code, path).toBe('PROJECT_NOT_TEXT');
      }
    });
  } finally {
    fixture.remove();
  }
});

it('R3: every GET leaves the library and the event stream unchanged', async () => {
  const fixture = bookLibrary();
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const observer = await observeEvents(app.baseUrl, LOOPBACK_HOST, cookie);
      try {
        const before = snapshotLibrary(fixture.library);
        expect((await listFiles(app, cookie, 'book', '.', true)).status).toBe(
          200,
        );
        expect(
          (await readFile(app, cookie, 'book', 'sources/outline.md')).status,
        ).toBe(200);
        expect(
          (await readFile(app, cookie, 'book', 'sources/missing.md')).status,
        ).toBe(404);
        expect(
          (await listFiles(app, cookie, 'book', 'missing-folder')).status,
        ).toBe(404);
        const after = snapshotLibrary(fixture.library);

        expect(changedPaths(before, after)).toEqual([]);
        const blocks = await observer.take(EVENT_WAIT_MS);
        const projectStore = blocks.filter(
          (block) =>
            (JSON.parse(dataOf(block)) as { module?: unknown }).module ===
            'project-store',
        );
        expect(projectStore).toEqual([]);
      } finally {
        await observer.close();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('X2: a recursive list omits dot-entries and links out of the project and does not enter a loop; a dot-file is readable by its path', async () => {
  const fixture = bookLibrary();
  const book = join(fixture.library, 'book');
  try {
    putFile(fixture.library, 'book/.notes/x.md', 'Hidden.\n');
    symlinkSync('outline.md', join(book, 'sources', 'link-note.md'));
    symlinkSync('..', join(book, 'sources', 'loop'));
    symlinkSync(fixture.outside, join(book, 'sources', 'out'));

    await withProjectsApp(fixture, async (app, cookie) => {
      const list = await listFiles(app, cookie, 'book', '.', true);
      expect(list.status).toBe(200);
      expect(entryPaths(list)).toEqual([
        'project.yaml',
        'sources',
        'sources/link-note.md',
        'sources/loop',
        'sources/outline.md',
      ]);

      const hidden = await readFile(app, cookie, 'book', '.notes/x.md');
      expect(hidden.status).toBe(200);
      expect(readJson<FileRead>(hidden).content).toBe('Hidden.\n');
    });
  } finally {
    fixture.remove();
  }
});
