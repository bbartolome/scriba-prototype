import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { expect, it } from 'vitest';
import {
  MANUSCRIPT_PART_ROUTE,
  MANUSCRIPT_REORDER_ROUTE,
  MANUSCRIPT_STATUS_ROUTE,
  type ManuscriptView,
} from '@bbartolome/scriba-contracts/compile-export';
import {
  EVENT_WAIT_MS,
  LOOPBACK_HOST,
  LOOPBACK_ORIGIN,
  observeEvents,
  type Observer,
} from './invariant-sweep';
import { send, type Reply } from './guard-request';
import {
  getManuscript,
  manuscriptOf,
  storyGraph,
  withManuscript,
} from './compile-export-manuscript.kit';
import type { TestApp } from './create-test-app';
import { putFile } from './project-store-files.kit';

// The project.yaml of a fixture: the base keys and an order key with the given entries.
function projectYaml(order: string): string {
  return `schemaVersion: 1\ntitle: Book\ngenrePack: nonfiction\norder:\n${order}`;
}

// One POST of a write route, with the loopback Host, the session cookie and the loopback Origin.
function post(
  app: TestApp,
  cookie: string,
  path: string,
  body: unknown,
): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie,
    origin: LOOPBACK_ORIGIN,
    method: 'POST',
    path,
    body: JSON.stringify(body),
  });
}

function reorder(
  app: TestApp,
  cookie: string,
  body: {
    revision: string;
    front: string[];
    body: string[];
    back: string[];
  },
): Promise<Reply> {
  return post(app, cookie, MANUSCRIPT_REORDER_ROUTE, body);
}

function errorCode(reply: Reply): string {
  return (JSON.parse(reply.body) as { error: { code: string } }).error.code;
}

// The manuscript-updated data of each envelope in the observed blocks.
function updatesOf(
  blocks: string[],
): { projectId: string; revision: string }[] {
  return blocks.flatMap((block) => {
    const line = block.split('\n').find((text) => text.startsWith('data: '));
    if (line === undefined) return [];
    const envelope = JSON.parse(line.slice('data: '.length)) as {
      module?: string;
      type?: string;
      data: { projectId: string; revision: string };
    };
    return envelope.module === 'compile-export' &&
      envelope.type === 'manuscript-updated'
      ? [envelope.data]
      : [];
  });
}

function bytesOf(library: string): string {
  return readFileSync(join(library, 'book', 'project.yaml'), 'utf8');
}

// The order entries of the file, as parsed.
function orderOf(library: string): unknown {
  return (parse(bytesOf(library)) as { order: unknown }).order;
}

function pathsOf(view: ManuscriptView): string[] {
  return view.entries.map((entry) => entry.path);
}

// Waits for the events of the window, and returns the manuscript-updated data among them.
async function eventsAfter(
  observer: Observer,
): Promise<{ projectId: string; revision: string }[]> {
  return updatesOf(await observer.take(EVENT_WAIT_MS));
}

// C1: the fixture for a stale revision. Order: a and b; file c is not in the order.
const C1: Record<string, string> = {
  'project.yaml': projectYaml('  - path: drafts/a.md\n  - path: drafts/b.md\n'),
  'drafts/a.md': 'Text a.\n',
  'drafts/b.md': 'Text b.\n',
  'drafts/c.md': 'Text c.\n',
};

it('C1 a reorder with a stale revision is refused, writes nothing and succeeds with the new revision', async () => {
  await withManuscript(C1, async (app, cookie, library) => {
    const r0 = manuscriptOf(await getManuscript(app, cookie)).revision;
    const handEdited = projectYaml(
      '  - path: drafts/a.md\n  - path: drafts/b.md\n    status: final\n',
    );
    putFile(library, join('book', 'project.yaml'), handEdited);
    const observer = await observeEvents(app.baseUrl, LOOPBACK_HOST, cookie);
    const stale = await reorder(app, cookie, {
      revision: r0,
      front: [],
      body: ['drafts/b.md', 'drafts/a.md', 'drafts/c.md'],
      back: [],
    });
    const updates = await eventsAfter(observer);
    await observer.close();
    expect(stale.status).toBe(409);
    expect(errorCode(stale)).toBe('COMPILE_ORDER_CONFLICT');
    expect(bytesOf(library)).toBe(handEdited);
    expect(updates).toEqual([]);

    const fresh = manuscriptOf(await getManuscript(app, cookie));
    expect(fresh.revision).not.toBe(r0);
    const accepted = await reorder(app, cookie, {
      revision: fresh.revision,
      front: [],
      body: ['drafts/b.md', 'drafts/a.md', 'drafts/c.md'],
      back: [],
    });
    expect(accepted.status).toBe(200);
  });
});

