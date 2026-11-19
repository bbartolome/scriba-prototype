import { getDebugNode } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { provideRouter, Router } from '@angular/router';
import {
  GRAPH_RUNNER_EXAMPLES,
  graphFileSchema,
} from '@bbartolome/scriba-contracts/graph-runner';
import { ACTIVE_PROJECT_ROUTE } from '@bbartolome/scriba-contracts/project-store';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { App } from '../../app';
import { APP_ROUTES } from '../../app.routes';
import {
  restoreMatchMedia,
  stubMatchMedia,
} from '../../shell/testing/match-media';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import {
  entitiesPath,
  graphPath,
  graphSavePath,
  graphValidatePath,
  projectFilesPath,
  RUN_CURRENT_PATH,
  TOOLS_PATH,
  toolPath,
} from './graph-runner-contract';

const WAIT = { timeout: 5000 };

// jsdom lacks the layout calls the library makes (A1). Each stub is added only where jsdom has none,
// and the ones added are removed after the suite.
const added: Array<[object, string]> = [];

function stubIfMissing(target: object, key: string, value: unknown): void {
  if (key in target) return;
  Object.defineProperty(target, key, {
    configurable: true,
    writable: true,
    value,
  });
  added.push([target, key]);
}

beforeAll(() => {
  class NoopResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  stubIfMissing(globalThis, 'ResizeObserver', NoopResizeObserver);
  stubIfMissing(SVGElement.prototype, 'getBBox', () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }));
  stubIfMissing(SVGSVGElement.prototype, 'createSVGPoint', () => {
    const point = {
      x: 0,
      y: 0,
      matrixTransform: () => point,
    };
    return point;
  });
  stubIfMissing(SVGElement.prototype, 'getScreenCTM', () => {
    const matrix = { inverse: () => matrix };
    return matrix;
  });
});

afterAll(() => {
  for (const [target, key] of added) {
    delete (target as Record<string, unknown>)[key];
  }
});

let doubles: ShellTestDoubles;

afterEach(() => {
  restoreMatchMedia();
});

/** Renders the App at `path` and waits until the lazy page has loaded. */
async function render(path: string, width = 1280, height = 800) {
  stubMatchMedia(width, height);
  TestBed.configureTestingModule({
    imports: [App],
    providers: [provideRouter(APP_ROUTES), ...doubles.providers],
  });
  await TestBed.compileComponents();
  const fixture = TestBed.createComponent(App);
  const router = TestBed.inject(Router);
  fixture.detectChanges();
  await router.navigateByUrl(path);
  const root = fixture.nativeElement as HTMLElement;
  return { fixture, router, root };
}

/** Runs `check` after each change detection, until it passes or the wait ends. */
async function until(
  fixture: { detectChanges(): void },
  check: () => void,
): Promise<void> {
  await vi.waitFor(() => {
    fixture.detectChanges();
    check();
  }, WAIT);
}

function buttonNamed(root: HTMLElement, label: string): HTMLButtonElement {
  const found = Array.from(root.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  );
  if (!found) throw new Error(`No ${label} button`);
  return found;
}

/** One row of the canned tool list. */
function toolRow(name: string, enabled = true, valid = true) {
  return {
    name,
    description: `The ${name} tool.`,
    output: 'draft',
    enabled,
    origin: 'nonfiction',
    valid,
    lintCounts: { errors: 0, warnings: 0 },
  };
}

/** One field of a canned form descriptor. */
function fieldOf(
  key: string,
  control: string,
  port: boolean,
  defaultValue: unknown = null,
  required = false,
) {
  return {
    key,
    title: key,
    description: '',
    control,
    required,
    default: defaultValue,
    list: false,
    port,
  };
}

/** The canned views of cold_open, as its spec gives them (the ports and the settings `length` and `tone`). */
const COLD_OPEN_VIEWS = {
  functionSchema: {
    type: 'function',
    function: {
      name: 'cold_open',
      description: 'Opens a chapter.',
      parameters: {},
    },
  },
  form: {
    fields: [
      fieldOf('coreIdea', 'text', true, null, true),
      fieldOf('entityIds', 'entity-picker', true),
      fieldOf('styleProfile', 'style-picker', true),
      {
        ...fieldOf('person', 'entity-picker', true, null, true),
        entityKinds: ['person'],
      },
      fieldOf('moment', 'text', true),
      fieldOf('length', 'number', false, 800),
      fieldOf('tone', 'text', false),
    ],
  },
  ports: {
    inputs: [
      {
        key: 'coreIdea',
        type: 'text',
        list: false,
        required: true,
        title: 'coreIdea',
      },
      {
        key: 'entityIds',
        type: 'entity',
        list: true,
        required: false,
        title: 'entityIds',
      },
      {
        key: 'styleProfile',
        type: 'style',
        list: false,
        required: false,
        title: 'styleProfile',
      },
      {
        key: 'person',
        type: 'entity',
        list: false,
        required: true,
        title: 'person',
      },
      {
        key: 'moment',
        type: 'text',
        list: false,
        required: false,
        title: 'moment',
      },
    ],
    output: { key: 'output', type: 'text', kind: 'draft' },
    params: ['length', 'tone'],
  },
};

