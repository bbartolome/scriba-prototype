import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { before } from 'node:test';

// PLT-22: the examples check, pack layer. Same seam as PLT-20 and PLT-21: each case builds a temp
// tree, runs the CLI on it through --root, and reads the exit code and the stdout and stderr text.
// The built-in packs (packages/packs) are read by the CLI, so the tests name real built-in tools and
// kinds. No case reads the repository's examples/ folder.
const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const CLI = join(here, 'examples-check', 'index.mjs');
const API = join(repo, 'apps', 'api');
const LIBRARY = join(API, 'dist', 'modules', 'tool-registry', 'pack-lint.js');

// The library is built by the API build. A test run on a fresh checkout builds it first.
before(() => {
  if (!existsSync(LIBRARY)) {
    execFileSync('npm', ['run', 'build', '-w', '@bbartolome/scriba-api'], {
      cwd: repo,
      stdio: 'inherit',
    });
  }
});

const SAMPLE = 'examples/nonfiction';

// The base tree (the D11 version of the PLT-20 layout): a nonfiction sample with a complete source,
// a complete style profile, one draft and the sample's .gitignore.
const VALID = {
  'examples/samples.yaml': [
    '- id: nonfiction',
    '  title: Nonfiction',
    '  description: A short nonfiction sample.',
    '',
  ].join('\n'),
  'examples/nonfiction/project.yaml':
    'schemaVersion: 1\ntitle: Nonfiction\ngenrePack: nonfiction\n',
  'examples/nonfiction/sources/outline.md': [
    '---',
    'title: Outline',
    'citation: The author outline',
    'reliability: Own plan',
    '---',
    '',
    '# Outline',
    '',
  ].join('\n'),
  'examples/nonfiction/entities/style.md': [
    '---',
    'type: style-profile',
    'tone: Plain',
    'targetLength: 800',
    'bannedPhrases: [game-changer]',
    '---',
    '',
    'Style notes.',
    '',
  ].join('\n'),
  'examples/nonfiction/drafts/cold-open.md': 'A cold open.\n',
  'examples/nonfiction/.gitignore': '.scriba/\n',
};

const RECIPE_TOOL = (params, tool = 'cold_open') =>
  JSON.stringify({
    schemaVersion: 1,
    view: 'recipe',
    name: 'Recipe',
    nodes: [
      {
        id: 'opening',
        kind: 'tool',
        tool,
        position: { x: 0, y: 0 },
        ...(params === undefined ? {} : { params }),
      },
    ],
    edges: [],
  });

