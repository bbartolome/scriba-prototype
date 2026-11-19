import { getDebugNode } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { provideRouter, Router } from '@angular/router';
import {
  GRAPH_RUNNER_EXAMPLES,
  graphFileSchema,
} from '@bbartolome/scriba-contracts/graph-runner';
import {
  ACTIVE_PROJECT_ROUTE,
  PROJECT_ENTITIES_ROUTE,
  PROJECT_FILE_ROUTE,
} from '@bbartolome/scriba-contracts/project-store';
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
import type { ApiPath } from '../../shell';
import {
  entitiesPath,
  graphPath,
  graphSavePath,
  graphValidatePath,
  projectFilesPath,
  RUN_CURRENT_PATH,
  RUN_STOP_PATH,
  RUNS_PATH,
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

// Criteria 25 to 28 (unit lines 25 to 28): the run controls, the input-values dialog, the badges and the results of
// a run. The fixture `dialog-run` has the input `chapter-notes` (text), `people` (entity, `person`), `look` (style),
// the tool `cold-open` (cold_open) and the outputs `draft` (path set) and `spare` (no path).
const DIALOG_GRAPH = {
  schemaVersion: 1,
  view: 'recipe',
  name: 'Dialog run',
  nodes: [
    {
      id: 'chapter-notes',
      kind: 'input',
      position: { x: 0, y: 0 },
      params: { type: 'text', label: 'Chapter notes' },
    },
    {
      id: 'people',
      kind: 'input',
      position: { x: 0, y: 120 },
      params: { type: 'entity', label: 'People', entityKind: 'person' },
    },
    {
      id: 'look',
      kind: 'input',
      position: { x: 0, y: 240 },
      params: { type: 'style', label: 'Look' },
    },
    {
      id: 'cold-open',
      kind: 'tool',
      position: { x: 320, y: 0 },
      tool: 'cold_open',
    },
    {
      id: 'draft',
      kind: 'output',
      position: { x: 640, y: 0 },
      params: { path: 'drafts/ch02-opening.md' },
    },
    { id: 'spare', kind: 'output', position: { x: 640, y: 160 } },
  ],
  edges: [
    { id: 'w1', from: 'chapter-notes.out', to: 'cold-open.coreIdea' },
    { id: 'w2', from: 'people.out', to: 'cold-open.person' },
    { id: 'w3', from: 'look.out', to: 'cold-open.styleProfile' },
    { id: 'w4', from: 'cold-open.output', to: 'draft.in' },
    { id: 'w5', from: 'cold-open.output', to: 'spare.in' },
  ],
};

const HASH = `sha256:${'0'.repeat(64)}`;
const MTIME = '2026-11-14T09:00:00Z';

/** A path of the project-store routes, with the project id in place. */
function projectRoute(template: string, projectId: string): ApiPath {
  return template.replace(':projectId', projectId) as ApiPath;
}

/** The current run as the GET answers it. */
function runOf(
  nodes: Record<string, unknown>,
  status = 'running',
): Record<string, unknown> {
  return {
    runId: 'run-1',
    graphId: 'dialog-run',
    status,
    startedAt: MTIME,
    inputs: {},
    targets: {},
    nodes,
    pendingChangeIds: [],
  };
}

/** The canned reads of the dialog and its pickers: the project, its entities, project.yaml and the file list. */
function respondProject(): void {
  doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'p1' });
  doubles.api.respond('GET', projectRoute(PROJECT_ENTITIES_ROUTE, 'p1'), {
    entities: [
      { id: 'anna', type: 'person', path: 'people/anna.md', title: 'Anna' },
      { id: 'claim-1', type: 'claim', path: 'claims/claim-1.md' },
      {
        id: 'house-style',
        type: 'style-profile',
        path: 'style/house-style.md',
      },
    ],
    invalid: [],
  });
  doubles.api.respond('GET', projectRoute(PROJECT_FILE_ROUTE, 'p1'), {
    path: 'project.yaml',
    content: 'name: Demo\nstyleProfile: house-style\n',
    hash: HASH,
    mtime: MTIME,
  });
  doubles.api.respond('GET', projectFilesPath('p1'), {
    entries: [
      { path: 'drafts', kind: 'dir', size: 0, mtime: MTIME },
      { path: 'drafts/ch01.md', kind: 'file', size: 12, mtime: MTIME },
    ],
  });
}

/** The canned reads of the dialog-run fixture: the graph, the tools, the project and the current run. */
function respondDialogRun(run: unknown): void {
  doubles.api.respond('GET', graphPath('dialog-run'), {
    graph: structuredClone(DIALOG_GRAPH),
    issues: [],
  });
  doubles.api.respond('POST', graphValidatePath(), { issues: [] });
  doubles.api.respond('GET', RUN_CURRENT_PATH, { run });
  respondTools();
  respondProject();
}