// C2: the fixture keeps a comment above and below the order, an unknown key on b, a stale entry and a back file.
const C2_TEXT = [
  '# The book record.',
  'schemaVersion: 1',
  'title: Book # working title',
  'genrePack: nonfiction',
  'export:',
  '  author: A. Writer # byline',
  '# Manuscript order.',
  'order:',
  '  - path: drafts/b.md',
  '    status: final',
  '    note: keep',
  '  - path: drafts/gone.md',
  '  - path: drafts/z.md',
  '    part: back',
  '# Model choice.',
  'model:',
  '  providerId: test-provider',
  '  model: test-value',
  '',
].join('\n');

const C2: Record<string, string> = {
  'project.yaml': C2_TEXT,
  'drafts/a.md': 'Text a.\n',
  'drafts/b.md': 'Text b.\n',
  'drafts/c.md': 'Text c.\n',
  'drafts/z.md': 'Text z.\n',
};

it('C2 a valid reorder writes every entry and keeps the comments and other keys byte-identical', async () => {
  await withManuscript(C2, async (app, cookie, library) => {
    const r0 = manuscriptOf(await getManuscript(app, cookie)).revision;
    const observer = await observeEvents(app.baseUrl, LOOPBACK_HOST, cookie);
    const reply = await reorder(app, cookie, {
      revision: r0,
      front: [],
      body: ['drafts/c.md', 'drafts/b.md', 'drafts/a.md'],
      back: ['drafts/z.md'],
    });
    const updates = await eventsAfter(observer);
    await observer.close();
    expect(reply.status).toBe(200);
    const view = manuscriptOf(reply);
    expect(pathsOf(view)).toEqual([
      'drafts/c.md',
      'drafts/b.md',
      'drafts/a.md',
      'drafts/z.md',
    ]);

    const text = bytesOf(library);
    const head = C2_TEXT.slice(
      0,
      C2_TEXT.indexOf('# Manuscript order.\n') + '# Manuscript order.\n'.length,
    );
    const tail = C2_TEXT.slice(C2_TEXT.indexOf('# Model choice.'));
    expect(text.startsWith(head)).toBe(true);
    expect(text.endsWith(tail)).toBe(true);
    expect(orderOf(library)).toEqual([
      { path: 'drafts/c.md' },
      { path: 'drafts/b.md', status: 'final', note: 'keep' },
      { path: 'drafts/a.md' },
      { path: 'drafts/z.md', part: 'back' },
    ]);
    expect(updates).toEqual([
      { projectId: expect.any(String), revision: view.revision },
    ]);
  });
});

// C3: b -> f is dropped while f is front, so the graph block is c, b; f is front.
const C3: Record<string, string> = {
  'project.yaml': projectYaml('  - path: drafts/f.md\n    part: front\n'),
  'drafts/a.md': 'Text a.\n',
  'drafts/b.md': 'Text b.\n',
  'drafts/c.md': 'Text c.\n',
  'drafts/f.md': 'Text f.\n',
  'graphs/plot.json': storyGraph(
    'plot',
    [
      { id: 'c1', path: 'drafts/c.md' },
      { id: 'b1', path: 'drafts/b.md' },
      { id: 'a1', path: 'drafts/a.md' },
      { id: 'f1', path: 'drafts/f.md' },
    ],
    [
      { from: 'c1', to: 'b1', relation: 'order' },
      { from: 'b1', to: 'f1', relation: 'order' },
    ],
  ),
};

