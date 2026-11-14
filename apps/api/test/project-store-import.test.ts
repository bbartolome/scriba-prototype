import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  PROJECT_IMPORT_ROUTE,
  projectYamlSchema,
} from '@bbartolome/scriba-contracts/project-store';
import { snapshotLibrary } from './invariant-sweep';
import {
  buildProjectsLibrary,
  changedPaths,
  errorOf,
  postJson,
  withProjectsApp,
} from './project-store-projects.kit';

// Import never creates the layout folders; they appear lazily on the first write.
const LAYOUT_FOLDERS = ['entities', 'drafts', 'graphs', 'logs'];

it('C4: Import leaves every other file byte-identical, appends .scriba/ once, and reports the exact issues of an invalid project.yaml', async () => {
  const fixture = buildProjectsLibrary();
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const importProject = async (projectId: string): Promise<void> => {
        const reply = await postJson(app, cookie, PROJECT_IMPORT_ROUTE, {
          projectId,
        });
        expect(reply.status).toBe(200);
      };

      // draft-only: a new project.yaml and a .gitignore that gains the line; nothing else moves.
      {
        const before = snapshotLibrary(fixture.library);
        await importProject('draft-only');
        const after = snapshotLibrary(fixture.library);
        expect(changedPaths(before, after)).toEqual([
          'draft-only/.gitignore',
          'draft-only/project.yaml',
        ]);
        expect(
          readFileSync(
            join(fixture.library, 'draft-only', '.gitignore'),
            'utf8',
          ),
        ).toBe('node_modules/\n.scriba/\n');
        for (const folder of LAYOUT_FOLDERS) {
          expect(existsSync(join(fixture.library, 'draft-only', folder))).toBe(
            false,
          );
        }
      }

      // bare: an empty folder gets a project.yaml and a .gitignore holding the line.
      {
        const before = snapshotLibrary(fixture.library);
        await importProject('bare');
        const after = snapshotLibrary(fixture.library);
        expect(changedPaths(before, after)).toEqual([
          'bare/.gitignore',
          'bare/project.yaml',
        ]);
        expect(
          readFileSync(join(fixture.library, 'bare', '.gitignore'), 'utf8'),
        ).toBe('.scriba/\n');
      }

      // gi-done: the line is already there, so .gitignore is not written again.
      {
        const before = snapshotLibrary(fixture.library);
        await importProject('gi-done');
        const after = snapshotLibrary(fixture.library);
        expect(changedPaths(before, after)).toEqual(['gi-done/project.yaml']);
      }

      // bad: a refusal with the exact schema issues, and nothing written.
      {
        const text = readFileSync(
          join(fixture.library, 'bad', 'project.yaml'),
          'utf8',
        );
        const expected = projectYamlSchema.safeParse(parse(text));
        expect(expected.success).toBe(false);
        const before = snapshotLibrary(fixture.library);
        const reply = await postJson(app, cookie, PROJECT_IMPORT_ROUTE, {
          projectId: 'bad',
        });
        expect(reply.status).toBe(422);
        const error = errorOf(reply);
        expect(error.code).toBe('PROJECT_INVALID');
        expect(error.details).toEqual(
          JSON.parse(JSON.stringify(expected.error?.issues)),
        );
        expect(snapshotLibrary(fixture.library)).toEqual(before);
      }
    });
  } finally {
    fixture.remove();
  }
});

it('E2: Import refuses a valid project, a too-new one, and unknown or dot ids, with the contract codes', async () => {
  const fixture = buildProjectsLibrary();
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const refusals: Array<{
        projectId: string;
        status: number;
        code: string;
      }> = [
        { projectId: 'book', status: 409, code: 'PROJECT_EXISTS' },
        { projectId: 'later', status: 409, code: 'PROJECT_SCHEMA_TOO_NEW' },
        { projectId: 'missing', status: 404, code: 'PROJECT_NOT_FOUND' },
        { projectId: '..', status: 404, code: 'PROJECT_NOT_FOUND' },
        { projectId: '.', status: 404, code: 'PROJECT_NOT_FOUND' },
        { projectId: '.hidden', status: 404, code: 'PROJECT_NOT_FOUND' },
      ];
      for (const row of refusals) {
        const before = snapshotLibrary(fixture.library);
        const reply = await postJson(app, cookie, PROJECT_IMPORT_ROUTE, {
          projectId: row.projectId,
        });
        expect(reply.status).toBe(row.status);
        expect(errorOf(reply).code).toBe(row.code);
        expect(snapshotLibrary(fixture.library)).toEqual(before);
      }
    });
  } finally {
    fixture.remove();
  }
});
