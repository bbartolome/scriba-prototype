import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { PROJECT_ERROR_CODES } from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import { LOOPBACK_HOST, snapshotLibrary } from './invariant-sweep';
import {
  bookLibrary,
  isUtcTimestamp,
  putFile,
} from './project-store-files.kit';
import { postJson } from './project-store-projects.kit';

// The static root of invariant-get-head.test.ts (line 23): no web build is needed.
const STATIC_ROOT = resolve(__dirname, 'fixtures/static');
const GRAPHS = '/api/graph-runner/graphs';

// The text a graph file must hold: two-space JSON and a final newline.
function text(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

// A literal story graph, written in schema key order.
const LITERAL = {
  schemaVersion: 1,
  view: 'story',
  name: 'Ada Lovelace',
  nodes: [
    {
      id: 'ada',
      kind: 'entity',
      label: 'Ada',
      path: 'entities/ada.md',
      position: { x: 0, y: 0 },
    },
    {
      id: 'ch01',
      kind: 'scene',
      label: 'Chapter 1',
      path: 'drafts/ch01.md',
      position: { x: 200, y: 0 },
    },
  ],
  edges: [{ id: 'e1', from: 'ada', to: 'ch01', relation: 'order' }],
};

interface GraphRow {
  id: string;
  name: string;
  view: string | null;
  nodeCount: number | null;
  mtime: string;
  valid: boolean;
}

// Boots the composed app on a fresh book library, takes the session cookie, and removes the library in every case.
async function withGraphApp<T>(
  run: (app: TestApp, cookie: string, library: string) => Promise<T>,
): Promise<T> {
  const fixture = bookLibrary();
  try {
    const app = await createTestApp({
      libraryDir: fixture.library,
      staticRoot: STATIC_ROOT,
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

// One GET with the loopback Host and the session cookie.
function get(app: TestApp, cookie: string, path: string): Promise<Reply> {
  return send(app.baseUrl, { host: LOOPBACK_HOST, cookie, path });
}

// The graph folder of the book project.
function graphFile(library: string, id: string): string {
  return join(library, 'book', 'graphs', `${id}.json`);
}

// The error code of a refusal body.
function codeOf(reply: Reply): string {
  return (JSON.parse(reply.body) as { error: { code: string } }).error.code;
}

// The graph rows of a list answer.
function rowsOf(reply: Reply): GraphRow[] {
  return (JSON.parse(reply.body) as { graphs: GraphRow[] }).graphs;
}

it('graph CRUD, K1: create, save, rename, list and delete change the files as the unit says', () =>
  withGraphApp(async (app, cookie, library) => {
    const empty = await get(app, cookie, GRAPHS);
    expect(empty.status).toBe(200);
    expect(JSON.parse(empty.body)).toEqual({ graphs: [] });

    const created = await postJson(app, cookie, `${GRAPHS}/create`, {
      name: 'Ada Lovelace',
      view: 'story',
    });
    expect(created.status).toBe(201);
    expect(JSON.parse(created.body)).toEqual({ id: 'ada-lovelace' });
    expect(readFileSync(graphFile(library, 'ada-lovelace'), 'utf8')).toBe(
      text({
        schemaVersion: 1,
        view: 'story',
        name: 'Ada Lovelace',
        nodes: [],
        edges: [],
      }),
    );

    const second = await postJson(app, cookie, `${GRAPHS}/create`, {
      name: 'Ada Lovelace',
      view: 'story',
    });
    expect(second.status).toBe(201);
    expect(JSON.parse(second.body)).toEqual({ id: 'ada-lovelace-2' });

    const bang = await postJson(app, cookie, `${GRAPHS}/create`, {
      name: '!!!',
      view: 'recipe',
    });
    expect(bang.status).toBe(201);
    expect(JSON.parse(bang.body)).toEqual({ id: 'graph' });

    const saved = await postJson(
      app,
      cookie,
      `${GRAPHS}/ada-lovelace/save`,
      LITERAL,
    );
    expect(saved.status).toBe(200);
    expect(
      Array.isArray((JSON.parse(saved.body) as { issues: unknown }).issues),
    ).toBe(true);
    expect(readFileSync(graphFile(library, 'ada-lovelace'), 'utf8')).toBe(
      text(LITERAL),
    );

    const renamedName = await postJson(
      app,
      cookie,
      `${GRAPHS}/ada-lovelace/rename`,
      { name: 'Ada' },
    );
    expect(renamedName.status).toBe(200);
    expect(JSON.parse(renamedName.body)).toEqual({ id: 'ada-lovelace' });
    expect(readFileSync(graphFile(library, 'ada-lovelace'), 'utf8')).toBe(
      text({ ...LITERAL, name: 'Ada' }),
    );

    const renamedId = await postJson(
      app,
      cookie,
      `${GRAPHS}/ada-lovelace/rename`,
      { newId: 'ada-renamed' },
    );
    expect(renamedId.status).toBe(200);
    expect(JSON.parse(renamedId.body)).toEqual({ id: 'ada-renamed' });
    expect(existsSync(graphFile(library, 'ada-lovelace'))).toBe(false);
    expect(readFileSync(graphFile(library, 'ada-renamed'), 'utf8')).toBe(
      text({ ...LITERAL, name: 'Ada' }),
    );

    const listed = await get(app, cookie, GRAPHS);
    expect(listed.status).toBe(200);
    const rows = rowsOf(listed);
    expect(rows.map((row) => row.id)).toEqual([
      'ada-lovelace-2',
      'ada-renamed',
      'graph',
    ]);
    expect(rows.find((row) => row.id === 'ada-renamed')).toMatchObject({
      id: 'ada-renamed',
      name: 'Ada',
      view: 'story',
      nodeCount: 2,
      valid: true,
    });
    expect(isUtcTimestamp(rows[1]?.mtime ?? '')).toBe(true);
    expect(rows.find((row) => row.id === 'ada-lovelace-2')).toMatchObject({
      name: 'Ada Lovelace',
      view: 'story',
      nodeCount: 0,
      valid: true,
    });

    const deleted = await postJson(
      app,
      cookie,
      `${GRAPHS}/ada-renamed/delete`,
      {},
    );
    expect(deleted.status).toBe(200);
    expect(deleted.body).toBe('');
    expect(existsSync(graphFile(library, 'ada-renamed'))).toBe(false);
    expect(rowsOf(await get(app, cookie, GRAPHS)).map((row) => row.id)).toEqual(
      ['ada-lovelace-2', 'graph'],
    );
  }));

it('graph CRUD, K2: a schema-invalid save is refused and the file is unchanged', () =>
  withGraphApp(async (app, cookie, library) => {
    await postJson(app, cookie, `${GRAPHS}/create`, {
      name: 'Ada Lovelace',
      view: 'story',
    });
    const file = graphFile(library, 'ada-lovelace');
    const before = readFileSync(file, 'utf8');
    const invalid = [
      // A node id with a dot (refused by the node id pattern).
      {
        schemaVersion: 1,
        view: 'story',
        name: 'Ada Lovelace',
        nodes: [
          {
            id: 'chapter.notes',
            kind: 'entity',
            label: 'x',
            position: { x: 0, y: 0 },
          },
        ],
        edges: [],
      },
      // An extra top-level key (the object is strict).
      { ...LITERAL, extra: 1 },
      // Two nodes with the same id (refused by the save rule).
      { ...LITERAL, nodes: [LITERAL.nodes[0], LITERAL.nodes[0]] },
    ];
    const replies: Reply[] = [];
    for (const body of invalid) {
      replies.push(
        await postJson(app, cookie, `${GRAPHS}/ada-lovelace/save`, body),
      );
    }
    for (const reply of replies) {
      expect(reply.status).toBe(422);
      expect(codeOf(reply)).toBe('GRAPH_SCHEMA_INVALID');
      expect(readFileSync(file, 'utf8')).toBe(before);
    }
  }));

it('graph CRUD, K3: a schemaVersion 2 file is refused and listed as invalid', () =>
  withGraphApp(async (app, cookie, library) => {
    await postJson(app, cookie, `${GRAPHS}/create`, {
      name: 'Ada',
      view: 'story',
    });
    putFile(
      library,
      'book/graphs/future.json',
      '{"schemaVersion":2,"view":"story","name":"Future","nodes":[],"edges":[]}',
    );
    const file = graphFile(library, 'ada');
    const before = readFileSync(file, 'utf8');

    const detail = await get(app, cookie, `${GRAPHS}/future`);
    expect(detail.status).toBe(409);
    expect(codeOf(detail)).toBe('GRAPH_SCHEMA_VERSION_UNSUPPORTED');

    const rows = rowsOf(await get(app, cookie, GRAPHS));
    const future = rows.find((row) => row.id === 'future');
    expect(future).toMatchObject({
      id: 'future',
      name: 'future',
      view: null,
      nodeCount: null,
      valid: false,
    });
    expect(isUtcTimestamp(future?.mtime ?? '')).toBe(true);
    expect(rows.find((row) => row.id === 'ada')?.valid).toBe(true);

    const saved = await postJson(app, cookie, `${GRAPHS}/ada/save`, {
      schemaVersion: 2,
      view: 'story',
      name: 'Ada',
      nodes: [],
      edges: [],
    });
    expect(saved.status).toBe(409);
    expect(codeOf(saved)).toBe('GRAPH_SCHEMA_VERSION_UNSUPPORTED');
    expect(readFileSync(file, 'utf8')).toBe(before);
  }));

it('graph CRUD, K4: a rename to a taken id fails, and the GETs write nothing', () =>
  withGraphApp(async (app, cookie, library) => {
    await postJson(app, cookie, `${GRAPHS}/create`, {
      name: 'Alpha',
      view: 'story',
    });
    await postJson(app, cookie, `${GRAPHS}/create`, {
      name: 'Beta',
      view: 'story',
    });
    const alphaBefore = readFileSync(graphFile(library, 'alpha'), 'utf8');
    const betaBefore = readFileSync(graphFile(library, 'beta'), 'utf8');

    const toTaken = await postJson(app, cookie, `${GRAPHS}/alpha/rename`, {
      newId: 'beta',
    });
    expect(toTaken.status).toBe(409);
    expect(codeOf(toTaken)).toBe(PROJECT_ERROR_CODES.FILE_EXISTS);

    const toSelf = await postJson(app, cookie, `${GRAPHS}/alpha/rename`, {
      newId: 'alpha',
    });
    expect(toSelf.status).toBe(409);
    expect(codeOf(toSelf)).toBe(PROJECT_ERROR_CODES.FILE_EXISTS);

    expect(readFileSync(graphFile(library, 'alpha'), 'utf8')).toBe(alphaBefore);
    expect(readFileSync(graphFile(library, 'beta'), 'utf8')).toBe(betaBefore);

    const before = snapshotLibrary(library);
    const list = await get(app, cookie, GRAPHS);
    expect(list.status).toBe(200);
    const detail = await get(app, cookie, `${GRAPHS}/alpha`);
    expect(detail.status).toBe(200);
    const missing = await get(app, cookie, `${GRAPHS}/no-such-graph`);
    expect(missing.status).toBe(404);
    expect(codeOf(missing)).toBe('GRAPH_NOT_FOUND');
    expect(snapshotLibrary(library)).toEqual(before);
  }));