/** The canned views of mystery_question, as its spec gives them. */
const MYSTERY_VIEWS = {
  functionSchema: {
    type: 'function',
    function: {
      name: 'mystery_question',
      description: 'Asks a question.',
      parameters: {},
    },
  },
  form: {
    fields: [
      fieldOf('coreIdea', 'text', true, null, true),
      fieldOf('entityIds', 'entity-picker', true),
      fieldOf('styleProfile', 'style-picker', true),
      fieldOf('puzzle', 'text', true),
      fieldOf('surprisingFinding', 'text', true),
      fieldOf('length', 'number', false, 800),
    ],
  },
  ports: {
    inputs: [
      {
        key: 'coreIdea',
        type: 'text',
        list: false,
        required: true,
        title: 'coreIdea',
      },
      {
        key: 'entityIds',
        type: 'entity',
        list: true,
        required: false,
        title: 'entityIds',
      },
      {
        key: 'styleProfile',
        type: 'style',
        list: false,
        required: false,
        title: 'styleProfile',
      },
      {
        key: 'puzzle',
        type: 'text',
        list: false,
        required: false,
        title: 'puzzle',
      },
      {
        key: 'surprisingFinding',
        type: 'text',
        list: false,
        required: false,
        title: 'surprisingFinding',
      },
    ],
    output: { key: 'output', type: 'text', kind: 'draft' },
    params: ['length'],
  },
};

/** The canned entity list of project p1: one entity of each kind the tests drop. */
const ENTITY_LIST = {
  entities: [
    { id: 'anna', type: 'person', path: 'entities/anna.md', title: 'Anna' },
    {
      id: 'claim-1',
      type: 'claim',
      path: 'entities/claim-1.md',
      title: 'A claim',
    },
    {
      id: 'house-style',
      type: 'style-profile',
      path: 'entities/house-style.md',
      title: 'House style',
    },
  ],
  invalid: [],
};

/** The canned tool list and the two details the examples use: cold_open and mystery_question. */
function respondTools(): void {
  doubles.api.respond('GET', entitiesPath('p1'), ENTITY_LIST);
  doubles.api.respond('GET', TOOLS_PATH, {
    tools: [
      toolRow('cold_open'),
      toolRow('mystery_question'),
      toolRow('old_tool', false),
    ],
  });
  for (const [name, views] of [
    ['cold_open', COLD_OPEN_VIEWS],
    ['mystery_question', MYSTERY_VIEWS],
  ] as const) {
    doubles.api.respond('GET', toolPath(name), {
      spec: null,
      source: '',
      origin: 'nonfiction',
      lint: [],
      views,
    });
  }
}

/** The POST bodies that reached one path, in order. */
function postsTo(path: string) {
  return doubles.api.requests.filter(
    (request) => request.method === 'POST' && request.path === path,
  );
}

// Criterion 1 (unit line 25): one test, with the criterion's text as its name. It runs the story and the
// recipe example in turn, each with a fresh set of fakes and a fresh TestBed.
const CASES = [
  { id: 'lighthouse-arrival', example: 'story' },
  { id: 'chapter-opening', example: 'recipe' },
] as const;

it("Loading the contract's example story graph and recipe and saving without edits produces byte-equivalent JSON (no library fields leak).", async () => {
  for (const { id, example } of CASES) {
    doubles = createShellTestDoubles();
    doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'p1' });

    const graph = GRAPH_RUNNER_EXAMPLES[example];
    // The expected text comes from the untouched export, computed before the render.
    const expected = `${JSON.stringify(graph, null, 2)}\n`;

    // The canned body is a copy: the page must not depend on the export's own object.
    doubles.api.respond('GET', graphPath(id), {
      graph: structuredClone(graph),
      issues: [],
    });
    doubles.api.respond('POST', graphSavePath(id), { issues: [] });
    respondTools();

    const { fixture, root } = await render(`/projects/p1/graphs/${id}`);
    await until(fixture, () => {
      expect(root.querySelector('h2')?.textContent?.trim()).toBe(graph.name);
    });

    buttonNamed(root, 'Save').click();
    await until(fixture, () => {
      expect(
        doubles.api.requests.filter((request) => request.method === 'POST'),
      ).toHaveLength(1);
    });

    const posts = doubles.api.requests.filter(
      (request) => request.method === 'POST',
    );
    expect(posts[0]?.path).toBe(graphSavePath(id));
    const body = posts[0]?.body;
    expect(JSON.stringify(body, null, 2) + '\n').toBe(expected);
    expect(graphFileSchema.safeParse(body).success).toBe(true);

    restoreMatchMedia();
    TestBed.resetTestingModule();
  }
});

