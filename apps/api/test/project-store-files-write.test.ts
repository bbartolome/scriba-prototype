import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  CONTENT_HASH_PATTERN,
  projectStoreEventSchema,
  type FileList,
  type FileRead,
  type FileWriteResult,
} from '@bbartolome/scriba-contracts/project-store';
import { dataOf } from './sse';
import { EVENT_WAIT_MS, LOOPBACK_HOST, observeEvents } from './invariant-sweep';
import {
  bookLibrary,
  editFile,
  isUtcTimestamp,
  listFiles,
  putFile,
  readFile,
  sha256Of,
  writeFile,
} from './project-store-files.kit';
import {
  errorOf,
  readJson,
  withProjectsApp,
} from './project-store-projects.kit';

// Every test builds its own temp library and removes it. Nothing here reads the sample projects.

it('W1: a read gives a sha256 hash; a write with a stale baseHash is refused with PROJECT_WRITE_CONFLICT, and with the current one it succeeds', async () => {
  const fixture = bookLibrary();
  const outline = join(fixture.library, 'book', 'sources', 'outline.md');
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const first = await readFile(app, cookie, 'book', 'sources/outline.md');
      expect(first.status).toBe(200);
      const read1 = readJson<FileRead>(first);
      expect(read1.content).toBe('# Outline\n');
      expect(read1.hash).toMatch(CONTENT_HASH_PATTERN);
      expect(read1.hash).toBe(sha256Of(readFileSync(outline)));
      expect(isUtcTimestamp(read1.mtime)).toBe(true);
      const h1 = read1.hash;

      writeFileSync(outline, '# Outline, changed elsewhere\n');
      const stale = await writeFile(app, cookie, 'book', {
        path: 'sources/outline.md',
        content: '# Outline, saved\n',
        baseHash: h1,
      });
      expect(stale.status).toBe(409);
      expect(errorOf(stale).code).toBe('PROJECT_WRITE_CONFLICT');
      expect(readFileSync(outline, 'utf8')).toBe(
        '# Outline, changed elsewhere\n',
      );

      const second = readJson<FileRead>(
        await readFile(app, cookie, 'book', 'sources/outline.md'),
      );
      const h2 = second.hash;
      expect(h2).not.toBe(h1);
      const saved = await writeFile(app, cookie, 'book', {
        path: 'sources/outline.md',
        content: '# Outline, saved\n',
        baseHash: h2,
      });
      expect(saved.status).toBe(200);
      expect(readJson<FileWriteResult>(saved).hash).toBe(
        sha256Of('# Outline, saved\n'),
      );
      expect(readFileSync(outline, 'utf8')).toBe('# Outline, saved\n');
    });
  } finally {
    fixture.remove();
  }
});

it('W2: edit fails with PROJECT_EDIT_NO_MATCH on zero matches and PROJECT_EDIT_AMBIGUOUS on several, overlapping ones included; a unique match succeeds', async () => {
  const fixture = bookLibrary();
  const book = join(fixture.library, 'book');
  try {
    putFile(fixture.library, 'book/sources/repeat.md', 'cat\ncat\n');
    putFile(fixture.library, 'book/sources/run.md', 'aaa');

    await withProjectsApp(fixture, async (app, cookie) => {
      const outlineBefore = readFileSync(join(book, 'sources', 'outline.md'));
      const none = await editFile(app, cookie, 'book', {
        path: 'sources/outline.md',
        old: 'dog',
        new: 'cat',
      });
      expect(none.status).toBe(409);
      expect(errorOf(none).code).toBe('PROJECT_EDIT_NO_MATCH');
      expect(readFileSync(join(book, 'sources', 'outline.md'))).toEqual(
        outlineBefore,
      );

      const twice = await editFile(app, cookie, 'book', {
        path: 'sources/repeat.md',
        old: 'cat',
        new: 'dog',
      });
      expect(twice.status).toBe(409);
      expect(errorOf(twice).code).toBe('PROJECT_EDIT_AMBIGUOUS');
      expect(readFileSync(join(book, 'sources', 'repeat.md'), 'utf8')).toBe(
        'cat\ncat\n',
      );

      const overlap = await editFile(app, cookie, 'book', {
        path: 'sources/run.md',
        old: 'aa',
        new: 'b',
      });
      expect(overlap.status).toBe(409);
      expect(errorOf(overlap).code).toBe('PROJECT_EDIT_AMBIGUOUS');
      expect(readFileSync(join(book, 'sources', 'run.md'), 'utf8')).toBe('aaa');

      const unique = await editFile(app, cookie, 'book', {
        path: 'sources/outline.md',
        old: '# Outline',
        new: '# Plan',
      });
      expect(unique.status).toBe(200);
      expect(readJson<FileWriteResult>(unique).hash).toBe(sha256Of('# Plan\n'));
      expect(readFileSync(join(book, 'sources', 'outline.md'), 'utf8')).toBe(
        '# Plan\n',
      );
    });
  } finally {
    fixture.remove();
  }
});

