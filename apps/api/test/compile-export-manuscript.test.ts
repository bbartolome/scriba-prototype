import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  EVENT_WAIT_MS,
  LOOPBACK_HOST,
  observeEvents,
  snapshotLibrary,
} from './invariant-sweep';
import {
  getManuscript,
  manuscriptOf,
  storyGraph,
  withManuscript,
} from './compile-export-manuscript.kit';
import { putFile } from './project-store-files.kit';

// The project.yaml of a fixture: the base keys and an order key with the given entries.
function projectYaml(order: string): string {
  return `schemaVersion: 1\ntitle: Book\ngenrePack: nonfiction\norder:\n${order}`;
}

// The C3a fixture: five body files, a graph with a same-file edge, a branch and an edge without a path.
const C3A: Record<string, string> = {
  'project.yaml': projectYaml(
    '  - path: drafts/e.md\n  - path: drafts/d.md\n  - path: drafts/a.md\n',
  ),
  'drafts/a.md': 'Text a.\n',
  'drafts/b.md': 'Text b.\n',
  'drafts/c.md': 'Text c.\n',
  'drafts/d.md': 'Text d.\n',
  'drafts/e.md': 'Text e.\n',
  'graphs/plot.json': storyGraph(
    'plot',
    [
      { id: 'c1', path: 'drafts/c.md' },
      { id: 'b1', path: 'drafts/b.md' },
      { id: 'b2', path: 'drafts/b.md' },
      { id: 'd1', path: 'drafts/d.md' },
      { id: 'e1', path: 'drafts/e.md' },
      { id: 'e2', path: 'drafts/e.md' },
      { id: 'a1', path: 'drafts/a.md' },
      { id: 'x1', kind: 'entity' },
    ],
    [
      { from: 'c1', to: 'b1', relation: 'order' },
      { from: 'c1', to: 'd1', relation: 'order' },
      { from: 'b1', to: 'b2', relation: 'order' },
      { from: 'e1', to: 'e2', relation: 'order' },
      { from: 'a1', to: 'c1', relation: 'causality' },
      { from: 'x1', to: 'c1', relation: 'order' },
    ],
  ),
};

it('C1 with no order field and no graph, the manuscript is alphabetical and only top-level .md files count', async () => {
  await withManuscript(
    {
      'drafts/b.md': 'Beta.\n',
      'drafts/a.md': 'Alpha.\n',
      'drafts/.hidden.md': 'Hidden.\n',
      'drafts/notes.txt': 'Notes.\n',
      'drafts/.versions/x/old.md': 'Old.\n',
      'drafts/sub/inner.md': 'Inner.\n',
    },
    async (app, cookie) => {
      const view = manuscriptOf(await getManuscript(app, cookie));
      expect(view.entries.map((entry) => entry.path)).toEqual([
        'drafts/a.md',
        'drafts/b.md',
      ]);
      expect(view.orderSource).toBe('alphabetical');
      expect(view.warnings).toEqual([]);
      for (const entry of view.entries) {
        expect(entry).toMatchObject({
          part: 'body',
          status: 'draft',
          graphOrdered: false,
          inOrderField: false,
        });
      }
    },
  );
});

it('C2 with an order field, listed files come first in order, an unlisted file follows, a stale entry is warned, and the revision moves with its inputs', async () => {
  await withManuscript(
    {
      'project.yaml': projectYaml(
        '  - path: drafts/c.md\n    status: revised\n' +
          '  - path: drafts/gone.md\n' +
          '  - path: drafts/a.md\n    status: final\n' +
          '  - path: drafts/intro.md\n    part: front\n' +
          '  - path: drafts/epilogue.md\n    part: back\n',
      ),
      'drafts/a.md': 'A.\n',
      'drafts/b.md': 'B.\n',
      'drafts/c.md': 'C.\n',
      'drafts/intro.md': 'Intro.\n',
      'drafts/epilogue.md': 'Epilogue.\n',
    },
    async (app, cookie, library) => {
      const first = manuscriptOf(await getManuscript(app, cookie));
      expect(first.entries.map((entry) => entry.path)).toEqual([
        'drafts/intro.md',
        'drafts/c.md',
        'drafts/a.md',
        'drafts/b.md',
        'drafts/epilogue.md',
      ]);
      expect(first.entries.map((entry) => entry.part)).toEqual([
        'front',
        'body',
        'body',
        'body',
        'back',
      ]);
      expect(first.entries.map((entry) => entry.inOrderField)).toEqual([
        true,
        true,
        true,
        false,
        true,
      ]);
      expect(first.entries.map((entry) => [entry.path, entry.status])).toEqual([
        ['drafts/intro.md', 'draft'],
        ['drafts/c.md', 'revised'],
        ['drafts/a.md', 'final'],
        ['drafts/b.md', 'draft'],
        ['drafts/epilogue.md', 'draft'],
      ]);
      expect(first.warnings).toEqual([
        { kind: 'staleEntry', path: 'drafts/gone.md' },
      ]);
      expect(first.orderSource).toBe('project');

      // (1) The order field changes, no file is added: the revision differs.
      putFile(
        library,
        join('book', 'project.yaml'),
        projectYaml(
          '  - path: drafts/a.md\n    status: final\n' +
            '  - path: drafts/c.md\n    status: revised\n',
        ),
      );
      const second = manuscriptOf(await getManuscript(app, cookie));
      expect(second.revision).not.toBe(first.revision);

      // (2) A file is added, the order field does not change: the revision differs again.
      putFile(library, join('book', 'drafts', 'd.md'), 'D.\n');
      const third = manuscriptOf(await getManuscript(app, cookie));
      expect(third.revision).not.toBe(second.revision);
      expect(third.entries.map((entry) => entry.path)).toContain('drafts/d.md');
    },
  );
});