// Criterion 26 (unit line 26), named as the criterion. The palette adds cold_open; its ports and its settings form
// draw on the node; a setting edit saves its key in `params`, and the untouched nodes keep their text.
it('Adding a tool from the palette renders its ports and settings form; editing settings updates `params`.', async () => {
  doubles = createShellTestDoubles();
  doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'p1' });
  const graph = {
    schemaVersion: 1,
    view: 'recipe',
    name: 'Tool palette',
    nodes: [
      {
        id: 'chapter-notes',
        kind: 'input',
        position: { x: 0, y: 0 },
        params: { type: 'text', label: 'Chapter notes' },
      },
      { id: 'draft', kind: 'output', position: { x: 480, y: 0 } },
    ],
    edges: [],
  };
  const untouched = structuredClone(graph.nodes);
  doubles.api.respond('GET', graphPath('tool-palette'), { graph, issues: [] });
  doubles.api.respond('POST', graphSavePath('tool-palette'), { issues: [] });
  doubles.api.respond('POST', graphValidatePath(), { issues: [] });
  respondTools();

  const { fixture, root } = await render('/projects/p1/graphs/tool-palette');
  await until(fixture, () => {
    expect(root.querySelector('h2')?.textContent?.trim()).toBe('Tool palette');
  });
  expect(root.querySelector('li[data-tool="old_tool"]')).toBeNull();

  (
    root.querySelector('li[data-tool="cold_open"] button') as HTMLButtonElement
  ).click();
  await until(fixture, () => {
    const node = root.querySelector('[data-node="tool-1"]');
    expect(root.querySelectorAll('[data-port^="tool-1."]')).toHaveLength(6);
    expect(node?.querySelector('[data-key="length"]')).not.toBeNull();
  });
  for (const key of [
    'coreIdea',
    'entityIds',
    'styleProfile',
    'person',
    'moment',
    'output',
  ]) {
    expect(root.querySelector(`[data-port="tool-1.${key}"]`)).not.toBeNull();
  }

  const input = root.querySelector(
    '[data-node="tool-1"] [data-key="length"] input',
  ) as HTMLInputElement;
  input.value = '500';
  input.dispatchEvent(new Event('input'));
  buttonNamed(root, 'Save').click();
  await until(fixture, () => {
    expect(postsTo(graphSavePath('tool-palette'))).toHaveLength(1);
  });

  const body = postsTo(graphSavePath('tool-palette'))[0]?.body as {
    nodes: unknown[];
  };
  expect(body.nodes).toEqual([
    ...untouched,
    {
      id: 'tool-1',
      kind: 'tool',
      tool: 'cold_open',
      position: { x: 120, y: 120 },
      params: { length: 500 },
    },
  ]);
  restoreMatchMedia();
  TestBed.resetTestingModule();
});

// Criterion 28 (unit line 28), named as the criterion. Validate answers with two errors and one warning: the
// concerned node, port and wire are highlighted, and Run is disabled with the two errors listed. A later answer
// with the warning only enables Run.
it('Issues from validate highlight the concerned element and disable Run with the reasons listed.', async () => {
  doubles = createShellTestDoubles();
  doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'p1' });
  const graph = {
    schemaVersion: 1,
    view: 'recipe',
    name: 'Live check',
    nodes: [
      {
        id: 'chapter-notes',
        kind: 'input',
        position: { x: 0, y: 0 },
        params: { type: 'text', label: 'Chapter notes' },
      },
      {
        id: 'cold-open',
        kind: 'tool',
        position: { x: 320, y: 0 },
        tool: 'cold_open',
      },
    ],
    edges: [{ id: 'w1', from: 'chapter-notes.out', to: 'cold-open.coreIdea' }],
  };
  const warning = {
    code: 'dead-step',
    severity: 'warning',
    nodeId: 'cold-open',
    message: 'Nothing uses this step.',
  };
  doubles.api.respond('GET', graphPath('live-check'), { graph, issues: [] });
  doubles.api.respond('POST', graphSavePath('live-check'), { issues: [] });
  doubles.api.respond('POST', graphValidatePath(), {
    issues: [
      {
        code: 'required-port-unfed',
        severity: 'error',
        nodeId: 'cold-open',
        portId: 'cold-open.person',
        message: 'Person is not fed.',
      },
      {
        code: 'port-type-mismatch',
        severity: 'error',
        edgeId: 'w1',
        portId: 'cold-open.coreIdea',
        message: 'Text does not fit the core idea.',
      },
      warning,
    ],
  });
  respondTools();

  const { fixture, root } = await render('/projects/p1/graphs/live-check');
  await until(fixture, () => {
    expect(root.querySelector('h2')?.textContent?.trim()).toBe('Live check');
    expect(root.querySelector('[data-run]')).not.toBeNull();
  });
  expect((root.querySelector('[data-run]') as HTMLButtonElement).disabled).toBe(
    false,
  );

  buttonNamed(root, 'Add').click();
  await until(fixture, () => {
    expect(
      root
        .querySelector('[data-node="cold-open"]')
        ?.classList.contains('issue'),
    ).toBe(true);
    expect(
      root
        .querySelector('[data-port="cold-open.person"]')
        ?.classList.contains('issue'),
    ).toBe(true);
    expect(root.querySelector('vflow')?.textContent).toContain(
      'port-type-mismatch',
    );
    expect(
      (root.querySelector('[data-run]') as HTMLButtonElement).disabled,
    ).toBe(true);
  });
  const reasons = root.querySelector('[data-run-reasons]')?.textContent ?? '';
  expect(reasons).toContain('Person is not fed.');
  expect(reasons).toContain('Text does not fit the core idea.');
  expect(reasons).not.toContain('Nothing uses this step.');

  // A later answer with the warning only: Run is enabled and the reasons are empty.
  doubles.api.respond('POST', graphValidatePath(), { issues: [warning] });
  buttonNamed(root, 'Add').click();
  await until(fixture, () => {
    expect(
      (root.querySelector('[data-run]') as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(root.querySelector('[data-run-reasons]')?.textContent?.trim()).toBe(
      '',
    );
  });
  restoreMatchMedia();
  TestBed.resetTestingModule();
});

