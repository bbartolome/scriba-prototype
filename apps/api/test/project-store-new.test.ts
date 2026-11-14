import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { parse } from 'yaml';
import { PROJECT_NEW_ROUTE } from '@bbartolome/scriba-contracts/project-store';
import { snapshotLibrary } from './invariant-sweep';
import {
  buildProjectsLibrary,
  errorOf,
  postJson,
  readJson,
  withProjectsApp,
} from './project-store-projects.kit';

const LAYOUT_FOLDERS = ['sources', 'entities', 'drafts', 'graphs', 'logs'];

it('C3: New creates the layout without structure/ or snapshots/, writes .gitignore with .scriba/, and a second New of the same folder fails PROJECT_EXISTS', async () => {
  const fixture = buildProjectsLibrary();
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const body = { title: 'Summarize my outline' };
      const first = await postJson(app, cookie, PROJECT_NEW_ROUTE, body);
      expect(first.status).toBe(201);
      expect(readJson(first)).toEqual({
        id: 'summarize-my-outline',
        title: 'Summarize my outline',
        genrePack: 'nonfiction',
        active: false,
        status: 'ok',
      });

      const root = join(fixture.library, 'summarize-my-outline');
      expect(parse(readFileSync(join(root, 'project.yaml'), 'utf8'))).toEqual({
        schemaVersion: 1,
        title: 'Summarize my outline',
        genrePack: 'nonfiction',
      });
      expect(readFileSync(join(root, '.gitignore'), 'utf8')).toBe('.scriba/\n');
      for (const folder of LAYOUT_FOLDERS) {
        expect(statSync(join(root, folder)).isDirectory()).toBe(true);
      }
      for (const absent of ['structure', 'snapshots', '.scriba']) {
        expect(existsSync(join(root, absent))).toBe(false);
      }

      const before = snapshotLibrary(fixture.library);
      const second = await postJson(app, cookie, PROJECT_NEW_ROUTE, body);
      expect(second.status).toBe(409);
      expect(errorOf(second).code).toBe('PROJECT_EXISTS');
      expect(snapshotLibrary(fixture.library)).toEqual(before);
    });
  } finally {
    fixture.remove();
  }
});

it('E1: folder names come from titles, and an empty name or an explicit name the disk refuses is rejected with nothing written', async () => {
  const fixture = buildProjectsLibrary();
  // Built from code points so that the non-ASCII rows are plain ASCII in this file.
  const accented =
    'Caf' +
    String.fromCharCode(0xe9, 0x20, 0xdc) +
    'n' +
    String.fromCharCode(0xef) +
    'code!';
  const japanese = String.fromCharCode(0x65e5, 0x672c, 0x8a9e);
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const accepted: Array<{ body: object; folder: string }> = [
        { body: { title: 'My New Book' }, folder: 'my-new-book' },
        { body: { title: accented }, folder: 'cafe-unicode' },
        { body: { title: 'a'.repeat(100) }, folder: 'a'.repeat(64) },
        {
          body: { title: 'Long explicit', folderName: 'b'.repeat(65) },
          folder: 'b'.repeat(65),
        },
      ];
      for (const row of accepted) {
        const reply = await postJson(app, cookie, PROJECT_NEW_ROUTE, row.body);
        expect(reply.status).toBe(201);
        expect(readJson<{ id: string }>(reply).id).toBe(row.folder);
        expect(statSync(join(fixture.library, row.folder)).isDirectory()).toBe(
          true,
        );
      }

      const refused: Array<{ body: object; status: number; code: string }> = [
        {
          body: { title: '   --   ' },
          status: 400,
          code: 'PLATFORM_VALIDATION_FAILED',
        },
        {
          body: { title: japanese },
          status: 400,
          code: 'PLATFORM_VALIDATION_FAILED',
        },
        {
          body: { title: 'Bad name', folderName: 'Bad_Name' },
          status: 400,
          code: 'PLATFORM_VALIDATION_FAILED',
        },
        {
          body: { title: 'Too long', folderName: 'c'.repeat(300) },
          status: 400,
          code: 'PROJECT_PATH_INVALID',
        },
      ];
      for (const row of refused) {
        const before = snapshotLibrary(fixture.library);
        const reply = await postJson(app, cookie, PROJECT_NEW_ROUTE, row.body);
        expect(reply.status).toBe(row.status);
        expect(errorOf(reply).code).toBe(row.code);
        expect(snapshotLibrary(fixture.library)).toEqual(before);
      }
    });
  } finally {
    fixture.remove();
  }
});
