import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  ACTIVE_PROJECT_ROUTE,
  searchResultSchema,
  type SearchResult,
} from '@bbartolome/scriba-contracts/project-store';
import type { Reply } from './guard-request';
import {
  indexFolder,
  readUserVersion,
  search,
  writeIndexDb,
} from './project-store-search.kit';
import { bookLibrary, putFile } from './project-store-files.kit';
import { postJson, withProjectsApp } from './project-store-projects.kit';

// Every test builds its own temp library and removes it. Nothing here reads the sample projects.

// The search answer of a reply, which must be a 200, parsed with the contract's schema.
function resultsOf(reply: Reply): SearchResult {
  expect(reply.status).toBe(200);
  return searchResultSchema.parse(JSON.parse(reply.body));
}

// The paths of a search answer, in the order the answer gives them.
function pathsOf(reply: Reply): string[] {
  return resultsOf(reply).map((result) => result.path);
}

it('T1: a query returns ranked passages, and the passage text sits at its offset in the file', async () => {
  const fixture = bookLibrary();
  const book = join(fixture.library, 'book');
  try {
    // The non-ASCII lead-in makes a UTF-8 byte offset differ from the UTF-16 offset of the passage.
    putFile(
      fixture.library,
      'book/sources/quotes.md',
      'Ünïcode lead-in.\n\nGamma rays and gamma bursts.\n\nA gamma note.\n',
    );
    putFile(
      fixture.library,
      'book/entities/gamma-ray.md',
      '---\nid: gamma-ray\ntype: concept\ntitle: Gamma ray\n---\nGamma light is short.\n',
    );
    await withProjectsApp(fixture, async (app, cookie) => {
      const results = resultsOf(
        await search(app, cookie, 'book', { query: 'gamma' }),
      );
      expect(results.length).toBeGreaterThanOrEqual(4);
      for (let i = 1; i < results.length; i += 1) {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
      }
      for (const result of results) {
        expect(
          result.path.startsWith('sources/') ||
            result.path.startsWith('entities/'),
        ).toBe(true);
        const text = readFileSync(join(book, result.path), 'utf8');
        expect(text.startsWith(result.snippet, result.offset)).toBe(true);
      }
    });
  } finally {
    fixture.remove();
  }
});

it('T2: a host edit shows in the next query, and a deleted file disappears, with no rebuild', async () => {
  const fixture = bookLibrary();
  const animals = join(fixture.library, 'book', 'sources', 'animals.md');
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      expect(
        pathsOf(await search(app, cookie, 'book', { query: 'zebra' })),
      ).toEqual([]);

      putFile(
        fixture.library,
        'book/sources/animals.md',
        'A zebra crossed the plain.\n',
      );
      expect(
        pathsOf(await search(app, cookie, 'book', { query: 'zebra' })),
      ).toEqual(['sources/animals.md']);

      // The rewrite changes the size, so the check does not depend on the mtime resolution.
      putFile(
        fixture.library,
        'book/sources/animals.md',
        'An elephant crossed the plain, slowly and calmly.\n',
      );
      expect(
        pathsOf(await search(app, cookie, 'book', { query: 'zebra' })),
      ).toEqual([]);
      expect(
        pathsOf(await search(app, cookie, 'book', { query: 'elephant' })),
      ).toEqual(['sources/animals.md']);

      rmSync(animals);
      expect(
        pathsOf(await search(app, cookie, 'book', { query: 'elephant' })),
      ).toEqual([]);
    });
  } finally {
    fixture.remove();
  }
});

it('T3: files in drafts/, graphs/, logs/ and snapshots/ never appear in results', async () => {
  const fixture = bookLibrary();
  try {
    for (const path of [
      'book/drafts/chapter-1.md',
      'book/graphs/g.md',
      'book/logs/l.md',
      'book/snapshots/s.md',
      'book/sources/notes.md',
    ]) {
      putFile(fixture.library, path, 'The harbour was quiet.\n');
    }
    await withProjectsApp(fixture, async (app, cookie) => {
      const paths = pathsOf(
        await search(app, cookie, 'book', { query: 'harbour' }),
      );
      expect(paths).toContain('sources/notes.md');
      for (const path of paths) {
        expect(path.startsWith('drafts/')).toBe(false);
        expect(path.startsWith('graphs/')).toBe(false);
        expect(path.startsWith('logs/')).toBe(false);
        expect(path.startsWith('snapshots/')).toBe(false);
      }
    });
  } finally {
    fixture.remove();
  }
});