/** One file entry of a canned file list. */
function fileOf(path: string) {
  return { path, kind: 'file', size: 1, mtime: '2026-11-14T09:00:00Z' };
}

/** One folder entry of a canned file list. */
function dirOf(path: string) {
  return { path, kind: 'dir', size: 0, mtime: '2026-11-14T09:00:00Z' };
}

/** The canned file list of project p1 (C-12). The params do not select an answer. */
function respondFiles(entries: readonly unknown[]): void {
  doubles.api.respond('GET', projectFilesPath('p1'), { entries });
}

/** The validate answer of a story test: no issues, so a change after an edit does not fail. */
function respondValidate(): void {
  doubles.api.respond('POST', graphValidatePath(), { issues: [] });
}

/** The current-run answer of a story test (C-12): no run. */
function respondNoRun(): void {
  doubles.api.respond('GET', RUN_CURRENT_PATH, { run: null });
}

/** Sets a control's value and fires the event the page listens to. */
function setValue(
  element: HTMLInputElement | HTMLSelectElement,
  value: string,
  event: 'input' | 'change',
): void {
  element.value = value;
  element.dispatchEvent(new Event(event));
}

/** Adds a node from the controls: its kind, its label, then Add. */
function addNode(root: HTMLElement, kind: string, label: string): void {
  setValue(
    root.querySelector('#new-kind') as HTMLSelectElement,
    kind,
    'change',
  );
  setValue(
    root.querySelector('#new-label') as HTMLInputElement,
    label,
    'input',
  );
  buttonNamed(root, 'Add').click();
}

/** The keys of each node and each edge of a saved file, in the order the file has them. */
function keysOf(body: unknown): { nodes: string[][]; edges: string[][] } {
  const file = body as {
    nodes: Record<string, unknown>[];
    edges: Record<string, unknown>[];
  };
  return {
    nodes: file.nodes.map((node) => Object.keys(node)),
    edges: file.edges.map((edge) => Object.keys(edge)),
  };
}

// Criterion 24 (unit line 24), named as the criterion. The story view adds a beat, a scene and an entity from the
// controls, shares a file with a picker, sets two relations (one from the vocabulary, one free text), and saves a
// file that parses against the contract with no recipe-only fields.
it('The story view creates scene, beat and entity nodes and labelled relations, and saves a file that parses against the contract with no recipe-only fields.', async () => {
  doubles = createShellTestDoubles();
  doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'p1' });
  const seed = {
    schemaVersion: 1,
    view: 'story',
    name: 'Story pickers',
    nodes: [
      {
        id: 'scene-1',
        kind: 'scene',
        label: 'Arrival',
        path: 'drafts/arrival.md',
        position: { x: 40, y: 40 },
      },
      {
        id: 'entity-1',
        kind: 'entity',
        label: 'Mara',
        position: { x: 360, y: 40 },
      },
    ],
    edges: [
      { id: 'e1', from: 'entity-1', to: 'scene-1' },
      { id: 'e2', from: 'scene-1', to: 'entity-1' },
    ],
  };
  doubles.api.respond('GET', graphPath('story-pickers'), {
    graph: structuredClone(seed),
    issues: [],
  });
  doubles.api.respond('POST', graphSavePath('story-pickers'), { issues: [] });
  respondFiles([
    dirOf('drafts'),
    fileOf('drafts/arrival.md'),
    fileOf('entities/mara.yaml'),
  ]);
  respondValidate();
  respondNoRun();
  respondTools();

  const { fixture, root } = await render('/projects/p1/graphs/story-pickers');
  await until(fixture, () => {
    expect(root.querySelector('h2')?.textContent?.trim()).toBe('Story pickers');
  });

  addNode(root, 'beat', 'Storm');
  addNode(root, 'scene', 'Dock');
  addNode(root, 'entity', 'Keeper');
  await until(fixture, () => {
    expect(root.querySelector('[data-node="entity-2"]')).not.toBeNull();
  });

  setValue(
    root.querySelector(
      '[data-story-node="beat-1"] select',
    ) as HTMLSelectElement,
    'drafts/arrival.md',
    'change',
  );
  setValue(
    root.querySelector('[data-story-edge="e1"] input') as HTMLInputElement,
    'causality',
    'change',
  );
  setValue(
    root.querySelector('[data-story-edge="e2"] input') as HTMLInputElement,
    'mentions',
    'change',
  );
  await until(fixture, () => {
    const text = root.querySelector('vflow')?.textContent ?? '';
    expect(text).toContain('causality');
    expect(text).toContain('mentions');
  });

  buttonNamed(root, 'Save').click();
  await until(fixture, () => {
    expect(postsTo(graphSavePath('story-pickers'))).toHaveLength(1);
  });

  const body = postsTo(graphSavePath('story-pickers'))[0]?.body as {
    nodes: { kind: string; label: string; path?: string }[];
    edges: { relation?: string }[];
  };
  expect(body.nodes.map((node) => node.kind)).toEqual([
    'scene',
    'entity',
    'beat',
    'scene',
    'entity',
  ]);
  expect(body.nodes.map((node) => node.label)).toEqual([
    'Arrival',
    'Mara',
    'Storm',
    'Dock',
    'Keeper',
  ]);
  expect(body.nodes[2]?.path).toBe('drafts/arrival.md');
  expect(body.nodes[0]?.path).toBe('drafts/arrival.md');
  expect(body.edges[0]?.relation).toBe('causality');
  expect(body.edges[1]?.relation).toBe('mentions');
  expect(graphFileSchema.safeParse(body).success).toBe(true);

  const allowedNode = ['id', 'kind', 'label', 'path', 'position'];
  const allowedEdge = ['id', 'from', 'to', 'relation'];
  for (const keys of keysOf(body).nodes) {
    expect(keys.every((key) => allowedNode.includes(key))).toBe(true);
  }
  for (const keys of keysOf(body).edges) {
    expect(keys.every((key) => allowedEdge.includes(key))).toBe(true);
  }
  restoreMatchMedia();
  TestBed.resetTestingModule();
});