it('C3 moving graph-ordered files relative to each other and non-permutations are refused; a status write is allowed', async () => {
  await withManuscript(C3, async (app, cookie, library) => {
    const before = bytesOf(library);
    const first = manuscriptOf(await getManuscript(app, cookie));
    expect(pathsOf(first)).toEqual([
      'drafts/f.md',
      'drafts/c.md',
      'drafts/b.md',
      'drafts/a.md',
    ]);
    expect(
      first.entries.filter((entry) => entry.graphOrdered).map((e) => e.path),
    ).toEqual(['drafts/c.md', 'drafts/b.md']);
    const r0 = first.revision;
    const observer = await observeEvents(app.baseUrl, LOOPBACK_HOST, cookie);

    const f = 'drafts/f.md';
    const c = 'drafts/c.md';
    const b = 'drafts/b.md';
    const a = 'drafts/a.md';
    const graphMoves: {
      revision: string;
      front: string[];
      body: string[];
      back: string[];
    }[] = [
      { revision: r0, front: [f], body: [b, c, a], back: [] },
      { revision: r0, front: [f], body: [c, a, b], back: [] },
      { revision: r0, front: [f], body: [a, c, b], back: [] },
    ];
    for (const request of graphMoves) {
      const reply = await reorder(app, cookie, request);
      expect(reply.status).toBe(422);
      expect(errorCode(reply)).toBe('COMPILE_GRAPH_ORDERED_MOVE');
    }
    const partMoves = [
      { path: b, part: 'back' },
      { path: f, part: 'body' },
    ];
    for (const request of partMoves) {
      const reply = await post(app, cookie, MANUSCRIPT_PART_ROUTE, {
        revision: r0,
        ...request,
      });
      expect(reply.status).toBe(422);
      expect(errorCode(reply)).toBe('COMPILE_GRAPH_ORDERED_MOVE');
    }

    const invalid: {
      front: string[];
      body: string[];
      back: string[];
    }[] = [
      { front: [f], body: [c, b, a, a], back: [] },
      { front: [f], body: [c, b], back: [] },
      { front: [f], body: [c, b, a, 'drafts/x.md'], back: [] },
      { front: [f, a], body: [c, b], back: [] },
      { front: [], body: [f, c, b, a], back: [] },
    ];
    for (const request of invalid) {
      const reply = await reorder(app, cookie, { revision: r0, ...request });
      expect(reply.status).toBe(422);
      expect(errorCode(reply)).toBe('COMPILE_INVALID_REORDER');
    }

    expect(bytesOf(library)).toBe(before);
    expect(await eventsAfter(observer)).toEqual([]);

    const status = await post(app, cookie, MANUSCRIPT_STATUS_ROUTE, {
      revision: r0,
      path: b,
      status: 'final',
    });
    expect(status.status).toBe(200);
    const afterStatus = manuscriptOf(status);
    expect(pathsOf(afterStatus)).toEqual([f, c, b, a]);
    expect(
      afterStatus.entries.find((entry) => entry.path === b)?.graphOrdered,
    ).toBe(true);

    const accepted = await reorder(app, cookie, {
      revision: afterStatus.revision,
      front: [f],
      body: [c, b, a],
      back: [],
    });
    await observer.close();
    expect(accepted.status).toBe(200);
  });
});

// C4: no order key at the start, so the first write materialises every file.
const C4: Record<string, string> = {
  'project.yaml': 'schemaVersion: 1\ntitle: Book\ngenrePack: nonfiction\n',
  'drafts/a.md': 'Text a.\n',
  'drafts/b.md': 'Text b.\n',
  'drafts/c.md': 'Text c.\n',
  'drafts/d.md': 'Text d.\n',
};

it('C4 status and part writes materialise the full order and publish manuscript-updated after each', async () => {
  await withManuscript(C4, async (app, cookie, library) => {
    const r0 = manuscriptOf(await getManuscript(app, cookie)).revision;
    const observer = await observeEvents(app.baseUrl, LOOPBACK_HOST, cookie);

    const status = await post(app, cookie, MANUSCRIPT_STATUS_ROUTE, {
      revision: r0,
      path: 'drafts/c.md',
      status: 'final',
    });
    expect(status.status).toBe(200);
    const afterStatus = manuscriptOf(status);
    expect(orderOf(library)).toEqual([
      { path: 'drafts/a.md' },
      { path: 'drafts/b.md' },
      { path: 'drafts/c.md', status: 'final' },
      { path: 'drafts/d.md' },
    ]);
    expect(await eventsAfter(observer)).toEqual([
      { projectId: expect.any(String), revision: afterStatus.revision },
    ]);

    const part = await post(app, cookie, MANUSCRIPT_PART_ROUTE, {
      revision: afterStatus.revision,
      path: 'drafts/d.md',
      part: 'front',
    });
    expect(part.status).toBe(200);
    const afterPart = manuscriptOf(part);
    expect(orderOf(library)).toEqual([
      { path: 'drafts/d.md', part: 'front' },
      { path: 'drafts/a.md' },
      { path: 'drafts/b.md' },
      { path: 'drafts/c.md', status: 'final' },
    ]);
    expect(await eventsAfter(observer)).toEqual([
      { projectId: expect.any(String), revision: afterPart.revision },
    ]);

    const before = bytesOf(library);
    const unknown = await post(app, cookie, MANUSCRIPT_STATUS_ROUTE, {
      revision: afterPart.revision,
      path: 'drafts/gone.md',
      status: 'final',
    });
    expect(unknown.status).toBe(404);
    expect(errorCode(unknown)).toBe('PROJECT_NOT_FOUND');
    expect(bytesOf(library)).toBe(before);
    expect(await eventsAfter(observer)).toEqual([]);
    await observer.close();
  });
});
