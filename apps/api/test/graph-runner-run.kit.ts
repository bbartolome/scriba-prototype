import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { stringify } from 'yaml';
import { PROVIDER_DEFAULTS } from '@bbartolome/scriba-contracts/providers';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from './invariant-sweep';
import { putFile } from './project-store-files.kit';
import {
  buildProjectsLibrary,
  type ProjectsLibrary,
} from './project-store-projects.kit';
import { startMockOpenAI, type MockOpenAI } from './providers-client.kit';

// The helpers of graph-runner-run.test.ts. Each test builds its own mock scenario folder, its own library and its own
// app, and removes them all. The tool and graph helpers are local copies of graph-runner-validation.test.ts and
// graph-runner-graph-crud.test.ts, whose helpers are private to those files.

// The static root of graph-runner-graph-crud.test.ts (line 16): no web build is needed.
export const STATIC_ROOT = resolve(__dirname, 'fixtures/static');

// The scenario name of every run test. The mock's base URL is `<mock>/scenario/runs/v1`.
export const SCENARIO = 'runs';

// The steps of the `ok` scenario: every chat request gets the text `ok`.
export const OK_STEPS = [{ reply: { kind: 'stream', deltas: ['ok'] } }];

// The steps of the `slow-first` scenario: the first chat request waits `delayMs`, the rest get `ok`.
export function slowFirstSteps(delayMs: number): unknown[] {
  return [
    {
      match: { endpoint: 'chat', attempt: 1 },
      delayMs,
      reply: { kind: 'stream', deltas: ['ok'] },
    },
    { reply: { kind: 'stream', deltas: ['ok'] } },
  ];
}

