import { readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  FILE_SIZE_CAP_BYTES,
  entityListSchema,
  entityResolutionSchema,
  type EntityList,
  type EntityResolution,
} from '@bbartolome/scriba-contracts/project-store';
import type { Reply } from './guard-request';
import {
  EVENT_WAIT_MS,
  LOOPBACK_HOST,
  observeEvents,
  snapshotLibrary,
} from './invariant-sweep';
import { bookLibrary, putFile } from './project-store-files.kit';
import { listEntities, resolveEntities } from './project-store-entities.kit';
import { changedPaths, withProjectsApp } from './project-store-projects.kit';

// Every test builds its own temp library and removes it. Nothing here reads the sample projects.

// The entity files of the tests. ann-lovelace and ann-two both have the id ann.
const ANN_LOVELACE = '---\nid: ann\ntype: person\n---\nAnn Lovelace.\n';
const ANN_TWO = '---\nid: ann\ntype: person\n---\nA second Ann.\n';
const CARL = '---\ntype: person\n---\nCarl.\n';

// The list answer of a reply, which must be a 200, parsed with the contract's schema.
function listOf(reply: Reply): EntityList {
  expect(reply.status).toBe(200);
  return entityListSchema.parse(JSON.parse(reply.body));
}

// The resolution answer of a reply, which must be a 200, parsed with the contract's schema.
function resolutionOf(reply: Reply): EntityResolution {
  expect(reply.status).toBe(200);
  return entityResolutionSchema.parse(JSON.parse(reply.body));
}

it('E1: resolution returns contents for IDs in entities/ (by id and by stem) and sources/ (with and without front matter)', async () => {
  const fixture = bookLibrary();
  const book = join(fixture.library, 'book');
  try {
    putFile(fixture.library, 'book/entities/ann-lovelace.md', ANN_LOVELACE);
    putFile(
      fixture.library,
      'book/entities/bob.md',
      '---\ntype: place\n---\nBob is a place.\n',
    );
    putFile(
      fixture.library,
      'book/sources/notes.md',
      '---\ntitle: Notes\n---\nNotes.\n',
    );
    await withProjectsApp(fixture, async (app, cookie) => {
      const reply = await resolveEntities(app, cookie, 'book', [
        'ann',
        'bob',
        'outline',
        'notes',
      ]);
      expect(reply.status).toBe(200);
      const body = resolutionOf(reply);
      expect(body.resolved.map((item) => item.path)).toEqual([
        'entities/ann-lovelace.md',
        'entities/bob.md',
        'sources/outline.md',
        'sources/notes.md',
      ]);
      expect(body.resolved.map((item) => item.id)).toEqual([
        'ann',
        'bob',
        'outline',
        'notes',
      ]);
      expect(body.resolved.map((item) => item.type)).toEqual([
        'person',
        'place',
        'source',
        'source',
      ]);
      expect(body.resolved.map((item) => item.content)).toEqual([
        readFileSync(join(book, 'entities', 'ann-lovelace.md'), 'utf8'),
        readFileSync(join(book, 'entities', 'bob.md'), 'utf8'),
        readFileSync(join(book, 'sources', 'outline.md'), 'utf8'),
        readFileSync(join(book, 'sources', 'notes.md'), 'utf8'),
      ]);
      expect(body.errors).toEqual([]);

      const single = await resolveEntities(app, cookie, 'book', ['outline']);
      expect(single.status).toBe(200);
      const one = resolutionOf(single);
      expect(one.resolved).toEqual([
        {
          id: 'outline',
          type: 'source',
          path: 'sources/outline.md',
          content: '# Outline\n',
        },
      ]);
      expect(one.errors).toEqual([]);
    });
  } finally {
    fixture.remove();
  }
});

it('E2: unknown and duplicate IDs are reported with typed errors, and duplicates list both paths', async () => {
  const fixture = bookLibrary();
  try {
    putFile(fixture.library, 'book/entities/ann-lovelace.md', ANN_LOVELACE);
    putFile(fixture.library, 'book/entities/ann-two.md', ANN_TWO);
    await withProjectsApp(fixture, async (app, cookie) => {
      const reply = await resolveEntities(app, cookie, 'book', [
        'nobody',
        'ann',
      ]);
      expect(reply.status).toBe(200);
      const body = resolutionOf(reply);
      expect(body.resolved).toEqual([]);
      expect(body.errors).toEqual([
        { id: 'nobody', code: 'unknown' },
        {
          id: 'ann',
          code: 'duplicate',
          paths: ['entities/ann-lovelace.md', 'entities/ann-two.md'],
        },
      ]);
    });
  } finally {
    fixture.remove();
  }
});

