import { lstatSync, readFileSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { FILE_SIZE_CAP_BYTES } from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import { postJsonPlain, type PlainReply } from './project-store-active.kit';
import {
  bookLibrary,
  editFile,
  filesKitModule,
  listFiles,
  readFile,
  writeFile,
} from './project-store-files.kit';
import {
  buildProjectsLibrary,
  errorOf,
  withProjectsApp,
  type ErrorBody,
} from './project-store-projects.kit';

// Every test builds its own temp library and removes it. Nothing here reads the sample projects.

const KIT = '/api/project-store-test/files';

// Boots the kit module (the in-process provider, no guard) on the library. The library is removed by the caller.
async function withFilesKit(
  library: string,
  run: (app: TestApp) => Promise<void>,
): Promise<void> {
  const app = await createTestApp({
    libraryDir: library,
    modules: [filesKitModule()],
  });
  try {
    await run(app);
  } finally {
    await app.close();
  }
}

// The error code of a plain reply from the kit module.
function codeOf(reply: PlainReply): string {
  return (reply.json as ErrorBody).error.code;
}

it('X3: the in-process provider runs the active check, the path check and the size cap', async () => {
  const none = buildProjectsLibrary();
  try {
    await withFilesKit(none.library, async (app) => {
      const reply = await postJsonPlain(app.baseUrl, `${KIT}/list`, {
        projectId: 'book',
        path: '.',
      });
      expect(reply.status).toBe(409);
      expect(codeOf(reply)).toBe('PROJECT_NO_ACTIVE');
    });
  } finally {
    none.remove();
  }

  const fixture = bookLibrary();
  try {
    await withFilesKit(fixture.library, async (app) => {
      const notActive = await postJsonPlain(app.baseUrl, `${KIT}/list`, {
        projectId: 'draft-only',
        path: '.',
      });
      expect(notActive.status).toBe(409);
      expect(codeOf(notActive)).toBe('PROJECT_NOT_ACTIVE');

      const outside = await postJsonPlain(app.baseUrl, `${KIT}/read`, {
        projectId: 'book',
        path: '../x',
      });
      expect(outside.status).toBe(400);
      expect(codeOf(outside)).toBe('PROJECT_PATH_INVALID');

      const reserved = await postJsonPlain(app.baseUrl, `${KIT}/read`, {
        projectId: 'book',
        path: '.scriba/settings.yaml',
      });
      expect(reserved.status).toBe(400);
      expect(codeOf(reserved)).toBe('PROJECT_PATH_RESERVED');

      const tooLarge = await postJsonPlain(app.baseUrl, `${KIT}/fill-write`, {
        projectId: 'book',
        path: 'sources/big.md',
        bytes: FILE_SIZE_CAP_BYTES + 1,
      });
      expect(tooLarge.status).toBe(413);
      expect(codeOf(tooLarge)).toBe('PROJECT_FILE_TOO_LARGE');

      const emptyOld = await postJsonPlain(app.baseUrl, `${KIT}/edit`, {
        projectId: 'book',
        path: 'sources/outline.md',
        old: '',
        new: 'x',
      });
      expect(emptyOld.status).toBe(400);
      expect(codeOf(emptyOld)).toBe('PLATFORM_VALIDATION_FAILED');
    });
  } finally {
    fixture.remove();
  }
});

it('X4: the HTTP routes refuse a non-active or missing project, bad paths, folders and reads; a write through a link keeps the link', async () => {
  const notActive = bookLibrary();
  try {
    await withProjectsApp(notActive, async (app, cookie) => {
      const list = await listFiles(app, cookie, 'draft-only', '.');
      expect(list.status).toBe(409);
      expect(errorOf(list).code).toBe('PROJECT_NOT_ACTIVE');

      const read = await readFile(
        app,
        cookie,
        'draft-only',
        'sources/notes.md',
      );
      expect(read.status).toBe(409);
      expect(errorOf(read).code).toBe('PROJECT_NOT_ACTIVE');

      const write = await writeFile(app, cookie, 'draft-only', {
        path: 'sources/notes.md',
        content: 'Changed.\n',
      });
      expect(write.status).toBe(409);
      expect(errorOf(write).code).toBe('PROJECT_NOT_ACTIVE');

      const edit = await editFile(app, cookie, 'draft-only', {
        path: 'sources/notes.md',
        old: 'Notes',
        new: 'Changed',
      });
      expect(edit.status).toBe(409);
      expect(errorOf(edit).code).toBe('PROJECT_NOT_ACTIVE');
    });
  } finally {
    notActive.remove();
  }

  const gone = buildProjectsLibrary({
    settings:
      'schemaVersion: 1\nprojects:\n  schemaVersion: 1\n  active: gone\n',
  });
  try {
    await withProjectsApp(gone, async (app, cookie) => {
      const list = await listFiles(app, cookie, 'gone', '.');
      expect(list.status).toBe(404);
      expect(errorOf(list).code).toBe('PROJECT_NOT_FOUND');

      const write = await writeFile(app, cookie, 'gone', {
        path: 'sources/x.md',
        content: 'x\n',
      });
      expect(write.status).toBe(404);
      expect(errorOf(write).code).toBe('PROJECT_NOT_FOUND');
    });
  } finally {
    gone.remove();
  }

  const fixture = bookLibrary();
  const book = join(fixture.library, 'book');
  try {
    symlinkSync('outline.md', join(book, 'sources', 'link-note.md'));
    await withProjectsApp(fixture, async (app, cookie) => {
      const missing = await readFile(app, cookie, 'book', 'sources/missing.md');
      expect(missing.status).toBe(404);
      expect(errorOf(missing).code).toBe('PROJECT_NOT_FOUND');

      const folder = await readFile(app, cookie, 'book', 'sources');
      expect(folder.status).toBe(404);
      expect(errorOf(folder).code).toBe('PROJECT_NOT_FOUND');

      const listFile = await listFiles(
        app,
        cookie,
        'book',
        'sources/outline.md',
      );
      expect(listFile.status).toBe(404);
      expect(errorOf(listFile).code).toBe('PROJECT_NOT_FOUND');

      const onFolder = await writeFile(app, cookie, 'book', {
        path: 'sources',
        content: 'x\n',
      });
      expect(onFolder.status).toBe(400);
      expect(errorOf(onFolder).code).toBe('PROJECT_PATH_INVALID');

      const throughFile = await writeFile(app, cookie, 'book', {
        path: 'sources/outline.md/child.md',
        content: 'x\n',
      });
      expect(throughFile.status).toBe(400);
      expect(errorOf(throughFile).code).toBe('PROJECT_PATH_INVALID');

      const created = await writeFile(app, cookie, 'book', {
        path: 'drafts/new/x.md',
        content: 'Made.\n',
      });
      expect(created.status).toBe(200);
      expect(readFileSync(join(book, 'drafts', 'new', 'x.md'), 'utf8')).toBe(
        'Made.\n',
      );

      const linked = await writeFile(app, cookie, 'book', {
        path: 'sources/link-note.md',
        content: 'Through the link.\n',
      });
      expect(linked.status).toBe(200);
      expect(readFileSync(join(book, 'sources', 'outline.md'), 'utf8')).toBe(
        'Through the link.\n',
      );
      expect(
        lstatSync(join(book, 'sources', 'link-note.md')).isSymbolicLink(),
      ).toBe(true);

      const dotDot = await readFile(
        app,
        cookie,
        'book',
        '../book/project.yaml',
      );
      expect(dotDot.status).toBe(400);
      expect(errorOf(dotDot).code).toBe('PROJECT_PATH_INVALID');
    });
  } finally {
    fixture.remove();
  }
});
