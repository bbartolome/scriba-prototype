import { expect, it } from 'vitest';
import type { EntityList } from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import { postJsonPlain } from './project-store-active.kit';
import {
  entitiesKitModule,
  listEntities,
  resolveEntities,
} from './project-store-entities.kit';
import { bookLibrary, putFile } from './project-store-files.kit';
import {
  buildProjectsLibrary,
  type ErrorBody,
} from './project-store-projects.kit';

// Every test builds its own temp library and removes it. Nothing here reads the sample projects.

const KIT = '/api/project-store-test/entities';

// Boots the kit module (the in-process provider, no guard) on the library. The library is removed by the caller.
async function withEntitiesKit(
  library: string,
  run: (app: TestApp) => Promise<void>,
): Promise<void> {
  const app = await createTestApp({
    libraryDir: library,
    modules: [entitiesKitModule()],
  });
  try {
    await run(app);
  } finally {
    await app.close();
  }
}

// The error code of a plain reply from the kit module.
function codeOf(json: unknown): string {
  return (json as ErrorBody).error.code;
}

it('X2: the in-process provider uses the same checks, and the manifest has every file', async () => {
  const none = buildProjectsLibrary();
  try {
    await withEntitiesKit(none.library, async (app) => {
      const reply = await postJsonPlain(app.baseUrl, `${KIT}/list`, {
        projectId: 'book',
      });
      expect(reply.status).toBe(409);
      expect(codeOf(reply.json)).toBe('PROJECT_NO_ACTIVE');
    });
  } finally {
    none.remove();
  }

  const fixture = bookLibrary();
  try {
    await withEntitiesKit(fixture.library, async (app) => {
      const reply = await postJsonPlain(app.baseUrl, `${KIT}/resolve`, {
        projectId: 'draft-only',
        ids: ['ann'],
      });
      expect(reply.status).toBe(409);
      expect(codeOf(reply.json)).toBe('PROJECT_NOT_ACTIVE');
    });
  } finally {
    fixture.remove();
  }

  const shared = bookLibrary();
  try {
    putFile(
      shared.library,
      'book/entities/ann-lovelace.md',
      '---\nid: ann\ntype: person\n---\nAnn Lovelace.\n',
    );
    putFile(
      shared.library,
      'book/entities/ann-two.md',
      '---\nid: ann\ntype: person\n---\nA second Ann.\n',
    );
    await withEntitiesKit(shared.library, async (app) => {
      const httpList = await listEntities(app, undefined, 'book');
      expect(httpList.status).toBe(200);
      const inList = await postJsonPlain(app.baseUrl, `${KIT}/list`, {
        projectId: 'book',
      });
      expect(inList.status).toBe(200);
      expect(inList.json).toEqual(JSON.parse(httpList.body));

      const httpResolve = await resolveEntities(app, undefined, 'book', [
        'ann',
        'nobody',
      ]);
      expect(httpResolve.status).toBe(200);
      const inResolve = await postJsonPlain(app.baseUrl, `${KIT}/resolve`, {
        projectId: 'book',
        ids: ['ann', 'nobody'],
      });
      expect(inResolve.status).toBe(200);
      expect(inResolve.json).toEqual(JSON.parse(httpResolve.body));
    });
  } finally {
    shared.remove();
  }

  const plain = bookLibrary();
  try {
    putFile(plain.library, 'book/sources/notes.txt', 'plain text');
    await withEntitiesKit(plain.library, async (app) => {
      const manifest = await postJsonPlain(app.baseUrl, `${KIT}/manifest`, {
        projectId: 'book',
      });
      expect(manifest.status).toBe(200);
      expect(manifest.json).toEqual(
        expect.arrayContaining(['sources/notes.txt', 'sources/outline.md']),
      );

      const list = await postJsonPlain(app.baseUrl, `${KIT}/list`, {
        projectId: 'book',
      });
      expect(list.status).toBe(200);
      const body = list.json as EntityList;
      expect(body.entities.map((item) => item.path)).not.toContain(
        'sources/notes.txt',
      );
      expect(body.invalid.map((item) => item.path)).not.toContain(
        'sources/notes.txt',
      );
    });
  } finally {
    plain.remove();
  }
});
