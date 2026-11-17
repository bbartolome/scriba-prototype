import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import { LOOPBACK_HOST, snapshotLibrary } from './invariant-sweep';
import { bookLibrary, putFile } from './project-store-files.kit';
import { postJson } from './project-store-projects.kit';

// The static root of invariant-get-head.test.ts (line 23): no web build is needed.
const STATIC_ROOT = resolve(__dirname, 'fixtures/static');
const GRAPHS = '/api/graph-runner/graphs';
const VALIDATE = `${GRAPHS}/validate`;
const TOOLS = '/api/tool-registry/tools';

// The severity of each rule (GRR-03 section 2a). The test compares every issue with it.
const SEVERITY: Record<string, 'error' | 'warning'> = {
  'illegal-node-kind': 'error',
  'unknown-tool': 'error',
  'disabled-tool': 'error',
  'missing-port': 'error',
  'port-type-mismatch': 'error',
  'multiple-wires-into-port': 'error',
  'port-wired-and-pinned': 'error',
  'required-port-unfed': 'error',
  'tool-params-invalid': 'error',
  cycle: 'error',
  'output-unwired': 'error',
  'output-not-fed-by-tool': 'error',
  'output-kind-unwritable': 'error',
  'duplicate-id': 'error',
  'dead-step': 'warning',
  'input-unwired': 'warning',
  'pinned-entity-missing': 'warning',
  'path-missing': 'warning',
  'path-unsafe': 'warning',
  'path-in-versions': 'warning',
  'unknown-edge-node': 'warning',
  'entity-path-outside-entities': 'warning',
};

// One expected or actual issue, reduced to the keys the unit's criteria name.
interface Reduced {
  code: string;
  severity: string;
  nodeId?: string;
  edgeId?: string;
  portId?: string;
}

// The expected issue of a code, with the ids it carries.
function expected(
  code: string,
  ids: { nodeId?: string; edgeId?: string; portId?: string } = {},
): Reduced {
  return { code, severity: SEVERITY[code] as string, ...ids };
}

// The text a graph file must hold: two-space JSON and a final newline.
function text(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

// A copy of a value, so that each row changes its own graph only.
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// The tool file of a user tool: one text port `topic`, one required setting `words`, and the given changes.
function toolYaml(
  name: string,
  options: { enabled?: boolean; output?: string; entity?: boolean } = {},
): string {
  const lines = [
    'schemaVersion: 1',
    `name: ${name}`,
    `description: The ${name} tool.`,
    'inputs:',
    '  type: object',
    '  properties:',
  ];
  if (options.entity === true) {
    lines.push(
      '    person:',
      '      type: string',
      '      title: Person',
      '      x-scriba-type: entity',
      '      x-scriba-port: true',
    );
  }
  lines.push(
    '    topic:',
    '      type: string',
    '      title: Topic',
    '      x-scriba-type: text',
    '      x-scriba-port: true',
    '    words:',
    '      type: integer',
    '      minimum: 1',
    '      title: Words',
    options.entity === true
      ? '  required: [words]'
      : '  required: [topic, words]',
    `output: ${options.output ?? 'draft'}`,
    `enabled: ${options.enabled === false ? 'false' : 'true'}`,
    'prompt: |',
    '  Write about {{topic}}.',
    '',
  );
  return lines.join('\n');
}

// Writes the four user tools into the user pack of the library, before the app starts.
function writeTools(library: string): void {
  const folder = join(library, '.scriba', 'packs', 'user', 'tools');
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'gr_text.yaml'), toolYaml('gr_text'));
  writeFileSync(
    join(folder, 'gr_off.yaml'),
    toolYaml('gr_off', { enabled: false }),
  );
  writeFileSync(
    join(folder, 'gr_claims.yaml'),
    toolYaml('gr_claims', { output: 'claims' }),
  );
  writeFileSync(
    join(folder, 'gr_entity.yaml'),
    toolYaml('gr_entity', { entity: true }),
  );
}

