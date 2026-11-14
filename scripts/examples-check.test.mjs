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

// PLT-20: the examples check, M1 layer. Every case builds a temp tree and runs the CLI on it
// through --root. The seam is the exit code and the stdout and stderr text. No case reads the
// repository's examples/ folder.
const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, 'examples-check', 'index.mjs');

// The PST-11 layout, minimal. A null value in an override leaves that file out of the tree.
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

test('C1: a valid sample passes; a project.yaml nested under the sample and an entities/ file with no type each fail, naming their paths', () => {
  withTree(VALID, (root) => {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
  });

  withTree(
    treeWith({
      'examples/nonfiction/drafts/extra/project.yaml': 'schemaVersion: 1\n',
    }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(
        hasLine(
          result,
          'examples/nonfiction/drafts/extra/project.yaml: genrePack: ',
        ),
        result.stderr,
      );
      assert.ok(
        hasLine(
          result,
          'examples/nonfiction/drafts/extra/project.yaml: title: ',
        ),
        result.stderr,
      );
    },
  );

  withTree(
    treeWith({
      'examples/nonfiction/entities/style.md':
        '---\nid: style\n---\n\nStyle notes.\n',
    }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(
        hasLine(result, 'examples/nonfiction/entities/style.md: type: '),
        result.stderr,
      );
    },
  );
});

test('C2: a sample that ships .scriba/, logs/, snapshots/ or drafts/.versions/ fails, naming the folder; a .gitignore that names .scriba/ passes', () => {
  withTree(VALID, (root) => {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
  });

  for (const excluded of ['.scriba', 'logs', 'snapshots', 'drafts/.versions']) {
    withTree(
      treeWith({ [`examples/nonfiction/${excluded}/state.txt`]: 'kept\n' }),
      (root) => {
        const result = run(root);
        assert.equal(result.status, 1, result.stderr);
        assert.ok(
          hasLine(result, `examples/nonfiction/${excluded}: `),
          result.stderr,
        );
      },
    );
  }
});

test('C3: a samples.yaml entry with no folder fails naming the id; a folder with no samples.yaml entry fails naming the folder', () => {
  const twoEntries =
    VALID['examples/samples.yaml'] +
    '- id: fiction\n  title: Fiction\n  description: A fiction sample.\n';
  withTree(treeWith({ 'examples/samples.yaml': twoEntries }), (root) => {
    const result = run(root);
    assert.equal(result.status, 1, result.stderr);
    assert.ok(
      errorLines(result).some(
        (line) =>
          line.startsWith('examples/samples.yaml:') && /\bfiction\b/.test(line),
      ),
      result.stderr,
    );
  });

  withTree(
    treeWith({
      'examples/fiction/project.yaml':
        'schemaVersion: 1\ntitle: Fiction\ngenrePack: fiction\n',
    }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(hasLine(result, 'examples/fiction: '), result.stderr);
    },
  );
});

test("C4: a unit test that reads examples/ fails the check; tests and a harness that name only a temp library's or the repo's folder by variable pass", () => {
  withTree(
    treeWith({
      'apps/api/test/reads.test.ts':
        "import { readFileSync } from 'node:fs';\n" +
        "readFileSync(join(root, 'examples/nonfiction/project.yaml'), 'utf8');\n",
    }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(
        hasLine(result, 'apps/api/test/reads.test.ts:2: '),
        result.stderr,
      );
    },
  );

  withTree(
    treeWith({
      'apps/api/test/relative.test.ts':
        "const dir = join(here, '../../examples');\n",
    }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(
        hasLine(result, 'apps/api/test/relative.test.ts:1: '),
        result.stderr,
      );
    },
  );

  withTree(
    treeWith({
      'apps/api/test/dirname.test.ts':
        "const dir = resolve(__dirname, '..', '..', '..', 'examples', 'nonfiction');\n",
    }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(
        hasLine(result, 'apps/api/test/dirname.test.ts:1: '),
        result.stderr,
      );
    },
  );

  withTree(
    treeWith({
      'apps/api/test/library.test.ts':
        "  SCRIBA_EXAMPLES_DIR: join(library, 'examples'),\n",
      'e2e/harness/global-setup.ts':
        "  SCRIBA_EXAMPLES_DIR: join(repoRoot, 'examples'),\n",
    }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 0, result.stderr);
    },
  );
});

test('C5: a deliberately broken sample project.yaml fails with its file path and the schema issue', () => {
  withTree(
    treeWith({
      'examples/nonfiction/project.yaml':
        'schemaVersion: 0\ntitle: Nonfiction\n',
    }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(
        hasLine(result, 'examples/nonfiction/project.yaml: schemaVersion: '),
        result.stderr,
      );
      assert.ok(
        hasLine(result, 'examples/nonfiction/project.yaml: genrePack: '),
        result.stderr,
      );
      assert.equal(
        errorLines(result).at(-1),
        'examples check failed: 2 issue(s)',
        result.stderr,
      );
    },
  );
});

