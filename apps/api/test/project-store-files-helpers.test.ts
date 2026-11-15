import {
  existsSync,
  readFileSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import type { FileWriteResult } from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import { dataOf } from './sse';
import { EVENT_WAIT_MS, LOOPBACK_HOST, observeEvents } from './invariant-sweep';
import {
  bookLibrary,
  deleteFile,
  entryPaths,
  filesKitModule,
  isUtcTimestamp,
  listFiles,
  moveFile,
  putFile,
  readFile,
  sha256Of,
  writeFile,
} from './project-store-files.kit';
import {
  errorOf,
  withProjectsApp,
  type ErrorBody,
} from './project-store-projects.kit';

// Every test builds its own temp library and removes it. Nothing here reads the sample projects.
// The in-process helpers have no HTTP route, so these tests reach them through the kit module (no guard).

const KIT = '/api/project-store-test/files';

// One line of text, ending with a line feed.
function lines(...text: string[]): string {
  return text.map((line) => `${line}\n`).join('');
}

// A reply of the kit module: its status and its body text. A void answer has an empty body.
interface KitReply {
  status: number;
  text: string;
}

// One POST of a route of the kit module, with a JSON body and no cookie (the kit app has no guard).
async function kitPost(
  baseUrl: string,
  route: string,
  body: unknown,
): Promise<KitReply> {
  const response = await fetch(`${baseUrl}${KIT}/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, text: await response.text() };
}

// The error code of a refused reply of the kit module.
function kitCode(reply: KitReply): string {
  return (JSON.parse(reply.text) as ErrorBody).error.code;
}

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

// The blocks of project-store events among the blocks that have arrived.
function projectStoreBlocks(blocks: string[]): string[] {
  return blocks.filter(
    (block) =>
      (JSON.parse(dataOf(block)) as { module?: unknown }).module ===
      'project-store',
  );
}

// The project.yaml of U1: a comment, the schema version, a key with a trailing comment, a comment above the
// genre pack, the genre pack, and a mapping with one key.
const FIXTURE = lines(
  '# The book record. Comments and key order must survive an update.',
  'schemaVersion: 1',
  'title: Book # working title',
  '# Genre pack for the book.',
  'genrePack: nonfiction',
  'export:',
  '  template: default',
);

it('U1: updateProjectYaml changes only the named key: a fixture with comments is byte-identical outside that key; an invalid patch is refused and the file is unchanged', async () => {
  const fixture = bookLibrary();
  const projectYaml = join(fixture.library, 'book', 'project.yaml');
  try {
    writeFileSync(projectYaml, FIXTURE);
    await withFilesKit(fixture.library, async (app) => {
      // (1) A new title keeps its trailing comment.
      const titled = await kitPost(app.baseUrl, 'update-yaml', {
        projectId: 'book',
        patch: { title: 'New Title' },
      });
      expect(titled.status).toBe(200);
      const answer = JSON.parse(titled.text) as FileWriteResult;
      const titledText = lines(
        '# The book record. Comments and key order must survive an update.',
        'schemaVersion: 1',
        'title: New Title # working title',
        '# Genre pack for the book.',
        'genrePack: nonfiction',
        'export:',
        '  template: default',
      );
      expect(answer.path).toBe('project.yaml');
      expect(answer.hash).toBe(sha256Of(titledText));
      expect(isUtcTimestamp(answer.mtime)).toBe(true);
      expect(readFileSync(projectYaml, 'utf8')).toBe(titledText);

      // (2) A nested key changes; the rest stays.
      writeFileSync(projectYaml, FIXTURE);
      const nested = await kitPost(app.baseUrl, 'update-yaml', {
        projectId: 'book',
        patch: { export: { template: 'custom' } },
      });
      expect(nested.status).toBe(200);
      expect(readFileSync(projectYaml, 'utf8')).toBe(
        lines(
          '# The book record. Comments and key order must survive an update.',
          'schemaVersion: 1',
          'title: Book # working title',
          '# Genre pack for the book.',
          'genrePack: nonfiction',
          'export:',
          '  template: custom',
        ),
      );

      // (3) A new key is appended as a block mapping.
      writeFileSync(projectYaml, FIXTURE);
      const added = await kitPost(app.baseUrl, 'update-yaml', {
        projectId: 'book',
        patch: { model: { providerId: 'ollama', model: 'llama3' } },
      });
      expect(added.status).toBe(200);
      expect(readFileSync(projectYaml, 'utf8')).toBe(
        `${FIXTURE}model:\n  providerId: ollama\n  model: llama3\n`,
      );

      // (4) A null removes the key and its mapping.
      writeFileSync(projectYaml, FIXTURE);
      const removed = await kitPost(app.baseUrl, 'update-yaml', {
        projectId: 'book',
        patch: { export: null },
      });
      expect(removed.status).toBe(200);
      expect(readFileSync(projectYaml, 'utf8')).toBe(
        lines(
          '# The book record. Comments and key order must survive an update.',
          'schemaVersion: 1',
          'title: Book # working title',
          '# Genre pack for the book.',
          'genrePack: nonfiction',
        ),
      );

      // (5) Invalid results are refused before any write, and the file keeps its bytes.
      for (const patch of [{ title: 42 }, { title: null }]) {
        writeFileSync(projectYaml, FIXTURE);
        const invalid = await kitPost(app.baseUrl, 'update-yaml', {
          projectId: 'book',
          patch,
        });
        expect(invalid.status).toBe(422);
        expect(kitCode(invalid)).toBe('PROJECT_INVALID');
        const details = (JSON.parse(invalid.text) as ErrorBody).error.details;
        expect(Array.isArray(details) && details.length > 0).toBe(true);
        expect(readFileSync(projectYaml, 'utf8')).toBe(FIXTURE);
      }

      writeFileSync(projectYaml, FIXTURE);
      const tooNew = await kitPost(app.baseUrl, 'update-yaml', {
        projectId: 'book',
        patch: { schemaVersion: 2 },
      });
      expect(tooNew.status).toBe(409);
      expect(kitCode(tooNew)).toBe('PROJECT_SCHEMA_TOO_NEW');
      expect(readFileSync(projectYaml, 'utf8')).toBe(FIXTURE);
    });
  } finally {
    fixture.remove();
  }
});

it('L1: appendLog refuses paths outside logs/, works for a non-active ok project, and appends exactly one line', async () => {
  const fixture = bookLibrary();
  const book = join(fixture.library, 'book');
  putFile(
    fixture.library,
    'other/project.yaml',
    'schemaVersion: 1\ntitle: Other\ngenrePack: nonfiction\n',
  );
  try {
    await withFilesKit(fixture.library, async (app) => {
      // (1) Control, first so that logs/ does not exist yet: two lines, one folder, one file.
      const one = await kitPost(app.baseUrl, 'append-log', {
        projectId: 'book',
        path: 'logs/./run.log',
        line: 'one',
      });
      expect(one.status).toBe(200);
      const two = await kitPost(app.baseUrl, 'append-log', {
        projectId: 'book',
        path: 'logs/./run.log',
        line: 'two',
      });
      expect(two.status).toBe(200);
      expect(statSync(join(book, 'logs')).isDirectory()).toBe(true);
      expect(readFileSync(join(book, 'logs', 'run.log'), 'utf8')).toBe(
        'one\ntwo\n',
      );

      // (2) Paths outside logs/ are refused, and so is a link out of logs/.
      for (const path of ['sources/a.log', 'logs/../x.log', 'logs']) {
        const reply = await kitPost(app.baseUrl, 'append-log', {
          projectId: 'book',
          path,
          line: 'x',
        });
        expect(reply.status).toBe(400);
        expect(kitCode(reply)).toBe('PROJECT_PATH_INVALID');
      }
      symlinkSync('../sources/outline.md', join(book, 'logs', 'link.log'));
      const linked = await kitPost(app.baseUrl, 'append-log', {
        projectId: 'book',
        path: 'logs/link.log',
        line: 'x',
      });
      expect(linked.status).toBe(400);
      expect(kitCode(linked)).toBe('PROJECT_PATH_INVALID');
      expect(readFileSync(join(book, 'sources', 'outline.md'), 'utf8')).toBe(
        '# Outline\n',
      );

      // (3) A project that is ok but not active accepts the line.
      const other = await kitPost(app.baseUrl, 'append-log', {
        projectId: 'other',
        path: 'logs/other.log',
        line: 'x',
      });
      expect(other.status).toBe(200);
      expect(
        readFileSync(
          join(fixture.library, 'other', 'logs', 'other.log'),
          'utf8',
        ),
      ).toBe('x\n');
    });
  } finally {
    fixture.remove();
  }
});

it('T1: stateDir creates and returns .scriba/<owner>/, which remains unreachable through the public file API', async () => {
  const fixture = bookLibrary();
  const book = join(fixture.library, 'book');
  const state = join(book, '.scriba', 'compile-export');
  const exportsPath = '.scriba/compile-export/exports.txt';
  try {
    // (1) The kit module creates the folder and answers its path.
    await withFilesKit(fixture.library, async (app) => {
      const reply = await kitPost(app.baseUrl, 'state-dir', {
        projectId: 'book',
        owner: 'compile-export',
      });
      expect(reply.status).toBe(200);
      expect(JSON.parse(reply.text)).toEqual({ path: state });
    });
    expect(statSync(state).isDirectory()).toBe(true);

    // (2) The owner writes with plain fs.
    writeFileSync(join(state, 'exports.txt'), 'exported\n');

    // (3) The public file API refuses the folder in every way.
    await withProjectsApp(fixture, async (app, cookie) => {
      const read = await readFile(app, cookie, 'book', exportsPath);
      expect(read.status).toBe(400);
      expect(errorOf(read).code).toBe('PROJECT_PATH_RESERVED');

      const folder = await listFiles(app, cookie, 'book', '.scriba');
      expect(folder.status).toBe(400);
      expect(errorOf(folder).code).toBe('PROJECT_PATH_RESERVED');

      const root = await listFiles(app, cookie, 'book', '.');
      expect(root.status).toBe(200);
      expect(entryPaths(root)).not.toContain('.scriba');

      const write = await writeFile(app, cookie, 'book', {
        path: '.scriba/compile-export/new.txt',
        content: 'new\n',
      });
      expect(write.status).toBe(400);
      expect(errorOf(write).code).toBe('PROJECT_PATH_RESERVED');

      const remove = await deleteFile(app, cookie, 'book', {
        path: exportsPath,
      });
      expect(remove.status).toBe(400);
      expect(errorOf(remove).code).toBe('PROJECT_PATH_RESERVED');

      const out = await moveFile(app, cookie, 'book', {
        from: exportsPath,
        to: 'sources/x.txt',
      });
      expect(out.status).toBe(400);
      expect(errorOf(out).code).toBe('PROJECT_PATH_RESERVED');

      const into = await moveFile(app, cookie, 'book', {
        from: 'sources/outline.md',
        to: '.scriba/x.md',
      });
      expect(into.status).toBe(400);
      expect(errorOf(into).code).toBe('PROJECT_PATH_RESERVED');

      expect(readFileSync(join(state, 'exports.txt'), 'utf8')).toBe(
        'exported\n',
      );
      expect(existsSync(join(state, 'new.txt'))).toBe(false);
      expect(existsSync(join(book, 'sources', 'x.txt'))).toBe(false);

      // (4) A link inside the project that points into the folder is refused too.
      symlinkSync(
        '../.scriba/compile-export',
        join(book, 'sources', 'state-link'),
      );
      const through = await readFile(
        app,
        cookie,
        'book',
        'sources/state-link/exports.txt',
      );
      expect(through.status).toBe(400);
      expect(errorOf(through).code).toBe('PROJECT_PATH_RESERVED');
      expect(existsSync(join(state, 'exports.txt'))).toBe(true);
    });
  } finally {
    fixture.remove();
  }
});

it('H1: the refusals of the three helpers, and appendLog publishes nothing', async () => {
  const fixture = bookLibrary();
  const book = join(fixture.library, 'book');
  try {
    await withFilesKit(fixture.library, async (app) => {
      // (1) updateProjectYaml needs the active project.
      const yaml = await kitPost(app.baseUrl, 'update-yaml', {
        projectId: 'draft-only',
        patch: { title: 'X' },
      });
      expect(yaml.status).toBe(409);
      expect(kitCode(yaml)).toBe('PROJECT_NOT_ACTIVE');

      // (2) appendLog refuses a folder that is not an ok project, and creates no logs/ folder.
      const importable = await kitPost(app.baseUrl, 'append-log', {
        projectId: 'draft-only',
        path: 'logs/x.log',
        line: 'x',
      });
      expect(importable.status).toBe(404);
      expect(kitCode(importable)).toBe('PROJECT_NOT_FOUND');

      const invalid = await kitPost(app.baseUrl, 'append-log', {
        projectId: 'bad',
        path: 'logs/x.log',
        line: 'x',
      });
      expect(invalid.status).toBe(422);
      expect(kitCode(invalid)).toBe('PROJECT_INVALID');
      const details = (JSON.parse(invalid.text) as ErrorBody).error.details;
      expect(Array.isArray(details) && details.length > 0).toBe(true);

      const tooNew = await kitPost(app.baseUrl, 'append-log', {
        projectId: 'later',
        path: 'logs/x.log',
        line: 'x',
      });
      expect(tooNew.status).toBe(409);
      expect(kitCode(tooNew)).toBe('PROJECT_SCHEMA_TOO_NEW');

      for (const folder of ['draft-only', 'bad', 'later']) {
        expect(existsSync(join(fixture.library, folder, 'logs'))).toBe(false);
      }

      // (3) A line with a line break is refused, and no file is created.
      for (const line of ['a\nb', 'a\rb']) {
        const reply = await kitPost(app.baseUrl, 'append-log', {
          projectId: 'book',
          path: 'logs/x.log',
          line,
        });
        expect(reply.status).toBe(400);
        expect(kitCode(reply)).toBe('PLATFORM_VALIDATION_FAILED');
      }
      expect(existsSync(join(book, 'logs'))).toBe(false);

      // (4) A successful appendLog publishes no project-store event.
      const observer = await observeEvents(app.baseUrl, LOOPBACK_HOST, '');
      try {
        const logged = await kitPost(app.baseUrl, 'append-log', {
          projectId: 'book',
          path: 'logs/x.log',
          line: 'quiet',
        });
        expect(logged.status).toBe(200);
        expect(projectStoreBlocks(await observer.take(EVENT_WAIT_MS))).toEqual(
          [],
        );
      } finally {
        await observer.close();
      }

      // (5) stateDir needs the active project, and its owner must be a module slug.
      const notActive = await kitPost(app.baseUrl, 'state-dir', {
        projectId: 'draft-only',
        owner: 'compile-export',
      });
      expect(notActive.status).toBe(409);
      expect(kitCode(notActive)).toBe('PROJECT_NOT_ACTIVE');

      for (const owner of ['Compile', '../x']) {
        const reply = await kitPost(app.baseUrl, 'state-dir', {
          projectId: 'book',
          owner,
        });
        expect(reply.status).toBe(400);
        expect(kitCode(reply)).toBe('PLATFORM_VALIDATION_FAILED');
      }

      // (6) Last: a .scriba folder that is a link into the project is refused before anything is created.
      symlinkSync('sources', join(book, '.scriba'));
      const linked = await kitPost(app.baseUrl, 'state-dir', {
        projectId: 'book',
        owner: 'compile-export',
      });
      expect(linked.status).toBe(400);
      expect(kitCode(linked)).toBe('PROJECT_PATH_OUTSIDE');
      expect(existsSync(join(book, 'sources', 'compile-export'))).toBe(false);
    });
  } finally {
    fixture.remove();
  }
});

// A 90-column plain line under title, as the long-line case of H2 needs.
const LONG_NOTE =
  'note: The quick brown fox jumps over the lazy dog, then it runs into the wide green field.';

it('H2: updateProjectYaml keeps a BOM, CRLF endings and a long line', async () => {
  const fixture = bookLibrary();
  const projectYaml = join(fixture.library, 'book', 'project.yaml');
  try {
    expect(LONG_NOTE).toHaveLength(90);
    await withFilesKit(fixture.library, async (app) => {
      // (1) A BOM, LF endings and a 90-column line: the BOM and the line survive.
      writeFileSync(
        projectYaml,
        `﻿${lines('schemaVersion: 1', 'title: Book', LONG_NOTE, 'genrePack: nonfiction')}`,
      );
      const bom = await kitPost(app.baseUrl, 'update-yaml', {
        projectId: 'book',
        patch: { title: 'New' },
      });
      expect(bom.status).toBe(200);
      expect(readFileSync(projectYaml).subarray(0, 3)).toEqual(
        Buffer.from([0xef, 0xbb, 0xbf]),
      );
      expect(readFileSync(projectYaml, 'utf8')).toBe(
        `﻿${lines('schemaVersion: 1', 'title: New', LONG_NOTE, 'genrePack: nonfiction')}`,
      );

      // (2) CRLF endings are kept on every line.
      writeFileSync(
        projectYaml,
        'schemaVersion: 1\r\ntitle: Book\r\ngenrePack: nonfiction\r\n',
      );
      const crlf = await kitPost(app.baseUrl, 'update-yaml', {
        projectId: 'book',
        patch: { title: 'New' },
      });
      expect(crlf.status).toBe(200);
      expect(readFileSync(projectYaml, 'utf8')).toBe(
        'schemaVersion: 1\r\ntitle: New\r\ngenrePack: nonfiction\r\n',
      );
    });
  } finally {
    fixture.remove();
  }
});

it('H3: a file with mixed LF and CRLF endings comes out all-CRLF', async () => {
  const fixture = bookLibrary();
  const projectYaml = join(fixture.library, 'book', 'project.yaml');
  try {
    await withFilesKit(fixture.library, async (app) => {
      writeFileSync(
        projectYaml,
        'schemaVersion: 1\r\ntitle: Book\ngenrePack: nonfiction\r\nexport:\n  template: default\r\n',
      );
      const reply = await kitPost(app.baseUrl, 'update-yaml', {
        projectId: 'book',
        patch: { title: 'New' },
      });
      expect(reply.status).toBe(200);
      const bytes = readFileSync(projectYaml, 'utf8');
      expect(bytes).toBe(
        'schemaVersion: 1\r\ntitle: New\r\ngenrePack: nonfiction\r\nexport:\r\n  template: default\r\n',
      );
      expect(/(^|[^\r])\n/.test(bytes)).toBe(false);
    });
  } finally {
    fixture.remove();
  }
});
