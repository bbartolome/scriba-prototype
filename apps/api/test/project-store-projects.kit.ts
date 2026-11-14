import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  PROJECTS_ROUTE,
  type ProjectList,
} from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from './invariant-sweep';

// The temp library L, a folder O outside it, and the fixture tree of the plan (section 4b).
export interface ProjectsLibrary {
  library: string; // the temp library L
  outside: string; // a temp folder outside L
  remove: () => void; // removes L and O
}

export interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

// Builds the fixture tree. settings, when given, is written as .scriba/settings.yaml before the app boots.
export function buildProjectsLibrary(
  options: { settings?: string } = {},
): ProjectsLibrary {
  const library = mkdtempSync(join(tmpdir(), 'scriba-projects-library-'));
  const outside = mkdtempSync(join(tmpdir(), 'scriba-projects-outside-'));
  const remove = (): void => {
    rmSync(library, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  };
  try {
    const file = (path: string, text: string): void => {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text);
    };
    file(
      join(library, 'book', 'project.yaml'),
      'schemaVersion: 1\ntitle: Book\ngenrePack: nonfiction\n',
    );
    file(join(library, 'book', 'sources', 'outline.md'), '# Outline\n');
    file(join(library, 'draft-only', 'sources', 'notes.md'), 'Notes.\n');
    file(join(library, 'draft-only', '.gitignore'), 'node_modules/\n');
    mkdirSync(join(library, 'bare'));
    file(join(library, 'gi-done', '.gitignore'), 'node_modules/\n.scriba/\n');
    file(
      join(library, '.hidden', 'project.yaml'),
      'schemaVersion: 1\ntitle: Hidden\ngenrePack: nonfiction\n',
    );
    file(join(library, 'loose.md'), '# Loose\n');
    file(
      join(library, 'bad', 'project.yaml'),
      'schemaVersion: 1\ngenrePack: nonfiction\n',
    );
    file(join(library, 'broken', 'project.yaml'), 'schemaVersion: [1\n');
    file(
      join(library, 'later', 'project.yaml'),
      'schemaVersion: 2\ntitle: Later\n',
    );
    file(
      join(library, 'nested', 'inner', 'project.yaml'),
      'schemaVersion: 1\ntitle: Inner\ngenrePack: nonfiction\n',
    );
    file(
      join(outside, 'project.yaml'),
      'schemaVersion: 1\ntitle: Outside\ngenrePack: nonfiction\n',
    );
    symlinkSync(outside, join(library, 'outward'));
    symlinkSync('book', join(library, 'link-in'));
    if (options.settings !== undefined) {
      file(join(library, '.scriba', 'settings.yaml'), options.settings);
    }
  } catch (error) {
    remove();
    throw error;
  }
  return { library, outside, remove };
}

// Boots the composed app against the fixture library, takes the session cookie, and closes the app in every case.
// The library is not removed here: the caller removes it with fixture.remove().
export async function withProjectsApp<T>(
  fixture: ProjectsLibrary,
  run: (app: TestApp, cookie: string) => Promise<T>,
): Promise<T> {
  const app = await createTestApp({ libraryDir: fixture.library });
  try {
    const cookie = await sessionCookie(app, fixture.library);
    return await run(app, cookie);
  } finally {
    await app.close();
  }
}

export function getProjects(app: TestApp, cookie: string): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    path: PROJECTS_ROUTE,
    cookie,
  });
}

// One command: a POST with a JSON body, with the loopback Origin the guard expects.
export function postJson(
  app: TestApp,
  cookie: string,
  path: string,
  body: unknown,
): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie,
    method: 'POST',
    path,
    body: JSON.stringify(body),
  });
}

export function readJson<T>(reply: Reply): T {
  return JSON.parse(reply.body) as T;
}

export function errorOf(reply: Reply): ErrorBody['error'] {
  return readJson<ErrorBody>(reply).error;
}

export function listedProjects(reply: Reply): ProjectList['projects'] {
  return readJson<ProjectList>(reply).projects;
}

// The paths whose fingerprint differs between two snapshots, added and removed ones included, in sorted order.
export function changedPaths(
  before: Map<string, string>,
  after: Map<string, string>,
): string[] {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths]
    .filter((path) => before.get(path) !== after.get(path))
    .sort();
}
