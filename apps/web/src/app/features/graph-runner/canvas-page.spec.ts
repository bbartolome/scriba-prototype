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
import { graphPath, graphSavePath } from './graph-runner-contract';

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
