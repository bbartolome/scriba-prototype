import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ACTIVE_PROJECT_ROUTE } from '@bbartolome/scriba-contracts/project-store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  GRAPHS_PATH,
  GRAPH_CREATE_PATH,
  RUN_CURRENT_PATH,
} from './graph-runner-contract';

const WAIT = { timeout: 5000 };
const GRAPH_RUNNER = 'graph-runner';
const RENAME = '/api/graph-runner/graphs/chapter-opening/rename';
const DELETE_STORY = '/api/graph-runner/graphs/story-one/delete';
const PENDING = '/api/project-store/projects/p1/pending';

const GRAPHS = {
  graphs: [
    {
      id: 'chapter-opening',
      name: 'Chapter opening',
      view: 'recipe',
      nodeCount: 3,
      mtime: '2026-11-14T09:00:00Z',
      valid: true,
    },
    {
      id: 'story-one',
      name: 'Story one',
      view: 'story',
      nodeCount: 2,
      mtime: '2026-11-14T09:00:00Z',
      valid: true,
    },
    {
      id: 'broken',
      name: 'broken',
      view: null,
      nodeCount: null,
      mtime: '2026-11-14T09:00:00Z',
      valid: false,
    },
  ],
};

const CHANGE = {
  id: '20261114T090000000Z-abc123',
  projectId: 'p1',
  targetPath: 'graphs/chapter-opening.json',
  kind: 'modify',
  diff: '@@ -1 +1 @@\n-Old\n+New\n',
  capturedBase: null,
  proposed: 'New',
  origin: { kind: 'agent-run', runId: 'r1' },
  status: 'pending',
  conflict: null,
  createdAt: '2026-11-14T09:00:00Z',
  updatedAt: '2026-11-14T09:00:00Z',
};

const RUN = {
  run: {
    runId: 'run-1',
    graphId: 'chapter-opening',
    status: 'running',
    startedAt: '2026-11-14T09:00:00Z',
    inputs: {},
    targets: {},
    nodes: {},
    pendingChangeIds: [],
  },
};

let doubles: ShellTestDoubles;

beforeEach(() => {
  doubles = createShellTestDoubles();
  doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'p1' });
  doubles.api.respond('GET', GRAPHS_PATH, GRAPHS);
  doubles.api.respond('GET', RUN_CURRENT_PATH, RUN);
  doubles.api.respond('GET', PENDING, { changes: [CHANGE] });
});

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

/** The list row of one graph, found by its link to the graph's canvas URL. */
function rowOf(root: HTMLElement, id: string): HTMLElement {
  const link = root.querySelector(`a[href="/projects/p1/graphs/${id}"]`);
  const row = link?.closest('li');
  if (!row) throw new Error(`No row for ${id}`);
  return row as HTMLElement;
}

function buttonIn(row: HTMLElement, label: string): HTMLButtonElement {
  const found = Array.from(row.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  );
  if (!found) throw new Error(`No ${label} button`);
  return found;
}

function countOf(method: 'GET' | 'POST', path: string): number {
  return doubles.api.requests.filter(
    (request) => request.method === method && request.path === path,
  ).length;
}

