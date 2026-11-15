import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// PLT-21: the examples check, graph layer. Same seam as PLT-20: each case builds a temp tree, runs
// the CLI on it through --root, and reads the exit code and the stdout and stderr text. No case
// reads the repository's examples/ folder.
const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, 'examples-check', 'index.mjs');

// The PLT-20 layout, minimal (a copy, not an import). A null value in an override leaves that file
// out of the tree.
const VALID = {
  'examples/samples.yaml': [
    '- id: nonfiction',
    '  title: Nonfiction',
    '  description: A short nonfiction sample.',
    '',
  ].join('\n'),
  'examples/nonfiction/project.yaml':
    'schemaVersion: 1\ntitle: Nonfiction\ngenrePack: nonfiction\n',
  'examples/nonfiction/sources/outline.md': '# Outline\n\nNo front matter.\n',
  'examples/nonfiction/entities/style.md':
    '---\ntype: style-profile\n---\n\nStyle notes.\n',
  'examples/nonfiction/drafts/cold-open.md': 'A cold open.\n',
  'examples/nonfiction/.gitignore': '.scriba/\n',
};

const STORY = {
  schemaVersion: 1,
  view: 'story',
  name: 'Outline',
  nodes: [
    {
      id: 'ada',
      kind: 'entity',
      label: 'Ada',
      path: 'entities/style.md',
      position: { x: 0, y: 0 },
    },
    {
      id: 'opening',
      kind: 'scene',
      label: 'Opening',
      path: 'drafts/cold-open.md',
      position: { x: 200, y: 0 },
    },
  ],
  edges: [{ id: 'e1', from: 'ada', to: 'opening', relation: 'containment' }],
};

const RECIPE = {
  schemaVersion: 1,
  view: 'recipe',
  name: 'Notes',
  nodes: [
    {
      id: 'notes',
      kind: 'input',
      position: { x: 0, y: 0 },
      params: { type: 'text', label: 'Chapter notes' },
    },
  ],
  edges: [],
};

const CHAPTER_TWO = {
  id: 'chapter-two',
  kind: 'beat',
  label: 'Chapter two',
  path: 'drafts/chapter-two.md',
  position: { x: 400, y: 0 },
};

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function treeWith(overrides) {
  return { ...VALID, ...overrides };
}

function writeFiles(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    if (content === null) continue;
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
}