// The text a file must hold: two-space JSON and a final newline.
export function text(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

// The user tool gr_text (GRR-03 section 4): one text port `topic`, one setting `words`, output `draft`, enabled.
export const GR_TEXT_YAML = [
  'schemaVersion: 1',
  'name: gr_text',
  'description: The gr_text tool.',
  'inputs:',
  '  type: object',
  '  properties:',
  '    topic:',
  '      type: string',
  '      title: Topic',
  '      x-scriba-type: text',
  '      x-scriba-port: true',
  '    words:',
  '      type: integer',
  '      minimum: 1',
  '      title: Words',
  '  required: [topic, words]',
  'output: draft',
  'enabled: true',
  'prompt: |',
  '  Write about {{topic}}.',
  '',
].join('\n');

// One open run harness: the mock, the library with `book` active, the app and a session cookie.
export interface RunHarness {
  app: TestApp;
  cookie: string;
  mock: MockOpenAI;
  library: string;
  close: () => Promise<void>;
}

// Opens a harness: the scenario folder, then the mock, then the library (with its settings and the tool), then the
// app. `prepare` writes the library's files before the app boots.
export async function openRunHarness(options: {
  steps: unknown[];
  prepare?: (library: string) => void;
}): Promise<RunHarness> {
  const scenariosDir = mkdtempSync(join(tmpdir(), 'scriba-grr04-scenarios-'));
  writeFileSync(
    join(scenariosDir, `${SCENARIO}.json`),
    JSON.stringify({ steps: options.steps }),
  );
  const mock = await startMockOpenAI({ scenariosDir });
  let fixture: ProjectsLibrary | undefined;
  let app: TestApp | undefined;
  const close = async (): Promise<void> => {
    try {
      await app?.close();
    } finally {
      await mock.close();
      rmSync(scenariosDir, { recursive: true, force: true });
      fixture?.remove();
    }
  };
  try {
    const settings = stringify({
      schemaVersion: 1,
      projects: { schemaVersion: 1, active: 'book' },
      providers: {
        schemaVersion: 1,
        list: [
          {
            id: 'mock',
            kind: 'openai-compatible',
            baseURL: `${mock.baseUrl}/scenario/${SCENARIO}/v1`,
            model: 'mock-model',
            ...PROVIDER_DEFAULTS,
          },
        ],
        appDefault: { providerId: 'mock', model: 'mock-model' },
      },
    });
    fixture = buildProjectsLibrary({ settings });
    const toolsFolder = join(
      fixture.library,
      '.scriba',
      'packs',
      'user',
      'tools',
    );
    mkdirSync(toolsFolder, { recursive: true });
    writeFileSync(join(toolsFolder, 'gr_text.yaml'), GR_TEXT_YAML);
    options.prepare?.(fixture.library);
    app = await createTestApp({
      libraryDir: fixture.library,
      staticRoot: STATIC_ROOT,
    });
    const cookie = await sessionCookie(app, fixture.library);
    return { app, cookie, mock, library: fixture.library, close };
  } catch (error) {
    await close();
    throw error;
  }
}

// Writes one graph file of the `book` project (P19).
export function putGraph(library: string, id: string, value: unknown): void {
  putFile(library, `book/graphs/${id}.json`, text(value));
}

// A recipe node: a tool node with the given params.
function toolNode(id: string, params: Record<string, unknown>): unknown {
  return {
    id,
    kind: 'tool',
    position: { x: 0, y: 0 },
    tool: 'gr_text',
    params,
  };
}

// The text input node `in1`, with a label.
function textInput(id: string): unknown {
  return {
    id,
    kind: 'input',
    position: { x: 0, y: 0 },
    params: { type: 'text', label: 'Topic' },
  };
}

// A recipe with a given name, nodes and wires.
function recipe(
  id: string,
  nodes: unknown[],
  edges: { id: string; from: string; to: string }[],
): { id: string; value: unknown } {
  return {
    id,
    value: {
      schemaVersion: 1,
      view: 'recipe',
      name: id,
      nodes,
      edges,
    },
  };
}

// The recipes of the run tests (P19, section 4 of the plan).
export const RECIPES = {
  // Three tools after one input: the topological order with ties by id is in1, n3, n1, n2.
  branch: recipe(
    'branch',
    [
      textInput('in1'),
      toolNode('n3', { words: 40 }),
      toolNode('n1', { words: 40 }),
      toolNode('n2', { words: 40 }),
    ],
    [
      { id: 'w1', from: 'in1.out', to: 'n3.topic' },
      { id: 'w2', from: 'n3.output', to: 'n1.topic' },
      { id: 'w3', from: 'n3.output', to: 'n2.topic' },
    ],
  ),
  // A straight line: in1, n1, n2, n3.
  chain: recipe(
    'chain',
    [
      textInput('in1'),
      toolNode('n1', { words: 40 }),
      toolNode('n2', { words: 40 }),
      toolNode('n3', { words: 40 }),
    ],
    [
      { id: 'w1', from: 'in1.out', to: 'n1.topic' },
      { id: 'w2', from: 'n1.output', to: 'n2.topic' },
      { id: 'w3', from: 'n2.output', to: 'n3.topic' },
    ],
  ),
  // One input feeding two tools.
  fan: recipe(
    'fan',
    [
      textInput('in1'),
      toolNode('n1', { words: 40 }),
      toolNode('n2', { words: 40 }),
    ],
    [
      { id: 'w1', from: 'in1.out', to: 'n1.topic' },
      { id: 'w2', from: 'in1.out', to: 'n2.topic' },
    ],
  ),
};

// The chain with a tool that is not in the registry: a blocking error.
export const BAD_RECIPE = recipe(
  'bad',
  [
    textInput('in1'),
    { ...(toolNode('n1', { words: 40 }) as object), tool: 'gr_missing' },
  ],
  [{ id: 'w1', from: 'in1.out', to: 'n1.topic' }],
);

// A story graph with no nodes: refused by the view.
export const STORY_GRAPH = {
  id: 'notes',
  value: {
    schemaVersion: 1,
    view: 'story',
    name: 'notes',
    nodes: [],
    edges: [],
  },
};

// Writes every graph of the run tests into the `book` project.
export function writeGraphs(library: string): void {
  for (const graph of [
    RECIPES.branch,
    RECIPES.chain,
    RECIPES.fan,
    BAD_RECIPE,
  ]) {
    putGraph(library, graph.id, graph.value);
  }
  putGraph(library, STORY_GRAPH.id, STORY_GRAPH.value);
}

// One POST of a JSON body, with the loopback Host, the origin and the session cookie.
export function postRun(
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

// One GET with the loopback Host and the session cookie.
export function getRun(
  app: TestApp,
  cookie: string,
  path: string,
): Promise<Reply> {
  return send(app.baseUrl, { host: LOOPBACK_HOST, cookie, path });
}