// Writes each file of the tree under a fresh temp root, runs the CLI on it, then removes the root.
function withTree(files, run) {
  const root = mkdtempSync(join(tmpdir(), 'plt22-pack-'));
  try {
    for (const [rel, content] of Object.entries({ ...VALID, ...files })) {
      if (content === null) continue;
      const path = join(root, rel);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
    }
    const result = spawnSync(process.execPath, [CLI, '--root', root], {
      encoding: 'utf8',
    });
    return run({ ...result, lines: result.stderr.split('\n').filter(Boolean) });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function hasLine(lines, start, contains) {
  return lines.some(
    (line) => line.startsWith(start) && line.includes(contains),
  );
}

test('C1: a recipe tool node naming a built-in tool with valid params passes; an unknown tool, and params that break its inputs, fail naming the file and the node', () => {
  const graph = `${SAMPLE}/graphs/recipe.json`;
  const ok = withTree({ [graph]: RECIPE_TOOL({ length: 800 }) }, (r) => r);
  assert.equal(ok.status, 0, ok.stderr);

  const unknown = withTree(
    { [graph]: RECIPE_TOOL({ length: 800 }, 'no_such_tool') },
    (r) => r,
  );
  assert.equal(unknown.status, 1);
  assert.ok(
    hasLine(
      unknown.lines,
      `${graph}: `,
      'node "opening": tool "no_such_tool" is not a built-in tool',
    ),
    unknown.stderr,
  );

  const short = withTree({ [graph]: RECIPE_TOOL({ length: 100 }) }, (r) => r);
  assert.equal(short.status, 1);
  assert.ok(
    hasLine(
      short.lines,
      `${graph}: `,
      'node "opening": length: expected at least 200',
    ),
    short.stderr,
  );

  const misspelt = withTree(
    { [graph]: RECIPE_TOOL({ lenght: 800 }) },
    (r) => r,
  );
  assert.equal(misspelt.status, 1);
  assert.ok(
    hasLine(
      misspelt.lines,
      `${graph}: `,
      'node "opening": lenght: unknown field',
    ),
    misspelt.stderr,
  );
});

test("C2: entity front matter is checked against the pack's entity-type schema; a claim status outside its enum, a person without role and an unknown type each fail, naming the file", () => {
  const ENTITY = 'examples/nonfiction/entities';

  const base = withTree({}, (r) => r);
  assert.equal(base.status, 0, base.stderr);

  const claim = withTree(
    {
      [`${ENTITY}/claim.md`]: [
        '---',
        'type: claim',
        'statement: S',
        'evidence: [outline]',
        'status: maybe',
        '---',
        '',
      ].join('\n'),
    },
    (r) => r,
  );
  assert.equal(claim.status, 1);
  assert.ok(
    hasLine(claim.lines, `${SAMPLE}/entities/claim.md: status: `, ''),
    claim.stderr,
  );

  const person = withTree(
    {
      [`${ENTITY}/ada.md`]: [
        '---',
        'type: person',
        'name: Ada',
        'sources: [outline]',
        '---',
        '',
      ].join('\n'),
    },
    (r) => r,
  );
  assert.equal(person.status, 1);
  assert.ok(
    person.lines.includes(
      `${SAMPLE}/entities/ada.md: (root): missing required property "role"`,
    ),
    person.stderr,
  );

  const unknown = withTree(
    { [`${ENTITY}/odd.md`]: '---\ntype: no-such-kind\n---\n' },
    (r) => r,
  );
  assert.equal(unknown.status, 1);
  assert.ok(
    unknown.lines.includes(
      `${SAMPLE}/entities/odd.md: type: "no-such-kind" is not a built-in entity type`,
    ),
    unknown.stderr,
  );
});

test('C3: an unresolved [@id] citation or reference field fails with the file path and the id', () => {
  const cite = withTree(
    { [`${SAMPLE}/drafts/cold-open.md`]: 'Cited [@no-such-id].\n' },
    (r) => r,
  );
  assert.equal(cite.status, 1);
  assert.ok(
    hasLine(
      cite.lines,
      `${SAMPLE}/drafts/cold-open.md: `,
      '[@no-such-id] does not name an entity or source',
    ),
    cite.stderr,
  );

  const reference = withTree(
    {
      [`${SAMPLE}/entities/claim.md`]: [
        '---',
        'type: claim',
        'statement: S',
        'evidence: [no-such-source]',
        'status: supported',
        '---',
        '',
      ].join('\n'),
    },
    (r) => r,
  );
  assert.equal(reference.status, 1);
  assert.ok(
    hasLine(
      reference.lines,
      `${SAMPLE}/entities/claim.md: evidence: "no-such-source" does not name`,
      '',
    ),
    reference.stderr,
  );
});

test('C4: a deliberately broken sample file fails with its path and the schema issue, and the last line counts the issues', () => {
  const result = withTree(
    {
      [`${SAMPLE}/entities/claim.md`]: [
        '---',
        'type: claim',
        'statement: S',
        'evidence: [outline]',
        'status: maybe',
        '---',
        '',
      ].join('\n'),
    },
    (r) => r,
  );
  assert.equal(result.status, 1);
  assert.ok(
    hasLine(result.lines, `${SAMPLE}/entities/claim.md: status: `, ''),
    result.stderr,
  );
  assert.equal(result.lines.at(-1), 'examples check failed: 1 issue(s)');
});

test('C5: a nonfiction-shaped sample with schema-valid entities, resolvable references and citations passes', () => {
  const result = withTree(
    {
      [`${SAMPLE}/entities/claim.md`]: [
        '---',
        'type: claim',
        'statement: S',
        'evidence: [outline]',
        'status: supported',
        '---',
        '',
      ].join('\n'),
      [`${SAMPLE}/entities/ada.md`]: [
        '---',
        'type: person',
        'name: Ada',
        'role: R',
        'sources: [outline]',
        '---',
        '',
      ].join('\n'),
      [`${SAMPLE}/drafts/cold-open.md`]: 'Cited [@outline; @ada].\n',
    },
    (r) => r,
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1 sample\(s\)/);
});

test('E1: an id that two files define is reported where it is named, with both paths', () => {
  const ENTITY = `${SAMPLE}/entities`;
  const concept = (name) =>
    [
      '---',
      'type: concept',
      'id: shared',
      `name: ${name}`,
      `definition: ${name} definition`,
      '---',
      '',
    ].join('\n');
  const result = withTree(
    {
      [`${ENTITY}/dup-one.md`]: concept('One'),
      [`${ENTITY}/dup-two.md`]: concept('Two'),
      [`${ENTITY}/claim.md`]: [
        '---',
        'type: claim',
        'statement: S',
        'evidence: [shared]',
        'status: supported',
        '---',
        '',
      ].join('\n'),
    },
    (r) => r,
  );
  assert.equal(result.status, 1);
  assert.ok(
    result.lines.some((line) =>
      line.includes(
        'evidence: "shared" names more than one file (examples/nonfiction/entities/dup-one.md, examples/nonfiction/entities/dup-two.md)',
      ),
    ),
    result.stderr,
  );
});

test('E2: a file that PLT-20 already reports gets no second issue from the pack layer', () => {
  const ENTITY = `${SAMPLE}/entities`;
  const broken = withTree(
    { [`${ENTITY}/broken.md`]: '---\ntype: concept\nname: X\n' },
    (r) => r,
  );
  assert.equal(broken.status, 1);
  assert.equal(
    broken.lines.filter((line) => line.startsWith(`${ENTITY}/broken.md: `))
      .length,
    1,
    broken.stderr,
  );

  const notype = withTree(
    { [`${ENTITY}/notype.md`]: '---\nname: X\n---\n' },
    (r) => r,
  );
  assert.equal(notype.status, 1);
  assert.equal(
    notype.lines.filter((line) => line.startsWith(`${ENTITY}/notype.md: `))
      .length,
    1,
    notype.stderr,
  );
});

test('E3: a [@id] in code is not a citation, and each id of a multi-citation is checked', () => {
  const result = withTree(
    {
      [`${SAMPLE}/drafts/code.md`]: [
        '```',
        '[@no-such]',
        '```',
        '',
        'Inline `[@also-no]` and [@outline; @no-such-two].',
        '',
      ].join('\n'),
    },
    (r) => r,
  );
  assert.equal(result.status, 1);
  const own = result.lines.filter((line) =>
    line.startsWith(`${SAMPLE}/drafts/code.md: `),
  );
  assert.equal(own.length, 1, result.stderr);
  assert.ok(own[0].includes('[@no-such-two]'), result.stderr);
});

test('E4: an entity id taken from a file name must match the id pattern', () => {
  const result = withTree(
    {
      [`${SAMPLE}/entities/Bad_Name.md`]: [
        '---',
        'type: concept',
        'name: X',
        'definition: X definition',
        '---',
        '',
      ].join('\n'),
    },
    (r) => r,
  );
  assert.equal(result.status, 1);
  assert.ok(
    result.lines.includes(
      `${SAMPLE}/entities/Bad_Name.md: entity id "Bad_Name" from the file name does not match ^[a-z0-9][a-z0-9-]*$`,
    ),
    result.stderr,
  );
});