/** The field ids the dialog shows, in order. */
function fieldIds(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('[data-run-field]')).map(
    (field) => field.getAttribute('data-run-field') ?? '',
  );
}

/** The controls that must be disabled while a run is active (criterion 3). */
function lockableButtons(root: HTMLElement): HTMLButtonElement[] {
  return [
    ...Array.from(
      root.querySelectorAll<HTMLButtonElement>(
        'ul.palette button, [data-run-to-here], [data-run]',
      ),
    ),
    buttonNamed(root, 'Add'),
    buttonNamed(root, 'Delete selected'),
    buttonNamed(root, 'Save'),
  ];
}

it('Dialog tests (fakes): scope-aware fields for whole runs and Run to here, style default, target paths.', async () => {
  doubles = createShellTestDoubles();
  respondDialogRun(null);
  doubles.api.respond('POST', RUNS_PATH, { runId: 'run-1' });

  const { fixture, root } = await render('/projects/p1/graphs/dialog-run');
  await until(fixture, () => {
    expect(root.querySelector('h2')?.textContent?.trim()).toBe('Dialog run');
  });

  // (a) A whole run: every input and output node, the target paths, the picker's kinds and the style default.
  buttonNamed(root, 'Run').click();
  await until(fixture, () => {
    expect(fieldIds(root)).toEqual([
      'chapter-notes',
      'people',
      'look',
      'draft',
      'spare',
    ]);
  });
  expect(
    (
      root.querySelector(
        '[data-run-field="draft"] input[data-target]',
      ) as HTMLInputElement
    ).value,
  ).toBe('drafts/ch02-opening.md');
  expect(
    (
      root.querySelector(
        '[data-run-field="spare"] input[data-target]',
      ) as HTMLInputElement
    ).value,
  ).toBe('');
  expect(
    root.querySelector('[data-run-field="spare"] [data-target-hint]'),
  ).not.toBeNull();

  const addPeople = root.querySelector(
    '[data-run-field="people"] select',
  ) as HTMLSelectElement;
  const look = root.querySelector(
    '[data-run-field="look"] select',
  ) as HTMLSelectElement;
  await until(fixture, () => {
    const offered = Array.from(addPeople.options).map((option) => option.value);
    expect(offered).toContain('anna');
    expect(offered).not.toContain('claim-1');
    expect(offered).not.toContain('house-style');
    expect(look.value).toBe('house-style');
  });
  const datalist = Array.from(
    root.querySelectorAll<HTMLOptionElement>('datalist option'),
  ).map((option) => option.value);
  expect(datalist).toContain('drafts/ch01.md');
  expect(datalist).not.toContain('drafts');

  const notes = root.querySelector(
    '[data-run-field="chapter-notes"] textarea',
  ) as HTMLTextAreaElement;
  notes.value = 'Notes';
  notes.dispatchEvent(new Event('input'));
  addPeople.value = 'anna';
  addPeople.dispatchEvent(new Event('change'));
  buttonNamed(root, 'Start').click();
  await until(fixture, () => {
    expect(postsTo(RUNS_PATH)).toHaveLength(1);
  });
  const whole = postsTo(RUNS_PATH)[0]?.body as Record<string, unknown>;
  expect(whole).toEqual({
    graphId: 'dialog-run',
    inputs: {
      'chapter-notes': { kind: 'text', text: 'Notes' },
      people: { kind: 'entities', refs: ['anna'] },
      look: { kind: 'style', ref: 'house-style' },
    },
    targets: { draft: 'drafts/ch02-opening.md' },
  });
  expect(whole).not.toHaveProperty('target');

  // (b) Run to here on cold-open: its target and its upstream only, and a target and no targets key.
  (
    root.querySelector(
      '[data-node="cold-open"] [data-run-to-here]',
    ) as HTMLButtonElement
  ).click();
  await until(fixture, () => {
    expect(fieldIds(root)).toEqual(['chapter-notes', 'people', 'look']);
    expect(
      (
        root.querySelector(
          '[data-run-field="look"] select',
        ) as HTMLSelectElement
      ).value,
    ).toBe('house-style');
  });
  buttonNamed(root, 'Start').click();
  await until(fixture, () => {
    expect(postsTo(RUNS_PATH)).toHaveLength(2);
  });
  const toHere = postsTo(RUNS_PATH)[1]?.body as Record<string, unknown>;
  expect(toHere).toMatchObject({
    graphId: 'dialog-run',
    target: { nodeId: 'cold-open' },
    inputs: {
      'chapter-notes': { kind: 'text', text: '' },
      people: { kind: 'entities', refs: [] },
      look: { kind: 'style', ref: 'house-style' },
    },
  });
  expect(toHere).not.toHaveProperty('targets');

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

// Supporting check S1 (GRR-12 plan section 6, revision 3; D14, C-4, A9). The placeholder CDK appends into an
// entered row is hidden by the page's CSS, and a chip clone elsewhere is not. The precondition shows that jsdom
// applies this component's styles at all; if it fails, S1 moves to the e2e file (the plan's fallback).
it('S1: the drop placeholder is hidden inside a port row and a chip in the side list is not.', async () => {
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
  doubles.api.respond('GET', graphPath('placeholder'), {
    graph: structuredClone(graph),
    issues: [],
  });
  doubles.api.respond('POST', graphValidatePath(), { issues: [] });
  respondTools();

  const { fixture, root } = await render('/projects/p1/graphs/placeholder');
  await until(fixture, () => {
    expect(
      root.querySelector('[data-drop-port="cold-open.person"]'),
    ).not.toBeNull();
  });

  const reason = root.querySelector('[data-drop-reason]') as HTMLElement;
  // getComputedStyle resolves em to px: 1.4em at jsdom's 16px root size is 22.4px. A value of 22.4px shows the
  // component's styles are applied (plan deviation, recorded in the report).
  expect(getComputedStyle(reason).minHeight).toBe('22.4px');

  const chip = root.querySelector('[data-entity="anna"]') as HTMLElement;
  const row = root.querySelector(
    '[data-drop-port="cold-open.person"]',
  ) as HTMLElement;
  // What CDK appends into an entered row: a clone of the chip with the placeholder class (CDK lines 1166 to 1179).
  const placeholder = chip.cloneNode(true) as HTMLElement;
  placeholder.classList.add('cdk-drag-placeholder');
  row.appendChild(placeholder);
  expect(getComputedStyle(placeholder).display).toBe('none');

  // Control: the same clone beside the chip, in its own side-list slot, is not hidden.
  const control = chip.cloneNode(true) as HTMLElement;
  control.classList.add('cdk-drag-placeholder');
  chip.parentElement?.appendChild(control);
  expect(getComputedStyle(control).display).not.toBe('none');
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

it('Badges follow fake `node-status` events and show the correct state after a reload mid-run (reconcile).', async () => {
  doubles = createShellTestDoubles();
  respondDialogRun(
    runOf({
      'chapter-notes': { status: 'done' },
      'cold-open': { status: 'running' },
      draft: { status: 'queued' },
    }),
  );

  const first = await render('/projects/p1/graphs/dialog-run');
  await until(first.fixture, () => {
    expect(
      first.root.querySelector(
        '[data-node="chapter-notes"] [data-status="done"]',
      ),
    ).not.toBeNull();
    expect(
      first.root.querySelector(
        '[data-node="cold-open"] [data-status="running"]',
      ),
    ).not.toBeNull();
    expect(
      first.root.querySelector('[data-node="draft"] [data-status="queued"]'),
    ).not.toBeNull();
  });

  // (b) A pushed node-status: the badge, the result text and the cited ids.
  doubles.events.push({
    module: 'graph-runner',
    type: 'node-status',
    data: {
      runId: 'run-1',
      nodeId: 'cold-open',
      status: 'done',
      result: {
        output: { kind: 'draft', content: 'Opening text' },
        sourcesUsed: ['anna'],
      },
    },
  });
  await until(first.fixture, () => {
    expect(
      first.root.querySelector('[data-node="cold-open"] [data-status="done"]'),
    ).not.toBeNull();
    expect(first.root.querySelector('[data-result-text]')?.textContent).toBe(
      'Opening text',
    );
    expect(first.root.querySelector('[data-sources]')?.textContent).toContain(
      'anna',
    );
  });

  // (c) A pushed error: the badge and the message.
  doubles.events.push({
    module: 'graph-runner',
    type: 'node-status',
    data: {
      runId: 'run-1',
      nodeId: 'draft',
      status: 'error',
      error: {
        code: 'PLATFORM_INTERNAL',
        message: 'The model did not answer.',
      },
    },
  });
  await until(first.fixture, () => {
    expect(
      first.root.querySelector('[data-node="draft"] [data-status="error"]'),
    ).not.toBeNull();
    expect(first.root.querySelector('[data-node-error]')?.textContent).toBe(
      'The model did not answer.',
    );
  });

  // (d) A fresh render mid-run: the current run gives cold-open done and draft running.
  restoreMatchMedia();
  TestBed.resetTestingModule();
  doubles = createShellTestDoubles();
  respondDialogRun(
    runOf({
      'chapter-notes': { status: 'done' },
      'cold-open': {
        status: 'done',
        result: {
          output: { kind: 'draft', content: 'Opening text' },
          sourcesUsed: ['anna'],
        },
      },
      draft: { status: 'running' },
    }),
  );
  const reloaded = await render('/projects/p1/graphs/dialog-run');
  await until(reloaded.fixture, () => {
    expect(
      reloaded.root.querySelector(
        '[data-node="cold-open"] [data-status="done"]',
      ),
    ).not.toBeNull();
    expect(
      reloaded.root.querySelector(
        '[data-node="draft"] [data-status="running"]',
      ),
    ).not.toBeNull();
  });

  // (e) Reconcile: the current run answers draft done, then the stream reopens.
  doubles.api.respond('GET', RUN_CURRENT_PATH, {
    run: runOf({
      'chapter-notes': { status: 'done' },
      'cold-open': { status: 'done' },
      draft: { status: 'done' },
    }),
  });
  doubles.events.reopen();
  await until(reloaded.fixture, () => {
    expect(
      reloaded.root.querySelector('[data-node="draft"] [data-status="done"]'),
    ).not.toBeNull();
  });
  restoreMatchMedia();
  TestBed.resetTestingModule();
});

it('Stop posts and the canvas returns to editable after `run-ended`.', async () => {
  doubles = createShellTestDoubles();
  respondDialogRun(
    runOf({
      'chapter-notes': { status: 'done' },
      'cold-open': { status: 'running' },
    }),
  );
  doubles.api.respond('POST', RUN_STOP_PATH, {});

  const { fixture, root } = await render('/projects/p1/graphs/dialog-run');
  await until(fixture, () => {
    expect(root.querySelector('[data-stop]')).not.toBeNull();
    expect(root.querySelector('[data-run-status]')?.textContent?.trim()).toBe(
      'Running',
    );
  });
  // (a) While running: every control is disabled and the node's form is in a disabled fieldset.
  for (const button of lockableButtons(root)) {
    expect(button.disabled).toBe(true);
  }
  expect(
    root
      .querySelector('[data-node="cold-open"] fieldset')
      ?.hasAttribute('disabled'),
  ).toBe(true);

  // (b) Stop posts the run id; the page waits for the event.
  (root.querySelector('[data-stop]') as HTMLButtonElement).click();
  await until(fixture, () => {
    expect(postsTo(RUN_STOP_PATH)).toHaveLength(1);
  });
  expect(postsTo(RUN_STOP_PATH)[0]?.body).toEqual({ runId: 'run-1' });
  for (const button of lockableButtons(root)) {
    expect(button.disabled).toBe(true);
  }

  // (c) The run ends: the stop control goes, the status shows the reason, and the canvas is editable again.
  doubles.api.respond('GET', RUN_CURRENT_PATH, {
    run: runOf(
      {
        'chapter-notes': { status: 'done' },
        'cold-open': { status: 'stopped' },
      },
      'stopped',
    ),
  });
  doubles.events.push({
    module: 'graph-runner',
    type: 'run-ended',
    data: { runId: 'run-1', status: 'stopped', reason: 'author' },
  });
  await until(fixture, () => {
    expect(root.querySelector('[data-stop]')).toBeNull();
    const status = root.querySelector('[data-run-status]')?.textContent ?? '';
    expect(status).toContain('Stopped');
    expect(status).toContain('author');
    for (const button of lockableButtons(root)) {
      expect(button.disabled).toBe(false);
    }
    expect(root.querySelector('fieldset[disabled]')).toBeNull();
  });
  restoreMatchMedia();
  TestBed.resetTestingModule();
});

it('Output nodes show their pending-change link.', async () => {
  doubles = createShellTestDoubles();
  respondDialogRun(
    runOf(
      {
        'chapter-notes': { status: 'done' },
        'cold-open': {
          status: 'done',
          result: {
            output: { kind: 'draft', content: 'Opening text' },
            sourcesUsed: ['anna'],
          },
        },
        draft: {
          status: 'done',
          result: {
            pendingChangeId: 'pc-1',
            path: 'drafts/ch02-opening.md',
          },
        },
      },
      'done',
    ),
  );

  const { fixture, root } = await render('/projects/p1/graphs/dialog-run');
  await until(fixture, () => {
    expect(
      root.querySelector('[data-node="draft"] a[data-review-link]'),
    ).not.toBeNull();
  });
  expect(
    root
      .querySelector('[data-node="draft"] a[data-review-link]')
      ?.getAttribute('href'),
  ).toBe('/projects/p1/review?run=run-1');
  expect(
    root.querySelector('[data-node="cold-open"] a[data-review-link]'),
  ).toBeNull();
  restoreMatchMedia();
  TestBed.resetTestingModule();
});