function withTree(files, body) {
  const root = mkdtempSync(join(tmpdir(), 'examples-check-'));
  try {
    writeFiles(root, files);
    return body(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// A temp folder outside the tree, for the targets of symbolic links.
function withOutside(files, body) {
  const dir = mkdtempSync(join(tmpdir(), 'examples-check-outside-'));
  try {
    writeFiles(dir, files);
    return body(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function run(root) {
  return spawnSync(process.execPath, [CLI, '--root', root], {
    encoding: 'utf8',
  });
}

function errorLines(result) {
  return result.stderr.split('\n').filter((line) => line !== '');
}

function hasLine(result, prefix) {
  return errorLines(result).some((line) => line.startsWith(prefix));
}

test('C1: every graphs/ file must parse with the Graph runner schema; a story and a recipe pass, and a file that is not JSON fails, naming its path', () => {
  const graphs = {
    'examples/nonfiction/graphs/outline.json': json(STORY),
    'examples/nonfiction/graphs/notes.json': json(RECIPE),
  };

  withTree(treeWith(graphs), (root) => {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /examples check passed/);
  });

  withTree(
    treeWith({
      ...graphs,
      'examples/nonfiction/graphs/readme.txt': 'not a graph\n',
    }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(
        hasLine(
          result,
          'examples/nonfiction/graphs/readme.txt: not valid JSON: ',
        ),
        result.stderr,
      );
    },
  );
});

test('C2: a story node whose path names no file fails, naming the graph file and the node id; with the file present it passes', () => {
  const files = {
    'examples/nonfiction/graphs/outline.json': json({
      ...STORY,
      nodes: [...STORY.nodes, CHAPTER_TWO],
    }),
  };

  withTree(treeWith(files), (root) => {
    const result = run(root);
    assert.equal(result.status, 1, result.stderr);
    assert.ok(
      hasLine(
        result,
        'examples/nonfiction/graphs/outline.json: node "chapter-two": path "drafts/chapter-two.md" is not an existing file in this sample',
      ),
      result.stderr,
    );
  });

  withTree(
    treeWith({
      ...files,
      'examples/nonfiction/drafts/chapter-two.md': 'Chapter two.\n',
    }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 0, result.stderr);
    },
  );
});

test('C3: a graph that violates the schema fails, naming the graph file and the field', () => {
  withTree(
    treeWith({
      'examples/nonfiction/graphs/bad.json': json({
        ...STORY,
        schemaVersion: 2,
      }),
    }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(
        hasLine(result, 'examples/nonfiction/graphs/bad.json: schemaVersion: '),
        result.stderr,
      );
    },
  );
});

test('C4: a sample with no graphs/ folder passes, and so does one with an empty graphs/ folder', () => {
  withTree(VALID, (root) => {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
  });

  withTree(VALID, (root) => {
    mkdirSync(join(root, 'examples', 'nonfiction', 'graphs'));
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
  });
});

test('E1: a story path that leaves the sample fails, even when the file exists outside it; label-only nodes and nodes sharing one file pass', () => {
  const escape = {
    ...STORY,
    nodes: [{ ...STORY.nodes[0], path: '../outside.md' }, STORY.nodes[1]],
  };

  withTree(
    treeWith({
      'examples/outside.md': 'A file next to the sample.\n',
      'examples/nonfiction/graphs/escape.json': json(escape),
    }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(
        hasLine(
          result,
          'examples/nonfiction/graphs/escape.json: node "ada": path "../outside.md" is not an existing file in this sample',
        ),
        result.stderr,
      );
    },
  );

  const shared = {
    schemaVersion: 1,
    view: 'story',
    name: 'Shared',
    nodes: [
      {
        id: 'scene-a',
        kind: 'scene',
        label: 'Scene A',
        path: 'drafts/cold-open.md',
        position: { x: 0, y: 0 },
      },
      {
        id: 'scene-b',
        kind: 'scene',
        label: 'Scene B',
        path: 'drafts/cold-open.md',
        position: { x: 200, y: 0 },
      },
      {
        id: 'beat-label',
        kind: 'beat',
        label: 'A label-only beat',
        position: { x: 400, y: 0 },
      },
    ],
    edges: [],
  };

  withTree(
    treeWith({ 'examples/nonfiction/graphs/shared.json': json(shared) }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 0, result.stderr);
    },
  );
});

test('E2: a story path that names a folder fails', () => {
  const folder = {
    ...STORY,
    nodes: [STORY.nodes[0], { ...STORY.nodes[1], path: 'drafts' }],
  };

  withTree(
    treeWith({ 'examples/nonfiction/graphs/folder.json': json(folder) }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(
        hasLine(
          result,
          'examples/nonfiction/graphs/folder.json: node "opening": path "drafts" is not an existing file in this sample',
        ),
        result.stderr,
      );
    },
  );
});

test('E3: a graphs entry that is a file, not a folder, fails once', () => {
  withTree(
    treeWith({ 'examples/nonfiction/graphs': 'not a folder\n' }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      const lines = errorLines(result);
      assert.equal(lines.length, 2, result.stderr);
      assert.ok(
        lines[0].startsWith(
          'examples/nonfiction/graphs: graphs must be a folder',
        ),
        lines[0],
      );
      assert.equal(lines[1], 'examples check failed: 1 issue(s)');
    },
  );
});

test('E4: a graphs symbolic link fails once, through the M1 layer', () => {
  withOutside({ 'broken.json': '{\n' }, (outside) => {
    withTree(VALID, (root) => {
      symlinkSync(outside, join(root, 'examples', 'nonfiction', 'graphs'));
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      const lines = errorLines(result).filter((line) =>
        line.startsWith('examples/nonfiction/graphs: '),
      );
      assert.equal(lines.length, 1, result.stderr);
      assert.ok(lines[0].includes('symbolic link'), lines[0]);
      assert.equal(
        errorLines(result).at(-1),
        'examples check failed: 1 issue(s)',
      );
    });
  });
});

test('E5: duplicate node ids fail under the save rule, naming the path', () => {
  const dup = {
    ...STORY,
    nodes: [STORY.nodes[0], { ...STORY.nodes[1], id: 'ada' }],
  };

  withTree(
    treeWith({ 'examples/nonfiction/graphs/dup.json': json(dup) }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(
        errorLines(result).some(
          (line) =>
            line.startsWith(
              'examples/nonfiction/graphs/dup.json: nodes.1.id: ',
            ) && line.includes('Duplicate node id "ada"'),
        ),
        result.stderr,
      );
    },
  );
});

test('E6: a symbolic link file under graphs/ fails once, through the M1 layer', () => {
  withOutside({ 'recipe.json': json(RECIPE) }, (outside) => {
    withTree(VALID, (root) => {
      mkdirSync(join(root, 'examples', 'nonfiction', 'graphs'));
      symlinkSync(
        join(outside, 'recipe.json'),
        join(root, 'examples', 'nonfiction', 'graphs', 'link.json'),
      );
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      const lines = errorLines(result).filter((line) =>
        line.startsWith('examples/nonfiction/graphs/link.json: '),
      );
      assert.equal(lines.length, 1, result.stderr);
      assert.ok(lines[0].includes('symbolic link'), lines[0]);
      assert.equal(
        errorLines(result).at(-1),
        'examples check failed: 1 issue(s)',
      );
    });
  });
});
