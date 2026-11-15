import {
  existsSync,
  lstatSync,
  readFileSync,
  statSync,
  symlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { projectStoreEventSchema } from '@bbartolome/scriba-contracts/project-store';
import { dataOf } from './sse';
import { EVENT_WAIT_MS, LOOPBACK_HOST, observeEvents } from './invariant-sweep';
import {
  bookLibrary,
  deleteFile,
  moveFile,
  putFile,
  sha256Of,
} from './project-store-files.kit';
import { errorOf, withProjectsApp } from './project-store-projects.kit';

// Every test builds its own temp library and removes it. Nothing here reads the sample projects.

it('D1: delete and move work on single files, refuse folders, reserved and unsafe paths; move refuses an existing target', async () => {
  const fixture = bookLibrary();
  const book = join(fixture.library, 'book');
  try {
    putFile(fixture.library, 'book/sources/a.md', 'A\n');
    putFile(fixture.library, 'book/sources/b.md', 'B\n');
    putFile(fixture.library, 'book/sources/c.md', 'C\n');

    await withProjectsApp(fixture, async (app, cookie) => {
      // (1) A folder is never deleted or moved.
      const folder = await deleteFile(app, cookie, 'book', { path: 'sources' });
      expect(folder.status).toBe(404);
      expect(errorOf(folder).code).toBe('PROJECT_NOT_FOUND');
      expect(statSync(join(book, 'sources')).isDirectory()).toBe(true);

      // (2) Unsafe paths are refused by the one path check.
      for (const path of [
        '../x',
        '/sources/a.md',
        'sources//a.md',
        'sources\\a.md',
      ]) {
        const reply = await deleteFile(app, cookie, 'book', { path });
        expect(reply.status).toBe(400);
        expect(errorOf(reply).code).toBe('PROJECT_PATH_INVALID');
      }
      expect(readFileSync(join(book, 'sources', 'a.md'), 'utf8')).toBe('A\n');

      // (3) Reserved paths, and a path through a link that leads outside.
      const reserved = await deleteFile(app, cookie, 'book', {
        path: '.scriba/settings.yaml',
      });
      expect(reserved.status).toBe(400);
      expect(errorOf(reserved).code).toBe('PROJECT_PATH_RESERVED');

      symlinkSync(fixture.outside, join(book, 'sources', 'out'));
      const outside = await deleteFile(app, cookie, 'book', {
        path: 'sources/out/project.yaml',
      });
      expect(outside.status).toBe(400);
      expect(errorOf(outside).code).toBe('PROJECT_PATH_OUTSIDE');
      expect(existsSync(join(fixture.outside, 'project.yaml'))).toBe(true);

      // (4) Delete of one file.
      const deleted = await deleteFile(app, cookie, 'book', {
        path: 'sources/a.md',
      });
      expect(deleted.status).toBe(200);
      expect(existsSync(join(book, 'sources', 'a.md'))).toBe(false);

      // (5) Move of one file; the folder drafts/ is created.
      const moved = await moveFile(app, cookie, 'book', {
        from: 'sources/b.md',
        to: 'drafts/b.md',
      });
      expect(moved.status).toBe(200);
      expect(existsSync(join(book, 'sources', 'b.md'))).toBe(false);
      expect(statSync(join(book, 'drafts')).isDirectory()).toBe(true);
      expect(readFileSync(join(book, 'drafts', 'b.md'), 'utf8')).toBe('B\n');

      // (6) A move onto an existing file or folder is refused, and nothing changes.
      const outlineBytes = readFileSync(join(book, 'sources', 'outline.md'));
      const draftBytes = readFileSync(join(book, 'drafts', 'b.md'));
      const cBytes = readFileSync(join(book, 'sources', 'c.md'));
      for (const to of ['drafts/b.md', 'sources/c.md', 'sources']) {
        const reply = await moveFile(app, cookie, 'book', {
          from: 'sources/outline.md',
          to,
        });
        expect(reply.status).toBe(409);
        expect(errorOf(reply).code).toBe('PROJECT_FILE_EXISTS');
      }
      expect(readFileSync(join(book, 'sources', 'outline.md'))).toEqual(
        outlineBytes,
      );
      expect(readFileSync(join(book, 'drafts', 'b.md'))).toEqual(draftBytes);
      expect(readFileSync(join(book, 'sources', 'c.md'))).toEqual(cBytes);

      // (7) A folder cannot be moved.
      const folderMove = await moveFile(app, cookie, 'book', {
        from: 'sources',
        to: 'drafts/src',
      });
      expect(folderMove.status).toBe(404);
      expect(errorOf(folderMove).code).toBe('PROJECT_NOT_FOUND');
      expect(statSync(join(book, 'sources')).isDirectory()).toBe(true);
      expect(existsSync(join(book, 'drafts', 'src'))).toBe(false);

      // (8) A move into a reserved folder is refused.
      for (const to of ['.scriba/x.md', 'drafts/.versions/x.md']) {
        const reply = await moveFile(app, cookie, 'book', {
          from: 'sources/outline.md',
          to,
        });
        expect(reply.status).toBe(400);
        expect(errorOf(reply).code).toBe('PROJECT_PATH_RESERVED');
      }
      expect(readFileSync(join(book, 'sources', 'outline.md'))).toEqual(
        outlineBytes,
      );

      // (9) An unsafe source path is refused.
      const dotDot = await moveFile(app, cookie, 'book', {
        from: '../x',
        to: 'sources/x.md',
      });
      expect(dotDot.status).toBe(400);
      expect(errorOf(dotDot).code).toBe('PROJECT_PATH_INVALID');
    });
  } finally {
    fixture.remove();
  }
});

it('D2: the HTTP active check, the stale base, and the events of delete and move', async () => {
  const fixture = bookLibrary();
  const book = join(fixture.library, 'book');
  try {
    putFile(fixture.library, 'book/sources/a.md', 'A\n');
    putFile(fixture.library, 'book/sources/c.md', 'C\n');
    putFile(fixture.library, 'book/sources/d.md', 'D\n');

    await withProjectsApp(fixture, async (app, cookie) => {
      // (1) draft-only is not the active project: both routes refuse it, and its file is unchanged.
      const notes = join(fixture.library, 'draft-only', 'sources', 'notes.md');
      const deleteNotes = await deleteFile(app, cookie, 'draft-only', {
        path: 'sources/notes.md',
      });
      expect(deleteNotes.status).toBe(409);
      expect(errorOf(deleteNotes).code).toBe('PROJECT_NOT_ACTIVE');
      const moveNotes = await moveFile(app, cookie, 'draft-only', {
        from: 'sources/notes.md',
        to: 'sources/n.md',
      });
      expect(moveNotes.status).toBe(409);
      expect(errorOf(moveNotes).code).toBe('PROJECT_NOT_ACTIVE');
      expect(readFileSync(notes, 'utf8')).toBe('Notes.\n');
      expect(
        existsSync(join(fixture.library, 'draft-only', 'sources', 'n.md')),
      ).toBe(false);

      // (2) A stale baseHash is refused; the current one deletes.
      const stale = await deleteFile(app, cookie, 'book', {
        path: 'sources/a.md',
        baseHash: sha256Of('Z\n'),
      });
      expect(stale.status).toBe(409);
      expect(errorOf(stale).code).toBe('PROJECT_WRITE_CONFLICT');
      expect(readFileSync(join(book, 'sources', 'a.md'), 'utf8')).toBe('A\n');

      const current = await deleteFile(app, cookie, 'book', {
        path: 'sources/a.md',
        baseHash: sha256Of('A\n'),
      });
      expect(current.status).toBe(200);
      expect(existsSync(join(book, 'sources', 'a.md'))).toBe(false);

      // (3) Each successful change publishes one files-changed event with its paths.
      const observer = await observeEvents(app.baseUrl, LOOPBACK_HOST, cookie);
      try {
        const deleted = await deleteFile(app, cookie, 'book', {
          path: 'sources/c.md',
        });
        expect(deleted.status).toBe(200);
        expect(
          await filesChangedOf(observer.take(EVENT_WAIT_MS)),
        ).toMatchObject([
          {
            module: 'project-store',
            type: 'files-changed',
            data: { projectId: 'book', paths: ['sources/c.md'] },
          },
        ]);

        const moved = await moveFile(app, cookie, 'book', {
          from: 'sources/d.md',
          to: 'drafts/d.md',
        });
        expect(moved.status).toBe(200);
        expect(
          await filesChangedOf(observer.take(EVENT_WAIT_MS)),
        ).toMatchObject([
          {
            module: 'project-store',
            type: 'files-changed',
            data: {
              projectId: 'book',
              paths: ['sources/d.md', 'drafts/d.md'],
            },
          },
        ]);
      } finally {
        await observer.close();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('D3: delete and move act on the link the path names; project.yaml is reserved; a move under a file is refused', async () => {
  const fixture = bookLibrary();
  const book = join(fixture.library, 'book');
  try {
    symlinkSync('outline.md', join(book, 'sources', 'link-note.md'));
    symlinkSync('outline.md', join(book, 'sources', 'link-two.md'));

    await withProjectsApp(fixture, async (app, cookie) => {
      const outline = join(book, 'sources', 'outline.md');

      // (1) delete removes the link and leaves its target.
      const deleted = await deleteFile(app, cookie, 'book', {
        path: 'sources/link-note.md',
      });
      expect(deleted.status).toBe(200);
      expect(() => lstatSync(join(book, 'sources', 'link-note.md'))).toThrow();
      expect(readFileSync(outline, 'utf8')).toBe('# Outline\n');

      // (2) move renames the link; the link stays a link and its target is unchanged.
      const moved = await moveFile(app, cookie, 'book', {
        from: 'sources/link-two.md',
        to: 'drafts/link-two.md',
      });
      expect(moved.status).toBe(200);
      expect(
        lstatSync(join(book, 'drafts', 'link-two.md')).isSymbolicLink(),
      ).toBe(true);
      expect(readFileSync(outline, 'utf8')).toBe('# Outline\n');

      // (3) project.yaml at the root is reserved for delete and for either side of a move.
      const projectYaml = join(book, 'project.yaml');
      const yamlBytes = readFileSync(projectYaml);
      const deleteYaml = await deleteFile(app, cookie, 'book', {
        path: 'project.yaml',
      });
      expect(deleteYaml.status).toBe(400);
      expect(errorOf(deleteYaml).code).toBe('PROJECT_PATH_RESERVED');

      const moveOnto = await moveFile(app, cookie, 'book', {
        from: 'sources/outline.md',
        to: 'project.yaml',
      });
      expect(moveOnto.status).toBe(400);
      expect(errorOf(moveOnto).code).toBe('PROJECT_PATH_RESERVED');

      const moveFrom = await moveFile(app, cookie, 'book', {
        from: 'project.yaml',
        to: 'sources/p.yaml',
      });
      expect(moveFrom.status).toBe(400);
      expect(errorOf(moveFrom).code).toBe('PROJECT_PATH_RESERVED');
      expect(readFileSync(projectYaml)).toEqual(yamlBytes);
      expect(readFileSync(outline, 'utf8')).toBe('# Outline\n');

      // (4) A destination that runs through a file is refused, and the outline is unchanged.
      const underFile = await moveFile(app, cookie, 'book', {
        from: 'sources/outline.md',
        to: 'sources/outline.md/child.md',
      });
      expect(underFile.status).toBe(400);
      expect(errorOf(underFile).code).toBe('PROJECT_PATH_INVALID');
      expect(readFileSync(outline, 'utf8')).toBe('# Outline\n');
    });
  } finally {
    fixture.remove();
  }
});

// The files-changed events among the blocks that have arrived, each parsed as a project-store event.
async function filesChangedOf(blocks: Promise<string[]>): Promise<unknown[]> {
  const parsed = (await blocks).map(
    (block) => JSON.parse(dataOf(block)) as unknown,
  );
  return parsed
    .filter(
      (event) => (event as { module?: unknown }).module === 'project-store',
    )
    .map((event) => projectStoreEventSchema.parse(event));
}