// Criterion 25 (unit line 25), named as the criterion. A node whose file is missing shows the badge from the
// load's issues; Open file navigates to the files route with the path as its query.
it('A node pointing at a deleted file shows the warning badge; Open file navigates to the files route.', async () => {
  doubles = createShellTestDoubles();
  doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'p1' });
  doubles.api.respond('GET', graphPath('story-missing'), {
    graph: {
      schemaVersion: 1,
      view: 'story',
      name: 'Story missing',
      nodes: [
        {
          id: 'ch-1',
          kind: 'scene',
          label: 'Gone',
          path: 'drafts/gone.md',
          position: { x: 40, y: 40 },
        },
        {
          id: 'ch-2',
          kind: 'scene',
          label: 'Here',
          path: 'drafts/arrival.md',
          position: { x: 360, y: 40 },
        },
      ],
      edges: [],
    },
    issues: [
      {
        code: 'path-missing',
        severity: 'warning',
        message: 'A path does not point to a file in the project.',
        nodeId: 'ch-1',
      },
    ],
  });
  respondFiles([dirOf('drafts'), fileOf('drafts/arrival.md')]);
  respondNoRun();
  respondTools();

  const { fixture, router, root } = await render(
    '/projects/p1/graphs/story-missing',
  );
  await until(fixture, () => {
    expect(root.querySelector('h2')?.textContent?.trim()).toBe('Story missing');
    expect(
      root.querySelector('[data-node="ch-1"] [data-badge="path-missing"]'),
    ).not.toBeNull();
  });
  expect(root.querySelector('[data-node="ch-2"] [data-badge]')).toBeNull();
  expect(
    (root.querySelector('[data-story-node="ch-1"] select') as HTMLSelectElement)
      .value,
  ).toBe('drafts/gone.md');

  (
    root.querySelector(
      '[data-story-node="ch-1"] [data-open-file]',
    ) as HTMLButtonElement
  ).click();
  await until(fixture, () => {
    const tree = router.parseUrl(router.url);
    expect(
      tree.root.children['primary']?.segments.map((s) => s.path).join('/'),
    ).toBe('projects/p1/files');
    expect(tree.queryParams['path']).toBe('drafts/gone.md');
  });
  restoreMatchMedia();
  TestBed.resetTestingModule();
});

// Criterion 26 (unit line 26), named as the criterion. The story has no Run control; the recipe with the same
// controls has one, so the selectors and the text rule are shown to find it.
it('No Run control appears on a story graph.', async () => {
  const runLike = (root: HTMLElement) =>
    Array.from(root.querySelectorAll('button')).some((button) =>
      (button.textContent ?? '').trim().startsWith('Run'),
    );

  doubles = createShellTestDoubles();
  doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'p1' });
  doubles.api.respond('GET', graphPath('story-no-run'), {
    graph: {
      schemaVersion: 1,
      view: 'story',
      name: 'Story no run',
      nodes: [
        {
          id: 'scene-1',
          kind: 'scene',
          label: 'Arrival',
          position: { x: 40, y: 40 },
        },
      ],
      edges: [],
    },
    issues: [],
  });
  respondNoRun();
  respondTools();
  const story = await render('/projects/p1/graphs/story-no-run');
  await until(story.fixture, () => {
    expect(story.root.querySelector('h2')?.textContent?.trim()).toBe(
      'Story no run',
    );
  });
  expect(
    story.root.querySelector('[data-run], [data-run-to-here], [data-stop]'),
  ).toBeNull();
  expect(runLike(story.root)).toBe(false);
  restoreMatchMedia();
  TestBed.resetTestingModule();

  doubles = createShellTestDoubles();
  doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'p1' });
  doubles.api.respond('GET', graphPath('recipe-run'), {
    graph: {
      schemaVersion: 1,
      view: 'recipe',
      name: 'Recipe run',
      nodes: [
        {
          id: 'chapter-notes',
          kind: 'input',
          position: { x: 0, y: 0 },
          params: { type: 'text', label: 'Chapter notes' },
        },
        { id: 'draft', kind: 'output', position: { x: 480, y: 0 } },
      ],
      edges: [],
    },
    issues: [],
  });
  respondNoRun();
  respondTools();
  const recipe = await render('/projects/p1/graphs/recipe-run');
  await until(recipe.fixture, () => {
    expect(recipe.root.querySelector('h2')?.textContent?.trim()).toBe(
      'Recipe run',
    );
    expect(recipe.root.querySelector('[data-run]')).not.toBeNull();
  });
  expect(runLike(recipe.root)).toBe(true);
  restoreMatchMedia();
  TestBed.resetTestingModule();
});

