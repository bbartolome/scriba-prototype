import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect } from 'vitest';
import {
  MANUSCRIPT_ROUTE,
  manuscriptViewSchema,
  type ManuscriptView,
} from '@bbartolome/scriba-contracts/compile-export';
import {
  createTestApp,
  type TestApp,
  type TestAppOptions,
} from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import { LOOPBACK_HOST } from './invariant-sweep';
import { ACTIVE_BOOK_SETTINGS, putFile } from './project-store-files.kit';

// The static root of the composed app (the same fixture as graph-runner-graph-crud.test.ts).
export const STATIC_ROOT = resolve(__dirname, 'fixtures/static');

// The book project of a fixture: a temp library with `book` active. Keys are project-relative; project.yaml is
// written with a default unless the map gives one.
export function manuscriptLibrary(files: Record<string, string>): {
  library: string;
  remove(): void;
} {
  const library = mkdtempSync(join(tmpdir(), 'scriba-compile-export-'));
  const remove = (): void => rmSync(library, { recursive: true, force: true });
  try {
    mkdirSync(join(library, '.scriba'), { recursive: true });
    writeFileSync(
      join(library, '.scriba', 'settings.yaml'),
      ACTIVE_BOOK_SETTINGS,
    );
    const projectYaml =
      files['project.yaml'] ??
      'schemaVersion: 1\ntitle: Book\ngenrePack: nonfiction\n';
    putFile(library, join('book', 'project.yaml'), projectYaml);
    for (const [key, text] of Object.entries(files)) {
      if (key === 'project.yaml') continue;
      putFile(library, join('book', key), text);
    }
  } catch (error) {
    remove();
    throw error;
  }
  return { library, remove };
}

// Boots the composed app on a manuscript library, takes the session cookie, and removes the library in every case.
// `options.modules` replaces the composed modules when set (the export tests add a tuning module).
export async function withManuscript<T>(
  files: Record<string, string>,
  run: (app: TestApp, cookie: string, library: string) => Promise<T>,
  options: Pick<TestAppOptions, 'modules'> = {},
): Promise<T> {
  const fixture = manuscriptLibrary(files);
  try {
    const app = await createTestApp({
      libraryDir: fixture.library,
      staticRoot: STATIC_ROOT,
      modules: options.modules,
    });
    try {
      const cookie = await sessionCookie(app, fixture.library);
      return await run(app, cookie, fixture.library);
    } finally {
      await app.close();
    }
  } finally {
    fixture.remove();
  }
}

// One GET of the manuscript route, with the loopback Host and the session cookie.
export function getManuscript(app: TestApp, cookie: string): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie,
    path: MANUSCRIPT_ROUTE,
  });
}

// The parsed view of a 200 reply.
export function manuscriptOf(reply: Reply): ManuscriptView {
  expect(reply.status).toBe(200);
  return manuscriptViewSchema.parse(JSON.parse(reply.body));
}

// The text of a story graph file. Node paths are project-relative; each node id is the one the fixture gives.
export function storyGraph(
  name: string,
  nodes: { id: string; path?: string; kind?: 'scene' | 'entity' }[],
  edges: { from: string; to: string; relation: string }[],
): string {
  const graph = {
    schemaVersion: 1,
    view: 'story',
    name,
    nodes: nodes.map((node) => ({
      id: node.id,
      kind: node.kind ?? 'scene',
      label: node.id,
      ...(node.path === undefined ? {} : { path: node.path }),
      position: { x: 0, y: 0 },
    })),
    edges: edges.map((edge, index) => ({
      id: `e${index}`,
      from: edge.from,
      to: edge.to,
      relation: edge.relation,
    })),
  };
  return `${JSON.stringify(graph, null, 2)}\n`;
}