it('E3: an entities/ file without type, or with an ID failing the pattern, is invalid and not resolvable', async () => {
  const fixture = bookLibrary();
  try {
    putFile(
      fixture.library,
      'book/entities/untyped.md',
      '---\ntitle: Untyped\n---\nNo type.\n',
    );
    putFile(
      fixture.library,
      'book/entities/wrong-id.md',
      '---\nid: Not-Valid\ntype: person\n---\nA bad id.\n',
    );
    putFile(
      fixture.library,
      'book/entities/Bad_Name.md',
      '---\ntype: person\n---\nA bad name.\n',
    );
    await withProjectsApp(fixture, async (app, cookie) => {
      const list = await listEntities(app, cookie, 'book');
      expect(list.status).toBe(200);
      const body = listOf(list);
      const invalidPaths = [
        'entities/Bad_Name.md',
        'entities/untyped.md',
        'entities/wrong-id.md',
      ];
      expect(body.invalid.map((item) => item.path)).toEqual(invalidPaths);
      for (const item of body.invalid) {
        expect(item.reason.length, item.path).toBeGreaterThan(0);
      }
      const listed = body.entities.map((item) => item.path);
      for (const path of invalidPaths) {
        expect(listed, path).not.toContain(path);
      }

      const resolve = await resolveEntities(app, cookie, 'book', [
        'untyped',
        'wrong-id',
      ]);
      expect(resolve.status).toBe(200);
      const resolution = resolutionOf(resolve);
      expect(resolution.resolved).toEqual([]);
      expect(resolution.errors).toEqual([
        { id: 'untyped', code: 'unknown' },
        { id: 'wrong-id', code: 'unknown' },
      ]);
    });
  } finally {
    fixture.remove();
  }
});

it('E4: a host edit adding an entity is visible on the next request with no rebuild', async () => {
  const fixture = bookLibrary();
  const carl = join(fixture.library, 'book', 'entities', 'carl.md');
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      // The first request is also the first with no entities/ folder.
      const before = listOf(await listEntities(app, cookie, 'book'));
      expect(before.entities.map((item) => item.id)).not.toContain('carl');
      const unknown = resolutionOf(
        await resolveEntities(app, cookie, 'book', ['carl']),
      );
      expect(unknown.errors).toEqual([{ id: 'carl', code: 'unknown' }]);

      putFile(fixture.library, 'book/entities/carl.md', CARL);
      const added = listOf(await listEntities(app, cookie, 'book'));
      expect(added.entities).toContainEqual({
        id: 'carl',
        type: 'person',
        path: 'entities/carl.md',
      });
      const found = resolutionOf(
        await resolveEntities(app, cookie, 'book', ['carl']),
      );
      expect(found.resolved).toEqual([
        { id: 'carl', type: 'person', path: 'entities/carl.md', content: CARL },
      ]);

      rmSync(carl);
      const removed = listOf(await listEntities(app, cookie, 'book'));
      expect(removed.entities.map((item) => item.id)).not.toContain('carl');
      const gone = resolutionOf(
        await resolveEntities(app, cookie, 'book', ['carl']),
      );
      expect(gone.errors).toEqual([{ id: 'carl', code: 'unknown' }]);
    });
  } finally {
    fixture.remove();
  }
});

it('E5: both GETs are side-effect free', async () => {
  const fixture = bookLibrary();
  try {
    putFile(fixture.library, 'book/entities/ann-lovelace.md', ANN_LOVELACE);
    putFile(fixture.library, 'book/entities/ann-two.md', ANN_TWO);
    await withProjectsApp(fixture, async (app, cookie) => {
      const observer = await observeEvents(app.baseUrl, LOOPBACK_HOST, cookie);
      try {
        const before = snapshotLibrary(fixture.library);

        const all = await listEntities(app, cookie, 'book');
        expect(all.status).toBe(200);
        expect(listOf(all).entities.map((item) => item.path)).toContain(
          'sources/outline.md',
        );

        const people = await listEntities(app, cookie, 'book', 'person');
        expect(people.status).toBe(200);
        expect(listOf(people).entities.map((item) => item.path)).toEqual([
          'entities/ann-lovelace.md',
          'entities/ann-two.md',
        ]);

        const resolved = await resolveEntities(app, cookie, 'book', [
          'ann',
          'nobody',
        ]);
        expect(resolved.status).toBe(200);

        const after = snapshotLibrary(fixture.library);
        expect(changedPaths(before, after)).toEqual([]);
        expect(await observer.take(EVENT_WAIT_MS)).toEqual([]);
      } finally {
        await observer.close();
      }
    });
  } finally {
    fixture.remove();
  }
});

