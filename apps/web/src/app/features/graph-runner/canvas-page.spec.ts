import { TestBed } from '@angular/core/testing';
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
  graphPath,
  graphSavePath,
  graphValidatePath,
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
      fieldOf('person', 'entity-picker', true, null, true),
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

/** The canned tool list and the two details the examples use: cold_open and mystery_question. */
function respondTools(): void {
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