// Boots the composed app on a fresh book library with the four tools and the story files, and removes the library in
// every case.
async function withValidationApp<T>(
  run: (app: TestApp, cookie: string, library: string) => Promise<T>,
): Promise<T> {
  const fixture = bookLibrary();
  try {
    writeTools(fixture.library);
    putFile(
      fixture.library,
      'book/entities/ada.md',
      '---\ntype: person\n---\n# Ada\n',
    );
    putFile(fixture.library, 'book/drafts/ch01.md', '# Chapter 1\n');
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

// The issues of a validate or save answer, reduced and sorted, after the status is checked.
function issuesOf(reply: Reply): Reduced[] {
  expect(reply.status).toBe(200);
  const { issues } = JSON.parse(reply.body) as {
    issues: (Reduced & { message: string })[];
  };
  for (const issue of issues) {
    expect(typeof issue.message).toBe('string');
    expect(issue.message.length).toBeGreaterThan(0);
  }
  return sorted(issues.map(reduce));
}

// An issue with only the keys the criteria compare; a key the issue does not carry is absent.
function reduce(issue: Reduced): Reduced {
  const reduced: Reduced = { code: issue.code, severity: issue.severity };
  if (issue.nodeId !== undefined) reduced.nodeId = issue.nodeId;
  if (issue.edgeId !== undefined) reduced.edgeId = issue.edgeId;
  if (issue.portId !== undefined) reduced.portId = issue.portId;
  return reduced;
}

// The issues in a fixed order: code, then the three ids.
function sorted(issues: Reduced[]): Reduced[] {
  const key = (issue: Reduced): string =>
    [
      issue.code,
      issue.nodeId ?? '',
      issue.edgeId ?? '',
      issue.portId ?? '',
    ].join('|');
  return [...issues].sort((a, b) =>
    key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0,
  );
}

// A validate request with the session cookie and the loopback Origin.
function validate(app: TestApp, cookie: string, body: unknown): Promise<Reply> {
  return postJson(app, cookie, VALIDATE, body);
}

// The recipe R0: input in1 to tool n1 to output out1 (the valid recipe of section 4).
function recipe(nodes: unknown[], edges: unknown[]): unknown {
  return {
    schemaVersion: 1,
    view: 'recipe',
    name: 'Chapter',
    nodes,
    edges,
  };
}

const IN1 = {
  id: 'in1',
  kind: 'input',
  position: { x: 0, y: 0 },
  params: { type: 'text', label: 'Topic' },
};
const N1 = {
  id: 'n1',
  kind: 'tool',
  position: { x: 200, y: 0 },
  tool: 'gr_text',
  params: { words: 40 },
};
const OUT1 = { id: 'out1', kind: 'output', position: { x: 400, y: 0 } };
const W1 = { id: 'w1', from: 'in1.out', to: 'n1.topic' };
const W2 = { id: 'w2', from: 'n1.output', to: 'out1.in' };

function r0(): unknown {
  return recipe([clone(IN1), clone(N1), clone(OUT1)], [clone(W1), clone(W2)]);
}

// The story S0: entity e1 to scene s1 (the valid story of section 4).
function s0(): unknown {
  return {
    schemaVersion: 1,
    view: 'story',
    name: 'Book',
    nodes: [
      {
        id: 'e1',
        kind: 'entity',
        label: 'Ada',
        path: 'entities/ada.md',
        position: { x: 0, y: 0 },
      },
      {
        id: 's1',
        kind: 'scene',
        label: 'Chapter 1',
        path: 'drafts/ch01.md',
        position: { x: 200, y: 0 },
      },
    ],
    edges: [{ id: 'e2', from: 'e1', to: 's1', relation: 'order' }],
  };
}

// Each C1 row: a name, the body, and the one issue it must produce.
interface Row {
  name: string;
  body: unknown;
  issues: Reduced[];
}

// The C1 rows (section 4). Each row changes R0 or S0 and produces exactly the issue its rule names.
function c1Rows(): Row[] {
  return [
    {
      name: '1 unknown-tool',
      body: (() => {
        const body = r0() as { nodes: { id: string; tool?: string }[] };
        const n1 = body.nodes.find((node) => node.id === 'n1');
        if (n1 !== undefined) n1.tool = 'gr_missing';
        return body;
      })(),
      issues: [expected('unknown-tool', { nodeId: 'n1' })],
    },
    {
      name: '2 disabled-tool',
      body: (() => {
        const body = r0() as { nodes: { id: string; tool?: string }[] };
        const n1 = body.nodes.find((node) => node.id === 'n1');
        if (n1 !== undefined) n1.tool = 'gr_off';
        return body;
      })(),
      issues: [expected('disabled-tool', { nodeId: 'n1' })],
    },
    {
      name: '3 missing-port',
      body: (() => {
        const body = r0() as { edges: unknown[] };
        body.edges.push({ id: 'w3', from: 'in1.out', to: 'n1.nope' });
        return body;
      })(),
      issues: [expected('missing-port', { edgeId: 'w3', portId: 'n1.nope' })],
    },
    {
      name: '4 port-type-mismatch',
      body: (() => {
        const body = r0() as { nodes: { id: string; params?: unknown }[] };
        const in1 = body.nodes.find((node) => node.id === 'in1') as {
          params: { type: string };
        };
        in1.params.type = 'entity';
        return body;
      })(),
      issues: [
        expected('port-type-mismatch', { edgeId: 'w1', portId: 'n1.topic' }),
      ],
    },
    {
      name: '5 multiple-wires-into-port',
      body: (() => {
        const body = r0() as { nodes: unknown[]; edges: unknown[] };
        body.nodes.push({
          id: 'in2',
          kind: 'input',
          position: { x: 0, y: 200 },
          params: { type: 'text', label: 'Second' },
        });
        body.edges.push({ id: 'w3', from: 'in2.out', to: 'n1.topic' });
        return body;
      })(),
      issues: [
        expected('multiple-wires-into-port', {
          edgeId: 'w3',
          portId: 'n1.topic',
        }),
      ],
    },
    {
      name: '6 port-wired-and-pinned',
      body: (() => {
        const body = r0() as { nodes: { id: string; params?: unknown }[] };
        const n1 = body.nodes.find((node) => node.id === 'n1') as {
          params: Record<string, unknown>;
        };
        n1.params = { words: 40, topic: 'pinned' };
        return body;
      })(),
      issues: [
        expected('port-wired-and-pinned', { nodeId: 'n1', portId: 'n1.topic' }),
      ],
    },
    {
      name: '7 required-port-unfed',
      body: (() => {
        const body = r0() as {
          nodes: { id: string }[];
          edges: { id: string }[];
        };
        body.nodes = body.nodes.filter((node) => node.id !== 'in1');
        body.edges = body.edges.filter((edge) => edge.id !== 'w1');
        return body;
      })(),
      issues: [
        expected('required-port-unfed', { nodeId: 'n1', portId: 'n1.topic' }),
      ],
    },
    {
      name: '8 tool-params-invalid',
      body: (() => {
        const body = r0() as { nodes: { id: string; params?: unknown }[] };
        const n1 = body.nodes.find((node) => node.id === 'n1') as {
          params: Record<string, unknown>;
        };
        n1.params = {};
        return body;
      })(),
      issues: [expected('tool-params-invalid', { nodeId: 'n1' })],
    },
    {
      name: '9 cycle',
      body: recipe(
        [{ ...clone(N1), id: 'n1' }, { ...clone(N1), id: 'n2' }, clone(OUT1)],
        [
          { id: 'w1', from: 'n1.output', to: 'n2.topic' },
          { id: 'w2', from: 'n2.output', to: 'n1.topic' },
          { id: 'w3', from: 'n2.output', to: 'out1.in' },
        ],
      ),
      issues: [expected('cycle', { nodeId: 'n1' })],
    },
    {
      name: '10 output-unwired',
      body: (() => {
        const body = r0() as { nodes: unknown[] };
        body.nodes.push({
          id: 'out2',
          kind: 'output',
          position: { x: 600, y: 0 },
        });
        return body;
      })(),
      issues: [expected('output-unwired', { nodeId: 'out2' })],
    },
    {
      name: '11 output-not-fed-by-tool',
      body: (() => {
        const body = r0() as { nodes: unknown[]; edges: unknown[] };
        body.nodes.push({
          id: 'out2',
          kind: 'output',
          position: { x: 600, y: 0 },
        });
        body.edges.push({ id: 'w4', from: 'in1.out', to: 'out2.in' });
        return body;
      })(),
      issues: [
        expected('output-not-fed-by-tool', { nodeId: 'out2', edgeId: 'w4' }),
      ],
    },
    {
      name: '12 output-kind-unwritable',
      body: (() => {
        const body = r0() as { nodes: { id: string; tool?: string }[] };
        const n1 = body.nodes.find((node) => node.id === 'n1');
        if (n1 !== undefined) n1.tool = 'gr_claims';
        return body;
      })(),
      issues: [
        expected('output-kind-unwritable', { nodeId: 'out1', edgeId: 'w2' }),
      ],
    },
    {
      name: '13 duplicate-id (node)',
      body: (() => {
        const body = r0() as { nodes: unknown[] };
        body.nodes.splice(2, 0, clone(N1));
        return body;
      })(),
      issues: [expected('duplicate-id', { nodeId: 'n1' })],
    },
    {
      name: '14 duplicate-id (edge)',
      body: (() => {
        const body = r0() as { edges: unknown[] };
        body.edges.splice(1, 0, clone(W1));
        return body;
      })(),
      issues: [expected('duplicate-id', { edgeId: 'w1' })],
    },
    {
      name: '15 input-unwired',
      body: (() => {
        const body = r0() as { nodes: unknown[] };
        body.nodes.push({
          id: 'in2',
          kind: 'input',
          position: { x: 0, y: 200 },
          params: { type: 'text', label: 'Second' },
        });
        return body;
      })(),
      issues: [expected('input-unwired', { nodeId: 'in2' })],
    },
    {
      name: '16 dead-step',
      body: (() => {
        const body = r0() as { nodes: unknown[]; edges: unknown[] };
        body.nodes.push({
          id: 'n3',
          kind: 'tool',
          position: { x: 200, y: 200 },
          tool: 'gr_text',
          params: { words: 40 },
        });
        body.edges.push({ id: 'w3', from: 'in1.out', to: 'n3.topic' });
        return body;
      })(),
      issues: [expected('dead-step', { nodeId: 'n3' })],
    },
    {
      name: '17 pinned-entity-missing',
      body: recipe(
        [
          {
            id: 'n4',
            kind: 'tool',
            position: { x: 0, y: 0 },
            tool: 'gr_entity',
            params: { words: 40, person: 'no-such-person' },
          },
          clone(OUT1),
        ],
        [{ id: 'w2', from: 'n4.output', to: 'out1.in' }],
      ),
      issues: [
        expected('pinned-entity-missing', {
          nodeId: 'n4',
          portId: 'n4.person',
        }),
      ],
    },
    {
      name: '18 path-missing (story)',
      body: (() => {
        const body = s0() as { nodes: { id: string; path?: string }[] };
        const e1 = body.nodes.find((node) => node.id === 'e1');
        if (e1 !== undefined) e1.path = 'entities/nobody.md';
        return body;
      })(),
      issues: [expected('path-missing', { nodeId: 'e1' })],
    },
    {
      name: '19 path-unsafe (story)',
      body: (() => {
        const body = s0() as { nodes: { id: string; path?: string }[] };
        const e1 = body.nodes.find((node) => node.id === 'e1');
        if (e1 !== undefined) e1.path = 'entities/../secret.md';
        return body;
      })(),
      issues: [expected('path-unsafe', { nodeId: 'e1' })],
    },
    {
      name: '20 path-in-versions (story)',
      body: (() => {
        const body = s0() as { nodes: { id: string; path?: string }[] };
        const s1 = body.nodes.find((node) => node.id === 's1');
        if (s1 !== undefined) s1.path = 'drafts/.versions/ch01.md';
        return body;
      })(),
      issues: [expected('path-in-versions', { nodeId: 's1' })],
    },
    {
      name: '21 unknown-edge-node (story)',
      body: (() => {
        const body = s0() as {
          nodes: { id: string; path?: string }[];
          edges: { id: string; to: string }[];
        };
        const s1 = body.nodes.find((node) => node.id === 's1');
        if (s1 !== undefined) delete s1.path;
        const e2 = body.edges.find((edge) => edge.id === 'e2');
        if (e2 !== undefined) e2.to = 'ghost';
        return body;
      })(),
      issues: [expected('unknown-edge-node', { edgeId: 'e2' })],
    },
    {
      name: '22 entity-path-outside-entities (story)',
      body: (() => {
        const body = s0() as { nodes: { id: string; path?: string }[] };
        const e1 = body.nodes.find((node) => node.id === 'e1');
        if (e1 !== undefined) e1.path = 'drafts/ch01.md';
        return body;
      })(),
      issues: [expected('entity-path-outside-entities', { nodeId: 'e1' })],
    },
    {
      name: '23 illegal-node-kind',
      body: (() => {
        const body = r0() as { nodes: unknown[] };
        body.nodes.push({
          id: 'x1',
          kind: 'scene',
          label: 'Scene',
          position: { x: 0, y: 0 },
        });
        return body;
      })(),
      issues: [expected('illegal-node-kind', { nodeId: 'x1' })],
    },
    {
      name: 'control: valid recipe',
      body: r0(),
      issues: [],
    },
    {
      name: 'control: valid story',
      body: s0(),
      issues: [],
    },
    {
      name: 'control: pinned entity that exists',
      body: recipe(
        [
          {
            id: 'n5',
            kind: 'tool',
            position: { x: 0, y: 0 },
            tool: 'gr_entity',
            params: { words: 40, person: 'ada' },
          },
          clone(OUT1),
        ],
        [{ id: 'w2', from: 'n5.output', to: 'out1.in' }],
      ),
      issues: [],
    },
  ];
}

it('graph validation, C1: every rule has a fixture that produces exactly its issues', () =>
  withValidationApp(async (app, cookie) => {
    const tools = JSON.parse((await get(app, cookie, TOOLS)).body) as {
      tools: { name: string; valid: boolean; enabled: boolean }[];
    };
    const byName = new Map(tools.tools.map((tool) => [tool.name, tool]));
    expect(byName.get('gr_text')).toMatchObject({ valid: true, enabled: true });
    expect(byName.get('gr_off')).toMatchObject({ valid: true, enabled: false });
    expect(byName.get('gr_claims')).toMatchObject({
      valid: true,
      enabled: true,
    });
    expect(byName.get('gr_entity')).toMatchObject({
      valid: true,
      enabled: true,
    });

    for (const row of c1Rows()) {
      const reply = await validate(app, cookie, row.body);
      expect(issuesOf(reply), row.name).toEqual(sorted(row.issues));
    }
  }));

it('graph validation, C2: a save with a type-mismatched wire succeeds and lists an error for that wire', () =>
  withValidationApp(async (app, cookie, library) => {
    const created = await postJson(app, cookie, `${GRAPHS}/create`, {
      name: 'Chapter',
      view: 'recipe',
    });
    expect(created.status).toBe(201);
    expect(JSON.parse(created.body)).toEqual({ id: 'chapter' });

    const body = r0() as { nodes: { id: string; params?: unknown }[] };
    const in1 = body.nodes.find((node) => node.id === 'in1') as {
      params: { type: string };
    };
    in1.params.type = 'entity';
    const saved = await postJson(app, cookie, `${GRAPHS}/chapter/save`, body);
    expect(issuesOf(saved)).toEqual([
      expected('port-type-mismatch', { edgeId: 'w1', portId: 'n1.topic' }),
    ]);
    expect(
      readFileSync(join(library, 'book', 'graphs', 'chapter.json'), 'utf8'),
    ).toBe(text(body));
  }));

it('graph validation, C3: disabling a tool makes its nodes report disabled-tool', () =>
  withValidationApp(async (app, cookie) => {
    const rb = recipe(
      [
        clone(IN1),
        { ...clone(N1), id: 'n1' },
        { ...clone(N1), id: 'n2' },
        { ...clone(OUT1), id: 'out1' },
        { ...clone(OUT1), id: 'out2' },
      ],
      [
        { id: 'w1', from: 'in1.out', to: 'n1.topic' },
        { id: 'w3', from: 'in1.out', to: 'n2.topic' },
        { id: 'w2', from: 'n1.output', to: 'out1.in' },
        { id: 'w4', from: 'n2.output', to: 'out2.in' },
      ],
    );

    expect(issuesOf(await validate(app, cookie, rb))).toEqual([]);

    const off = await postJson(app, cookie, `${TOOLS}/gr_text/enabled`, {
      enabled: false,
    });
    expect(off.status).toBe(200);
    expect(issuesOf(await validate(app, cookie, rb))).toEqual(
      sorted([
        expected('disabled-tool', { nodeId: 'n1' }),
        expected('disabled-tool', { nodeId: 'n2' }),
      ]),
    );

    const on = await postJson(app, cookie, `${TOOLS}/gr_text/enabled`, {
      enabled: true,
    });
    expect(on.status).toBe(200);
    expect(issuesOf(await validate(app, cookie, rb))).toEqual([]);
  }));

it('graph validation, C4: the validate endpoint accepts an unsaved graph and writes nothing', () =>
  withValidationApp(async (app, cookie, library) => {
    const body = r0() as { nodes: { id: string; tool?: string }[] };
    const n1 = body.nodes.find((node) => node.id === 'n1');
    if (n1 !== undefined) n1.tool = 'gr_missing';

    const before = snapshotLibrary(library);
    const reply = await validate(app, cookie, body);
    expect(issuesOf(reply)).toEqual([
      expected('unknown-tool', { nodeId: 'n1' }),
    ]);
    expect(snapshotLibrary(library)).toEqual(before);

    const list = await get(app, cookie, GRAPHS);
    expect(list.status).toBe(200);
    expect(JSON.parse(list.body)).toEqual({ graphs: [] });
  }));