it('X1: front-matter and file rules, titles and the BOM', async () => {
  const fixture = bookLibrary();
  try {
    putFile(
      fixture.library,
      'book/entities/unclosed.md',
      '---\ntype: person\n',
    );
    putFile(
      fixture.library,
      'book/entities/bad-yaml.md',
      '---\ntype: [person\n---\nBad YAML.\n',
    );
    putFile(
      fixture.library,
      'book/entities/listy.md',
      '---\n- a\n- b\n---\nA list.\n',
    );
    putFile(
      fixture.library,
      'book/entities/no-front-matter.md',
      'Plain text.\n',
    );
    putFile(
      fixture.library,
      'book/entities/huge.md',
      `---\ntype: person\n---\n${'a'.repeat(FILE_SIZE_CAP_BYTES + 1)}`,
    );
    putFile(
      fixture.library,
      'book/entities/latin1.md',
      Buffer.concat([
        Buffer.from('---\ntype: person\n---\n'),
        Buffer.from([0xe9]),
      ]),
    );
    putFile(
      fixture.library,
      'book/entities/bom.md',
      Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from(
          '---\r\ntype: person\r\nname: Bom Name\r\n---\r\nBody.\r\n',
        ),
      ]),
    );
    putFile(
      fixture.library,
      'book/sources/bare.md',
      '---\nid: bare-one\n---\nBare.\n',
    );
    putFile(fixture.library, 'book/sources/Bad_Name.md', 'No front matter.\n');

    await withProjectsApp(fixture, async (app, cookie) => {
      const list = await listEntities(app, cookie, 'book');
      expect(list.status).toBe(200);
      const body = listOf(list);
      expect(body.invalid.map((item) => item.path)).toEqual([
        'entities/bad-yaml.md',
        'entities/huge.md',
        'entities/latin1.md',
        'entities/listy.md',
        'entities/no-front-matter.md',
        'entities/unclosed.md',
        'sources/Bad_Name.md',
      ]);
      for (const item of body.invalid) {
        expect(item.reason.length, item.path).toBeGreaterThan(0);
      }
      expect(body.entities).toEqual([
        {
          id: 'bom',
          type: 'person',
          path: 'entities/bom.md',
          title: 'Bom Name',
        },
        { id: 'bare-one', type: 'source', path: 'sources/bare.md' },
        { id: 'outline', type: 'source', path: 'sources/outline.md' },
      ]);

      const resolve = await resolveEntities(app, cookie, 'book', ['bom']);
      expect(resolve.status).toBe(200);
      const resolution = resolutionOf(resolve);
      expect(resolution.resolved).toHaveLength(1);
      expect(resolution.resolved[0].content.startsWith('﻿')).toBe(true);
    });
  } finally {
    fixture.remove();
  }
});

it('X3: list rules, dot-entries and links', async () => {
  const fixture = bookLibrary();
  const book = join(fixture.library, 'book');
  try {
    putFile(
      fixture.library,
      'book/entities/.hidden/x.md',
      '---\ntype: person\n---\nHidden.\n',
    );
    putFile(
      fixture.library,
      'book/entities/.secret.md',
      '---\ntype: person\n---\nSecret.\n',
    );
    putFile(
      fixture.library,
      'book/sources/typed.md',
      '---\ntype: person\n---\nTyped.\n',
    );
    writeFileSync(
      join(fixture.outside, 'out.md'),
      '---\ntype: person\n---\nOutside.\n',
    );
    symlinkSync(
      join(fixture.outside, 'out.md'),
      join(book, 'entities', 'outward.md'),
    );
    symlinkSync(
      join(book, 'sources', 'typed.md'),
      join(book, 'entities', 'inward.md'),
    );
    symlinkSync('..', join(book, 'entities', 'loop'));

    await withProjectsApp(fixture, async (app, cookie) => {
      const list = await listEntities(app, cookie, 'book');
      expect(list.status).toBe(200);
      const body = listOf(list);
      expect(body.entities).toEqual([
        { id: 'inward', type: 'person', path: 'entities/inward.md' },
        { id: 'outline', type: 'source', path: 'sources/outline.md' },
        { id: 'typed', type: 'person', path: 'sources/typed.md' },
      ]);
      expect(body.invalid).toEqual([]);

      const resolve = await resolveEntities(app, cookie, 'book', [
        'outward',
        'secret',
        'x',
      ]);
      expect(resolve.status).toBe(200);
      const resolution = resolutionOf(resolve);
      expect(resolution.resolved).toEqual([]);
      expect(resolution.errors).toEqual([
        { id: 'outward', code: 'unknown' },
        { id: 'secret', code: 'unknown' },
        { id: 'x', code: 'unknown' },
      ]);
    });
  } finally {
    fixture.remove();
  }
});