it('W3: a project.yaml with comments, reordered keys and an export mapping round-trips; an invalid one fails PROJECT_INVALID and leaves the disk as it was', async () => {
  const fixture = bookLibrary();
  const projectYaml = join(fixture.library, 'book', 'project.yaml');
  const yaml = [
    '# The book, as the author wrote it.',
    'genrePack: nonfiction',
    'title: Book',
    'schemaVersion: 1',
    'export:',
    '  # The output format.',
    '  format: pdf',
    '',
  ].join('\n');
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const saved = await writeFile(app, cookie, 'book', {
        path: 'project.yaml',
        content: yaml,
      });
      expect(saved.status).toBe(200);
      expect(readFileSync(projectYaml, 'utf8')).toBe(yaml);

      const read = readJson<FileRead>(
        await readFile(app, cookie, 'book', 'project.yaml'),
      );
      expect(read.content).toBe(yaml);

      const before = readFileSync(projectYaml);
      const noTitle = await writeFile(app, cookie, 'book', {
        path: 'project.yaml',
        content: 'schemaVersion: 1\ngenrePack: nonfiction\n',
      });
      expect(noTitle.status).toBe(422);
      const error = errorOf(noTitle);
      expect(error.code).toBe('PROJECT_INVALID');
      expect(Array.isArray(error.details)).toBe(true);
      const issues = error.details as { path: unknown; message: unknown }[];
      expect(issues.length).toBeGreaterThan(0);
      for (const issue of issues) {
        expect(issue).toHaveProperty('path');
        expect(typeof issue.message).toBe('string');
      }
      expect(readFileSync(projectYaml)).toEqual(before);
    });
  } finally {
    fixture.remove();
  }
});

it('W4: a too-new project.yaml is refused for write and for read, and the disk is unchanged by a refused write', async () => {
  const fixture = bookLibrary();
  const projectYaml = join(fixture.library, 'book', 'project.yaml');
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const before = readFileSync(projectYaml, 'utf8');
      const tooNew = await writeFile(app, cookie, 'book', {
        path: 'project.yaml',
        content: 'schemaVersion: 2\ntitle: Book\ngenrePack: nonfiction\n',
      });
      expect(tooNew.status).toBe(409);
      expect(errorOf(tooNew).code).toBe('PROJECT_SCHEMA_TOO_NEW');
      expect(readFileSync(projectYaml, 'utf8')).toBe(before);
    });

    writeFileSync(
      projectYaml,
      'schemaVersion: 2\ntitle: Book\ngenrePack: nonfiction\n',
    );
    await withProjectsApp(fixture, async (app, cookie) => {
      const read = await readFile(app, cookie, 'book', 'project.yaml');
      expect(read.status).toBe(409);
      expect(errorOf(read).code).toBe('PROJECT_SCHEMA_TOO_NEW');

      const before = readFileSync(projectYaml, 'utf8');
      const valid = await writeFile(app, cookie, 'book', {
        path: 'project.yaml',
        content: 'schemaVersion: 1\ntitle: Book\ngenrePack: nonfiction\n',
      });
      expect(valid.status).toBe(409);
      expect(errorOf(valid).code).toBe('PROJECT_SCHEMA_TOO_NEW');
      expect(readFileSync(projectYaml, 'utf8')).toBe(before);

      const listed = readJson<FileList>(
        await listFiles(app, cookie, 'book', '.'),
      );
      expect(listed.entries.map((entry) => entry.path)).toContain(
        'project.yaml',
      );
    });
  } finally {
    fixture.remove();
  }
});

it('W5: files-changed arrives on /events after a write and after an edit, with the project and the path', async () => {
  const fixture = bookLibrary();
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const observer = await observeEvents(app.baseUrl, LOOPBACK_HOST, cookie);
      try {
        const written = await writeFile(app, cookie, 'book', {
          path: 'sources/outline.md',
          content: '# Outline, written\n',
        });
        expect(written.status).toBe(200);
        expect(
          await filesChangedOf(observer.take(EVENT_WAIT_MS)),
        ).toMatchObject([
          {
            module: 'project-store',
            type: 'files-changed',
            data: { projectId: 'book', paths: ['sources/outline.md'] },
          },
        ]);

        const edited = await editFile(app, cookie, 'book', {
          path: 'sources/outline.md',
          old: 'written',
          new: 'edited',
        });
        expect(edited.status).toBe(200);
        expect(
          await filesChangedOf(observer.take(EVENT_WAIT_MS)),
        ).toMatchObject([
          {
            module: 'project-store',
            type: 'files-changed',
            data: { projectId: 'book', paths: ['sources/outline.md'] },
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

it('X1: a BOM and CRLF file reads with U+FEFF first, writes back byte-identical, and its hash covers the bytes', async () => {
  const fixture = bookLibrary();
  const bom = join(fixture.library, 'book', 'sources', 'bom.md');
  const original = Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    Buffer.from('Hello\r\nWorld\r\n', 'utf8'),
  ]);
  try {
    putFile(fixture.library, 'book/sources/bom.md', original);

    await withProjectsApp(fixture, async (app, cookie) => {
      const read = readJson<FileRead>(
        await readFile(app, cookie, 'book', 'sources/bom.md'),
      );
      expect(read.content.charAt(0)).toBe('﻿');
      expect(read.content.slice(1)).toBe('Hello\r\nWorld\r\n');
      expect(read.hash).toBe(sha256Of(original));

      const saved = await writeFile(app, cookie, 'book', {
        path: 'sources/bom.md',
        content: read.content,
        baseHash: read.hash,
      });
      expect(saved.status).toBe(200);
      expect(Buffer.compare(readFileSync(bom), original)).toBe(0);
      expect(statSync(bom).size).toBe(original.length);
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