describe('graph list page', () => {
  it('C1.1 list renders the graphs, the badge and the validity', async () => {
    const { fixture, root } = await render('/projects/p1/graphs');
    await until(fixture, () => {
      expect(rowOf(root, 'chapter-opening').textContent).toContain(
        'Chapter opening',
      );
    });
    const recipe = rowOf(root, 'chapter-opening').textContent ?? '';
    expect(recipe).toContain('Recipe');
    expect(recipe).toContain('Nodes: 3');
    expect(recipe).toContain('Pending change');
    const story = rowOf(root, 'story-one').textContent ?? '';
    expect(story).toContain('Story');
    expect(story).not.toContain('Pending change');
    expect(rowOf(root, 'broken').textContent).toContain('Invalid');
  });

  it('C1.2 create calls the API and re-reads the list', async () => {
    doubles.api.respond('POST', GRAPH_CREATE_PATH, { id: 'chapter-two' });
    const { fixture, root } = await render('/projects/p1/graphs');
    await until(fixture, () => expect(rowOf(root, 'broken')).toBeDefined());
    const listReads = countOf('GET', GRAPHS_PATH);

    const name = root.querySelector<HTMLInputElement>('#graph-name');
    const view = root.querySelector<HTMLSelectElement>('#graph-view');
    if (!name || !view) throw new Error('No create controls');
    name.value = 'Chapter two';
    name.dispatchEvent(new Event('input'));
    view.value = 'recipe';
    view.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const create = Array.from(root.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Create',
    );
    create?.click();

    expect(doubles.api.requests).toContainEqual({
      method: 'POST',
      path: GRAPH_CREATE_PATH,
      body: { name: 'Chapter two', view: 'recipe' },
    });
    await vi.waitFor(() => {
      expect(countOf('GET', GRAPHS_PATH)).toBeGreaterThan(listReads);
    }, WAIT);
  });

  it('C1.3 rename calls the API with the new name and re-reads the list', async () => {
    doubles.api.respond('POST', RENAME, { id: 'chapter-opening' });
    const { fixture, root } = await render('/projects/p1/graphs');
    await until(fixture, () => expect(rowOf(root, 'broken')).toBeDefined());
    const listReads = countOf('GET', GRAPHS_PATH);

    buttonIn(rowOf(root, 'chapter-opening'), 'Rename').click();
    fixture.detectChanges();
    const input = root.querySelector<HTMLInputElement>('#rename-input');
    if (!input) throw new Error('No rename input');
    input.value = 'Opening scene';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    buttonIn(rowOf(root, 'chapter-opening'), 'Save name').click();

    expect(doubles.api.requests).toContainEqual({
      method: 'POST',
      path: RENAME,
      body: { name: 'Opening scene' },
    });
    await vi.waitFor(() => {
      expect(countOf('GET', GRAPHS_PATH)).toBeGreaterThan(listReads);
    }, WAIT);
  });

  it('C1.4 delete calls the API with an empty body and re-reads the list', async () => {
    doubles.api.respond('POST', DELETE_STORY, null);
    const { fixture, root } = await render('/projects/p1/graphs');
    await until(fixture, () => expect(rowOf(root, 'story-one')).toBeDefined());
    const listReads = countOf('GET', GRAPHS_PATH);

    buttonIn(rowOf(root, 'story-one'), 'Delete').click();

    expect(doubles.api.requests).toContainEqual({
      method: 'POST',
      path: DELETE_STORY,
      body: {},
    });
    await vi.waitFor(() => {
      expect(countOf('GET', GRAPHS_PATH)).toBeGreaterThan(listReads);
    }, WAIT);
  });

  it('C1.5 the latest run status follows the fake events', async () => {
    const { fixture, root } = await render('/projects/p1/graphs');
    await until(fixture, () => {
      expect(rowOf(root, 'chapter-opening').textContent).toContain('running');
    });

    doubles.api.respond('GET', RUN_CURRENT_PATH, {
      run: { ...RUN.run, status: 'done' },
    });
    doubles.events.push({
      module: GRAPH_RUNNER,
      type: 'run-ended',
      data: { runId: 'run-1', status: 'done' },
    });

    await until(fixture, () => {
      const row = rowOf(root, 'chapter-opening');
      expect(row.textContent).toContain('done');
      expect(row.textContent).not.toContain('running');
    });
    expect(countOf('GET', RUN_CURRENT_PATH)).toBeGreaterThanOrEqual(2);
  });

  it('C2.1 on a phone the list and the run status show, and no command is offered', async () => {
    const { fixture, root } = await render('/projects/p1/graphs', 390, 844);
    await until(fixture, () => {
      expect(rowOf(root, 'chapter-opening').textContent).toContain('running');
    });
    expect(rowOf(root, 'story-one')).toBeDefined();
    expect(rowOf(root, 'broken')).toBeDefined();

    const nav = root.querySelector('nav[aria-label="Bottom navigation"]');
    const graphsLink = [...(nav?.querySelectorAll('a') ?? [])].find(
      (anchor) =>
        anchor.querySelector('span')?.textContent?.trim() === 'Graphs',
    );
    expect(graphsLink).toBeDefined();

    const labels = Array.from(root.querySelectorAll('button')).map((button) =>
      button.textContent?.trim(),
    );
    expect(labels).not.toContain('Create');
    expect(labels).not.toContain('Rename');
    expect(labels).not.toContain('Delete');
  });

  it('C2.2 on a phone the canvas route shows the gate message and keeps the URL', async () => {
    const { fixture, router, root } = await render(
      '/projects/p1/graphs/chapter-opening',
      390,
      844,
    );
    await until(fixture, () => {
      expect(root.querySelector('h2')?.textContent?.trim()).toBe(
        'This page needs a larger screen',
      );
    });
    expect(router.url).toBe('/projects/p1/graphs/chapter-opening');
  });

  it('X1 a reconcile tick re-reads the run and the row follows it', async () => {
    const { fixture, root } = await render('/projects/p1/graphs');
    await until(fixture, () => {
      expect(rowOf(root, 'chapter-opening').textContent).toContain('running');
    });

    doubles.api.respond('GET', RUN_CURRENT_PATH, {
      run: { ...RUN.run, status: 'done' },
    });
    doubles.events.tick('visible');

    await until(fixture, () => {
      expect(rowOf(root, 'chapter-opening').textContent).toContain('done');
    });
  });

  it('X2 on a tablet the canvas route is not gated and shows the canvas page', async () => {
    const { fixture, router, root } = await render(
      '/projects/p1/graphs/chapter-opening',
      820,
      1180,
    );
    await until(fixture, () => {
      expect(root.textContent).toContain('The graph could not be loaded.');
    });
    expect(root.textContent).not.toContain('This page needs a larger screen');
    expect(router.url).toBe('/projects/p1/graphs/chapter-opening');
  });
});