// Criterion 27 (unit line 27), named as the criterion. Four overlapping story nodes: an order chain given against
// the file order, and one unlinked node. Arrange moves nodes only, makes no save, and the save holds only positions.
it('Arrange lays out overlapping nodes left to right without changing anything but `position`.', async () => {
  doubles = createShellTestDoubles();
  doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'p1' });
  const seed = {
    schemaVersion: 1,
    view: 'story',
    name: 'Story arrange',
    nodes: [
      { id: 'c', kind: 'beat', label: 'C', position: { x: 40, y: 40 } },
      { id: 'a', kind: 'scene', label: 'A', position: { x: 40, y: 40 } },
      { id: 'b', kind: 'scene', label: 'B', position: { x: 40, y: 40 } },
      { id: 'd', kind: 'entity', label: 'D', position: { x: 40, y: 40 } },
    ],
    edges: [
      { id: 'e1', from: 'a', to: 'b', relation: 'order' },
      { id: 'e2', from: 'b', to: 'c', relation: 'order' },
      { id: 'e3', from: 'd', to: 'a', relation: 'containment' },
    ],
  };
  doubles.api.respond('GET', graphPath('story-arrange'), {
    graph: structuredClone(seed),
    issues: [],
  });
  doubles.api.respond('POST', graphSavePath('story-arrange'), { issues: [] });
  respondFiles([]);
  respondValidate();
  respondNoRun();
  respondTools();

  const { fixture, root } = await render('/projects/p1/graphs/story-arrange');
  await until(fixture, () => {
    expect(root.querySelector('h2')?.textContent?.trim()).toBe('Story arrange');
  });

  (root.querySelector('[data-arrange]') as HTMLButtonElement).click();
  await new Promise((resolve) => setTimeout(resolve, 400));
  fixture.detectChanges();
  expect(postsTo(graphSavePath('story-arrange'))).toHaveLength(0);

  buttonNamed(root, 'Save').click();
  await until(fixture, () => {
    expect(postsTo(graphSavePath('story-arrange'))).toHaveLength(1);
  });

  const body = postsTo(graphSavePath('story-arrange'))[0]?.body as {
    nodes: { id: string; position: { x: number; y: number } }[];
  };
  const x = (id: string) =>
    body.nodes.find((node) => node.id === id)?.position.x ?? NaN;
  expect(x('a')).toBeLessThan(x('b'));
  expect(x('b')).toBeLessThan(x('c'));
  expect(x('c')).toBeLessThan(x('d'));
  expect(
    new Set(body.nodes.map((node) => `${node.position.x},${node.position.y}`))
      .size,
  ).toBe(4);

  const strip = (value: unknown) =>
    JSON.parse(
      JSON.stringify(value, (key, inner) =>
        key === 'position' ? undefined : inner,
      ),
    );
  expect(strip(body)).toEqual(strip(seed));
  expect(keysOf(body)).toEqual(keysOf(seed));
  expect(graphFileSchema.safeParse(body).success).toBe(true);
  restoreMatchMedia();
  TestBed.resetTestingModule();
});

/**
 * Drops a chip on a port by emitting its row's drop, as a real gesture emits it (C-9). jsdom has no layout, so the
 * pointer gesture itself is checked in a browser (T4).
 */
function dropOn(
  root: HTMLElement,
  portId: string,
  chip: { id: string; type: string },
  pointerOver = true,
): void {
  const row = root.querySelector(`[data-drop-port="${portId}"]`);
  if (!row) throw new Error(`No drop target ${portId}`);
  const list = getDebugNode(row)!.injector.get(CdkDropList);
  list.dropped.emit({
    item: { data: chip },
    isPointerOverContainer: pointerOver,
  } as unknown as CdkDragDrop<unknown>);
}

/** Clicks the remove button of the first pinned chip of a port, and runs change detection. */
function removeFirstOn(
  fixture: { detectChanges(): void },
  root: HTMLElement,
  portId: string,
): void {
  const button = root.querySelector(
    `[data-pinned="${portId}"] [data-remove]`,
  ) as HTMLButtonElement | null;
  if (!button) throw new Error(`No pinned chip on ${portId}`);
  button.click();
  fixture.detectChanges();
}