it('T4: an index whose user_version differs is rebuilt, and the results stay correct', async () => {
  const fixture = bookLibrary();
  const file = join(indexFolder(fixture.library), 'book.db');
  try {
    putFile(
      fixture.library,
      'book/sources/a.md',
      'Lighthouse keepers wrote logs.\n',
    );
    await withProjectsApp(fixture, async (app, cookie) => {
      expect(
        pathsOf(await search(app, cookie, 'book', { query: 'lighthouse' })),
      ).toEqual(['sources/a.md']);
      const formatBefore = readUserVersion(file);
      expect(formatBefore).toBeGreaterThan(0);

      writeIndexDb(file, formatBefore + 1, [
        { path: 'sources/ghost.md', offset: 0, body: 'Phantom passage' },
      ]);
      expect(
        pathsOf(await search(app, cookie, 'book', { query: 'phantom' })),
      ).toEqual([]);
      expect(
        pathsOf(await search(app, cookie, 'book', { query: 'lighthouse' })),
      ).toEqual(['sources/a.md']);
      expect(readUserVersion(file)).toBe(formatBefore);
    });
  } finally {
    fixture.remove();
  }
});

it('T5: queries with quotes, *, -, NEAR or a NUL character do not error', async () => {
  const fixture = bookLibrary();
  try {
    putFile(
      fixture.library,
      'book/sources/terms.md',
      'The word NEAR and a - dash and a * star.\n',
    );
    const queries = [
      '"',
      '*',
      '-',
      'NEAR',
      '"quoted phrase"',
      'NEAR(a b)',
      'a OR b',
      '(',
      'gam\u0000ma',
      '   ',
    ];
    await withProjectsApp(fixture, async (app, cookie) => {
      for (const query of queries) {
        const reply = await search(app, cookie, 'book', { query });
        expect(reply.status, JSON.stringify(query)).toBe(200);
        searchResultSchema.parse(JSON.parse(reply.body));
      }
      expect(
        pathsOf(await search(app, cookie, 'book', { query: 'NEAR' })),
      ).toContain('sources/terms.md');
      for (const query of ['"', '*', '-', '(', '   ']) {
        expect(pathsOf(await search(app, cookie, 'book', { query }))).toEqual(
          [],
        );
      }
    });
  } finally {
    fixture.remove();
  }
});

it('T6: an orphan index is removed at startup, and an unusual project id gets a safe file name', async () => {
  const fixture = bookLibrary();
  const odd = 'Ünï book (v2) 100%';
  const index = indexFolder(fixture.library);
  try {
    putFile(
      fixture.library,
      `${odd}/project.yaml`,
      'schemaVersion: 1\ntitle: Odd\ngenrePack: nonfiction\n',
    );
    putFile(
      fixture.library,
      `${odd}/sources/odd.md`,
      'Odd passage about kites.\n',
    );
    putFile(fixture.library, '.scriba/index/gone-folder.db', 'orphan');
    putFile(fixture.library, '.scriba/index/book.db', 'live');

    await withProjectsApp(fixture, async (app, cookie) => {
      expect(existsSync(join(index, 'gone-folder.db'))).toBe(false);
      expect(readFileSync(join(index, 'book.db'), 'utf8')).toBe('live');

      const activated = await postJson(app, cookie, ACTIVE_PROJECT_ROUTE, {
        projectId: odd,
      });
      expect(activated.status).toBe(200);
      expect(
        pathsOf(await search(app, cookie, odd, { query: 'kites' })),
      ).toEqual(['sources/odd.md']);
      expect(existsSync(join(index, `${encodeURIComponent(odd)}.db`))).toBe(
        true,
      );
    });
  } finally {
    fixture.remove();
  }
});