test('C6: the check passes on a nonfiction-shaped sample with two extra sources (one with front matter but no type) and drafts', () => {
  withTree(
    treeWith({
      'examples/nonfiction/sources/notes.md': '# Notes\n',
      'examples/nonfiction/sources/quotes.md':
        '---\ntitle: Quotes\n---\n\nQuotes.\n',
      'examples/nonfiction/drafts/second.md': 'Second draft.\n',
    }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /1 sample\(s\)/);
    },
  );
});

test('E1: a sources/ file with no type is a source and passes; one whose front-matter id breaks the pattern fails, naming its path', () => {
  withTree(
    treeWith({
      'examples/nonfiction/sources/outline.md':
        '---\ntitle: Outline\n---\n\n# Outline\n',
    }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 0, result.stderr);
    },
  );

  withTree(
    treeWith({
      'examples/nonfiction/sources/tagged.md':
        '---\nid: Bad_Id\n---\n\nTagged.\n',
    }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(
        hasLine(result, 'examples/nonfiction/sources/tagged.md: id: '),
        result.stderr,
      );
    },
  );
});

test('E2: samples.yaml must be a list of {id, title, description} with unique ids; each problem names samples.yaml', () => {
  withTree(
    treeWith({ 'examples/samples.yaml': 'nonfiction: {}\n' }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(hasLine(result, 'examples/samples.yaml: '), result.stderr);
    },
  );

  const duplicated =
    VALID['examples/samples.yaml'] + VALID['examples/samples.yaml'];
  withTree(treeWith({ 'examples/samples.yaml': duplicated }), (root) => {
    const result = run(root);
    assert.equal(result.status, 1, result.stderr);
    assert.ok(hasLine(result, 'examples/samples.yaml: '), result.stderr);
  });
});

test('E3: a sample folder without its own project.yaml fails, naming the folder', () => {
  withTree(treeWith({ 'examples/nonfiction/project.yaml': null }), (root) => {
    const result = run(root);
    assert.equal(result.status, 1, result.stderr);
    assert.ok(
      hasLine(result, 'examples/nonfiction/project.yaml: '),
      result.stderr,
    );
  });
});

test('E3: a sample whose project.yaml is a folder, not a file, fails under D8, naming the path', () => {
  withTree(treeWith({ 'examples/nonfiction/project.yaml': null }), (root) => {
    mkdirSync(join(root, 'examples/nonfiction/project.yaml'));
    const result = run(root);
    assert.equal(result.status, 1, result.stderr);
    assert.ok(
      hasLine(
        result,
        'examples/nonfiction/project.yaml: sample folder has no project.yaml',
      ),
      result.stderr,
    );
    assert.equal(
      errorLines(result).at(-1),
      'examples check failed: 1 issue(s)',
      result.stderr,
    );
  });
});

test('E4: an unclosed front matter block or invalid YAML fails, naming the file', () => {
  withTree(
    treeWith({
      'examples/nonfiction/entities/broken.md':
        '---\ntype: style-profile\n\nNo closing line.\n',
    }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(
        hasLine(result, 'examples/nonfiction/entities/broken.md: '),
        result.stderr,
      );
    },
  );

  withTree(
    treeWith({ 'examples/nonfiction/project.yaml': 'title: [unclosed\n' }),
    (root) => {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(
        hasLine(result, 'examples/nonfiction/project.yaml: '),
        result.stderr,
      );
    },
  );
});

test('E5: a symbolic link under examples/ fails, naming the link', () => {
  const outside = mkdtempSync(join(tmpdir(), 'examples-check-outside-'));
  try {
    const target = join(outside, 'leak.md');
    writeFileSync(target, '---\ntype: secret\n---\n');
    withTree(VALID, (root) => {
      symlinkSync(target, join(root, 'examples/nonfiction/entities/leak.md'));
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(
        errorLines(result).some(
          (line) =>
            line.startsWith('examples/nonfiction/entities/leak.md: ') &&
            line.includes('symbolic link'),
        ),
        result.stderr,
      );
    });
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

test('E6: the check passes on an examples/ folder that holds only .gitkeep, and on a root with no examples/ folder', () => {
  withTree({ 'examples/.gitkeep': '' }, (root) => {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
  });

  withTree({}, (root) => {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
  });
});

test('run guard: index.mjs runs when started through a symbolic link; a missing --root folder exits 2 with a stderr line, not silence', () => {
  const dir = mkdtempSync(join(tmpdir(), 'examples-check-link-'));
  try {
    const link = join(dir, 'index-link.mjs');
    symlinkSync(CLI, link);

    const missing = spawnSync(
      process.execPath,
      [link, '--root', join(dir, 'missing')],
      { encoding: 'utf8' },
    );
    assert.equal(missing.status, 2, missing.stderr);
    assert.ok(
      hasLine(missing, 'examples check: not a folder: '),
      missing.stderr,
    );

    withTree(VALID, (root) => {
      const passed = spawnSync(process.execPath, [link, '--root', root], {
        encoding: 'utf8',
      });
      assert.equal(passed.status, 0, passed.stderr);
      assert.match(passed.stdout, /examples check passed/);
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