const ANNA = { id: 'anna', type: 'person' };
const CLAIM = { id: 'claim-1', type: 'claim' };
const HOUSE_STYLE = { id: 'house-style', type: 'style-profile' };

// Criterion 1 of GRR-12, named as the criterion. A text input and cold_open, with no wire: three
// drops pin a person, two entities and a style profile; a text-mode drop without the pointer over the container
// pins nothing. Save posts cold-open's params with the three references and nothing typed.
it('Dropping a matching chip pins it with no typing (saved `params` contain the reference).', async () => {
  doubles = createShellTestDoubles();
  doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'p1' });
  const graph = {
    schemaVersion: 1,
    view: 'recipe',
    name: 'Chips',
    nodes: [
      {
        id: 'chapter-notes',
        kind: 'input',
        position: { x: 40, y: 120 },
        params: { type: 'text', label: 'Chapter notes' },
      },
      {
        id: 'cold-open',
        kind: 'tool',
        tool: 'cold_open',
        position: { x: 400, y: 120 },
      },
    ],
    edges: [],
  };
  doubles.api.respond('GET', graphPath('chip-drop'), {
    graph: structuredClone(graph),
    issues: [],
  });
  doubles.api.respond('POST', graphSavePath('chip-drop'), { issues: [] });
  doubles.api.respond('POST', graphValidatePath(), { issues: [] });
  respondTools();

  const { fixture, root } = await render('/projects/p1/graphs/chip-drop');
  await until(fixture, () => {
    expect(
      Array.from(root.querySelectorAll('[data-group]')).map((group) =>
        group.getAttribute('data-group'),
      ),
    ).toEqual(['claim', 'person', 'style-profile']);
    expect(
      root.querySelector('[data-drop-port="cold-open.person"]'),
    ).not.toBeNull();
  });

  dropOn(root, 'cold-open.person', ANNA);
  dropOn(root, 'cold-open.entityIds', ANNA);
  dropOn(root, 'cold-open.entityIds', ANNA);
  dropOn(root, 'cold-open.styleProfile', HOUSE_STYLE);
  dropOn(root, 'cold-open.moment', ANNA, false);
  await until(fixture, () => {
    expect(
      root.querySelector('[data-pinned="cold-open.person"]')?.textContent,
    ).toContain('anna');
    expect(
      root.querySelectorAll('[data-pinned="cold-open.entityIds"]'),
    ).toHaveLength(1);
    expect(
      root.querySelector('[data-pinned="cold-open.styleProfile"]')?.textContent,
    ).toContain('house-style');
    expect(root.querySelector('[data-pinned="cold-open.moment"]')).toBeNull();
    expect(root.querySelector('[data-drop-reason]')?.textContent?.trim()).toBe(
      '',
    );
  });

  buttonNamed(root, 'Save').click();
  await until(fixture, () => {
    expect(postsTo(graphSavePath('chip-drop'))).toHaveLength(1);
  });
  const body = postsTo(graphSavePath('chip-drop'))[0]?.body;
  expect(body).toEqual({
    ...graph,
    nodes: [
      graph.nodes[0],
      {
        id: 'cold-open',
        kind: 'tool',
        tool: 'cold_open',
        position: { x: 400, y: 120 },
        params: {
          person: 'anna',
          entityIds: ['anna'],
          styleProfile: 'house-style',
        },
      },
    ],
  });
  restoreMatchMedia();
  TestBed.resetTestingModule();
});

// Criterion 2 of GRR-12, named as the criterion. A text port, a port filtered to person, and a wired
// port each refuse a drop with its reason, and one refused drop after another leaves the file unchanged.
it('Dropping on a text port, a port filtered to another kind, or a wired port is refused with a reason and the file is unchanged.', async () => {
  doubles = createShellTestDoubles();
  doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'p1' });
  const graph = {
    schemaVersion: 1,
    view: 'recipe',
    name: 'Refusals',
    nodes: [
      {
        id: 'chapter-notes',
        kind: 'input',
        position: { x: 40, y: 120 },
        params: { type: 'text', label: 'Chapter notes' },
      },
      {
        id: 'people',
        kind: 'input',
        position: { x: 40, y: 300 },
        params: { type: 'entity', label: 'People', entityKind: 'person' },
      },
      {
        id: 'cold-open',
        kind: 'tool',
        tool: 'cold_open',
        position: { x: 400, y: 120 },
      },
    ],
    edges: [{ id: 'w1', from: 'people.out', to: 'cold-open.entityIds' }],
  };
  doubles.api.respond('GET', graphPath('refusals'), {
    graph: structuredClone(graph),
    issues: [],
  });
  doubles.api.respond('POST', graphSavePath('refusals'), { issues: [] });
  doubles.api.respond('POST', graphValidatePath(), { issues: [] });
  respondTools();

  const { fixture, root } = await render('/projects/p1/graphs/refusals');
  await until(fixture, () => {
    expect(
      root.querySelector('[data-drop-port="cold-open.person"]'),
    ).not.toBeNull();
  });

  const refusals: Array<[string, { id: string; type: string }, string]> = [
    ['cold-open.coreIdea', ANNA, 'Text ports take no entities.'],
    ['cold-open.person', CLAIM, 'This port takes person entities.'],
    ['cold-open.entityIds', ANNA, 'This port is already wired.'],
    ['cold-open.styleProfile', ANNA, 'Style ports take style profiles.'],
  ];
  for (const [portId, chip, reason] of refusals) {
    dropOn(root, portId, chip);
    await until(fixture, () => {
      expect(
        root.querySelector('[data-drop-reason]')?.textContent?.trim(),
      ).toBe(reason);
      expect(root.querySelector('[data-pinned]')).toBeNull();
    });
  }

  buttonNamed(root, 'Save').click();
  await until(fixture, () => {
    expect(postsTo(graphSavePath('refusals'))).toHaveLength(1);
  });
  expect(postsTo(graphSavePath('refusals'))[0]?.body).toEqual(graph);
  restoreMatchMedia();
  TestBed.resetTestingModule();
});