it('C3a and C3b a story graph orders the body with alphabetical ties, ignores same-file and pathless edges, and a cycle falls back', async () => {
  await withManuscript(C3A, async (app, cookie) => {
    const view = manuscriptOf(await getManuscript(app, cookie));
    expect(view.entries.map((entry) => entry.path)).toEqual([
      'drafts/c.md',
      'drafts/b.md',
      'drafts/d.md',
      'drafts/e.md',
      'drafts/a.md',
    ]);
    expect(
      view.entries
        .filter((entry) => entry.graphOrdered)
        .map((entry) => entry.path),
    ).toEqual(['drafts/c.md', 'drafts/b.md', 'drafts/d.md']);
    expect(view.orderSource).toBe('graph+project');
    expect(view.warnings).toEqual([]);
  });

  await withManuscript(
    {
      'project.yaml': projectYaml(
        '  - path: drafts/c.md\n  - path: drafts/b.md\n  - path: drafts/a.md\n',
      ),
      'drafts/a.md': 'A.\n',
      'drafts/b.md': 'B.\n',
      'drafts/c.md': 'C.\n',
      'graphs/loop.json': storyGraph(
        'loop',
        [
          { id: 'p', path: 'drafts/a.md' },
          { id: 'q', path: 'drafts/b.md' },
          { id: 'r', path: 'drafts/c.md' },
        ],
        [
          { from: 'p', to: 'q', relation: 'order' },
          { from: 'q', to: 'p', relation: 'order' },
          { from: 'r', to: 'p', relation: 'order' },
        ],
      ),
    },
    async (app, cookie) => {
      const view = manuscriptOf(await getManuscript(app, cookie));
      expect(view.entries.map((entry) => entry.path)).toEqual([
        'drafts/c.md',
        'drafts/b.md',
        'drafts/a.md',
      ]);
      expect(view.entries.every((entry) => !entry.graphOrdered)).toBe(true);
      expect(view.orderSource).toBe('project');
      expect(view.warnings).toEqual([
        { kind: 'graphCycle', files: ['drafts/a.md', 'drafts/b.md'] },
      ]);
    },
  );
});

it('C4 two story graphs are unioned, and an invalid graph file is skipped with a warning', async () => {
  await withManuscript(
    {
      'drafts/a.md': 'A.\n',
      'drafts/b.md': 'B.\n',
      'drafts/c.md': 'C.\n',
      'drafts/d.md': 'D.\n',
      'graphs/first.json': storyGraph(
        'first',
        [
          { id: 'n1', path: 'drafts/c.md' },
          { id: 'n2', path: 'drafts/b.md' },
        ],
        [{ from: 'n1', to: 'n2', relation: 'order' }],
      ),
      'graphs/second.json': storyGraph(
        'second',
        [
          { id: 'n1', path: 'drafts/d.md' },
          { id: 'n2', path: 'drafts/c.md' },
        ],
        [{ from: 'n1', to: 'n2', relation: 'order' }],
      ),
      'graphs/broken.json': '{ not json',
      'graphs/wrong-schema.json':
        '{"schemaVersion":2,"view":"story","name":"x","nodes":[],"edges":[]}',
    },
    async (app, cookie) => {
      const view = manuscriptOf(await getManuscript(app, cookie));
      expect(view.entries.map((entry) => entry.path)).toEqual([
        'drafts/d.md',
        'drafts/c.md',
        'drafts/b.md',
        'drafts/a.md',
      ]);
      expect(view.orderSource).toBe('graph+project');
      expect(view.warnings).toEqual([
        { kind: 'invalidGraph', path: 'graphs/broken.json' },
        { kind: 'invalidGraph', path: 'graphs/wrong-schema.json' },
      ]);
    },
  );
});

it('C5 word totals equal the sum of per-file counts; front matter, URLs, comments and fenced code do not count', async () => {
  const chapter = [
    '---',
    'title: Front matter words do not count',
    '---',
    '',
    '# Chapter one',
    '',
    'One two three, see https://example.com/some/path now.',
    '',
    '<!-- hidden comment words -->',
    '',
    '```text',
    'fenced code with five words',
    '```',
    '',
    'Four five.',
    '',
  ].join('\n');
  await withManuscript(
    {
      'project.yaml': projectYaml('  - path: drafts/b.md\n    part: back\n'),
      'drafts/a.md': chapter,
      'drafts/b.md': 'Alpha beta.\n',
    },
    async (app, cookie) => {
      const view = manuscriptOf(await getManuscript(app, cookie));
      const words = Object.fromEntries(
        view.entries.map((entry) => [entry.path, entry.words]),
      );
      expect(words).toEqual({ 'drafts/a.md': 9, 'drafts/b.md': 2 });
      expect(view.totals).toEqual({ body: 9, manuscript: 11 });
      const sum = (part?: string): number =>
        view.entries
          .filter((entry) => part === undefined || entry.part === part)
          .reduce((total, entry) => total + entry.words, 0);
      expect(view.totals.body).toBe(sum('body'));
      expect(view.totals.manuscript).toBe(sum());
    },
  );
});

it('C6 the GET is side-effect free', async () => {
  await withManuscript(C3A, async (app, cookie, library) => {
    const before = snapshotLibrary(library);
    const observer = await observeEvents(app.baseUrl, LOOPBACK_HOST, cookie);
    const first = await getManuscript(app, cookie);
    const second = await getManuscript(app, cookie);
    const blocks = await observer.take(EVENT_WAIT_MS);
    await observer.close();
    expect(snapshotLibrary(library)).toEqual(before);
    expect(blocks.some((block) => block.includes('compile-export'))).toBe(
      false,
    );
    expect(second.body).toBe(first.body);
  });
});