// Criterion 3 of GRR-12, named as the criterion. (a) A list chip and a scalar chip are removed and
// the saved params keep the other keys; the list key goes with its last item. (b) A node whose only param is the
// removed chip has no params key after the save.
it('Removing a pinned chip clears it from `params`.', async () => {
  doubles = createShellTestDoubles();
  doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'p1' });
  const graph = {
    schemaVersion: 1,
    view: 'recipe',
    name: 'Removals',
    nodes: [
      {
        id: 'cold-open',
        kind: 'tool',
        tool: 'cold_open',
        position: { x: 400, y: 120 },
        params: {
          person: 'anna',
          entityIds: ['anna', 'claim-1'],
          length: 500,
        },
      },
    ],
    edges: [],
  };
  doubles.api.respond('GET', graphPath('removals'), {
    graph: structuredClone(graph),
    issues: [],
  });
  doubles.api.respond('POST', graphSavePath('removals'), { issues: [] });
  doubles.api.respond('POST', graphValidatePath(), { issues: [] });
  respondTools();

  const first = await render('/projects/p1/graphs/removals');
  await until(first.fixture, () => {
    expect(
      first.root.querySelector(
        '[data-pinned="cold-open.person"] [data-remove]',
      ),
    ).not.toBeNull();
  });
  removeFirstOn(first.fixture, first.root, 'cold-open.person');
  buttonNamed(first.root, 'Save').click();
  await until(first.fixture, () => {
    expect(postsTo(graphSavePath('removals'))).toHaveLength(1);
  });
  expect(
    (postsTo(graphSavePath('removals'))[0]?.body as { nodes: unknown[] }).nodes,
  ).toEqual([
    {
      ...graph.nodes[0],
      params: { entityIds: ['anna', 'claim-1'], length: 500 },
    },
  ]);

  removeFirstOn(first.fixture, first.root, 'cold-open.entityIds');
  removeFirstOn(first.fixture, first.root, 'cold-open.entityIds');
  buttonNamed(first.root, 'Save').click();
  await until(first.fixture, () => {
    expect(postsTo(graphSavePath('removals'))).toHaveLength(2);
  });
  expect(
    (postsTo(graphSavePath('removals'))[1]?.body as { nodes: unknown[] }).nodes,
  ).toEqual([{ ...graph.nodes[0], params: { length: 500 } }]);
  restoreMatchMedia();
  TestBed.resetTestingModule();

  // (b) The only param is the removed chip: the save has no params key.
  doubles = createShellTestDoubles();
  doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'p1' });
  const single = {
    schemaVersion: 1,
    view: 'recipe',
    name: 'Single',
    nodes: [
      {
        id: 'cold-open',
        kind: 'tool',
        tool: 'cold_open',
        position: { x: 400, y: 120 },
        params: { person: 'anna' },
      },
    ],
    edges: [],
  };
  doubles.api.respond('GET', graphPath('single'), {
    graph: structuredClone(single),
    issues: [],
  });
  doubles.api.respond('POST', graphSavePath('single'), { issues: [] });
  doubles.api.respond('POST', graphValidatePath(), { issues: [] });
  respondTools();

  const second = await render('/projects/p1/graphs/single');
  await until(second.fixture, () => {
    expect(
      second.root.querySelector(
        '[data-pinned="cold-open.person"] [data-remove]',
      ),
    ).not.toBeNull();
  });
  removeFirstOn(second.fixture, second.root, 'cold-open.person');
  buttonNamed(second.root, 'Save').click();
  await until(second.fixture, () => {
    expect(postsTo(graphSavePath('single'))).toHaveLength(1);
  });
  const node = (
    postsTo(graphSavePath('single'))[0]?.body as {
      nodes: Array<Record<string, unknown>>;
    }
  ).nodes[0];
  expect(node).toEqual({
    id: 'cold-open',
    kind: 'tool',
    tool: 'cold_open',
    position: { x: 400, y: 120 },
  });
  expect(Object.hasOwn(node ?? {}, 'params')).toBe(false);
  restoreMatchMedia();
  TestBed.resetTestingModule();
});
