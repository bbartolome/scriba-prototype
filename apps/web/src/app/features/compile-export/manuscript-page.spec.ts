import { CdkDrag, type CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { getDebugNode } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { SseEnvelope } from '@bbartolome/scriba-contracts/platform';
import { ACTIVE_PROJECT_ROUTE } from '@bbartolome/scriba-contracts/project-store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app';
import { APP_ROUTES } from '../../app.routes';
import { ApiError, type ApiPath } from '../../shell';
import {
  restoreMatchMedia,
  stubMatchMedia,
} from '../../shell/testing/match-media';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { manuscriptRoutes } from './compile-export.routes';
import {
  MANUSCRIPT_PART_PATH,
  MANUSCRIPT_PATH,
  MANUSCRIPT_REORDER_PATH,
  MANUSCRIPT_STATUS_PATH,
  ORDER_CONFLICT_CODE,
} from './manuscript-contract';

const WAIT = { timeout: 5000 };
const REV1 = `sha256:${'1'.repeat(64)}`;
const REV2 = `sha256:${'2'.repeat(64)}`;
const REV3 = `sha256:${'3'.repeat(64)}`;

function entry(
  path: string,
  part: string,
  status: string,
  words: number,
  graphOrdered = false,
  inOrderField = true,
) {
  return { path, part, status, words, graphOrdered, inOrderField };
}

const FRONT = entry('drafts/front.md', 'front', 'final', 120);
const CH01 = entry('drafts/ch01.md', 'body', 'draft', 900, true, true);
const CH02 = entry('drafts/ch02.md', 'body', 'revised', 1200);
const CH03 = entry('drafts/ch03.md', 'body', 'outline', 700, false, false);
const BACK = entry('drafts/back.md', 'back', 'draft', 80);

/** Revision 1: the body order is ch01 (graph-ordered), ch02, ch03. */
const VIEW_1 = {
  entries: [FRONT, CH01, CH02, CH03, BACK],
  totals: { body: 2800, manuscript: 3000 },
  orderSource: 'graph+project',
  warnings: [],
  revision: REV1,
};

/** Revision 2: ch03 moved above ch02. */
const VIEW_2 = {
  ...VIEW_1,
  entries: [FRONT, CH01, CH03, CH02, BACK],
  revision: REV2,
};

/** Revision 3: as revision 2. */
const VIEW_3 = { ...VIEW_2, revision: REV3 };

const CONFLICT_TEXT =
  'The manuscript changed since it was read. Reload it and try again.';

/** Revision 1 with the three kinds of warning. */
const VIEW_WARNED = {
  ...VIEW_1,
  warnings: [
    { kind: 'graphCycle', files: ['drafts/ch02.md', 'drafts/ch03.md'] },
    { kind: 'invalidGraph', path: 'graphs/broken.json' },
    { kind: 'staleEntry', path: 'drafts/gone.md' },
  ],
};

const ACTIVE = ACTIVE_PROJECT_ROUTE as ApiPath;

let doubles: ShellTestDoubles;

beforeEach(() => {
  doubles = createShellTestDoubles();
});

afterEach(() => {
  restoreMatchMedia();
});

/** Renders the whole App at `url`, on a viewport of `width` by `height`. */
async function renderApp(
  url: string,
  width = 1280,
  height = 800,
): Promise<{ fixture: { detectChanges(): void }; root: HTMLElement }> {
  stubMatchMedia(width, height);
  TestBed.configureTestingModule({
    imports: [App],
    providers: [provideRouter(APP_ROUTES), ...doubles.providers],
  });
  await TestBed.compileComponents();
  const fixture = TestBed.createComponent(App);
  const router = TestBed.inject(Router);
  fixture.detectChanges();
  await router.navigateByUrl(url);
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

/** Renders the page through its own route entry, with no active-project guard (P4). */
async function renderPage(url: string, width = 1280, height = 800) {
  stubMatchMedia(width, height);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'projects/:projectId/manuscript', children: manuscriptRoutes },
      ]),
      ...doubles.providers,
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  harness.detectChanges();
  await harness.fixture.whenStable();
  harness.detectChanges();
  return harness;
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

/** Pushes one event through the fake event source. */
function push(
  module: 'compile-export' | 'project-store',
  envelope: { type: string; data: unknown },
): void {
  const event: SseEnvelope = { module, ...envelope };
  doubles.events.push(event);
}

/** Lets pending reads and the change detection they cause finish. */
async function settle(harness: RouterTestingHarness): Promise<void> {
  harness.detectChanges();
  await harness.fixture.whenStable();
  harness.detectChanges();
}

/** How many requests of one method and path reached the fake API client. */
function countOf(path: ApiPath, method: 'GET' | 'POST' = 'GET'): number {
  return doubles.api.requests.filter(
    (request) => request.method === method && request.path === path,
  ).length;
}

/** The leaf element whose text is `text`, found anywhere under `root`. */
function leafWith(root: HTMLElement, text: string): HTMLElement {
  const found = [...root.querySelectorAll<HTMLElement>('*')].find(
    (element) =>
      element.childElementCount === 0 && element.textContent?.trim() === text,
  );
  if (!found) throw new Error(`No element reads "${text}".`);
  return found;
}

/** The outline row of one file, by its path. */
function rowOf(root: HTMLElement, path: string): HTMLElement {
  const row = root.querySelector(`li[data-path="${path}"]`);
  if (!(row instanceof HTMLElement)) throw new Error(`No row for ${path}.`);
  return row;
}

/** The drag of a row, from its debug node (P5). */
function dragOf(row: HTMLElement): CdkDrag {
  const drag = getDebugNode(row)?.injector.get(CdkDrag);
  if (!drag) throw new Error('No drag on the row.');
  return drag;
}

/** Simulates a drop on one part list, as the CDK emits it after a pointer gesture (P5). */
function dropOn(
  list: HTMLElement,
  previousIndex: number,
  currentIndex: number,
): void {
  const dropList = getDebugNode(list)?.injector.get(CdkDropList);
  if (!dropList) throw new Error('No drop list on the element.');
  dropList.dropped.emit({
    previousIndex,
    currentIndex,
  } as unknown as CdkDragDrop<unknown>);
}

/** The `ul[data-part]` list of one part. */
function partList(root: HTMLElement, part: string): HTMLElement {
  const list = root.querySelector(`ul[data-part="${part}"]`);
  if (!(list instanceof HTMLElement)) throw new Error(`No ${part} list.`);
  return list;
}

/** The paths of one part list, in order. */
function pathsIn(root: HTMLElement, part: string): (string | null)[] {
  return Array.from(partList(root, part).querySelectorAll('li')).map((row) =>
    row.getAttribute('data-path'),
  );
}

/** A native select, by its aria-label. */
function selectNamed(root: HTMLElement, label: string): HTMLSelectElement {
  const select = root.querySelector(`select[aria-label="${label}"]`);
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`No select "${label}".`);
  }
  return select;
}

/** Sets a select's value and dispatches the change event that a user's choice dispatches. */
function choose(select: HTMLSelectElement, value: string): void {
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

describe('ManuscriptPage', () => {
  it('T1 the Manuscript item is in the phone nav with a project open', async () => {
    doubles.api.respond('GET', ACTIVE, { active: 'p1' });
    doubles.api.respond('GET', MANUSCRIPT_PATH, VIEW_1);
    const { fixture, root } = await renderApp(
      '/projects/p1/manuscript',
      390,
      844,
    );

    await until(fixture, () => {
      const nav = root.querySelector('nav[aria-label="Bottom navigation"]');
      const link = [...(nav?.querySelectorAll('a') ?? [])].find(
        (anchor) =>
          anchor.querySelector('span')?.textContent?.trim() === 'Manuscript',
      );
      expect(link?.getAttribute('href')).toBe('/projects/p1/manuscript');
    });
  });

  it('T2 the totals, order source, warnings, badge, links and headings show in the order of the layout', async () => {
    doubles.api.respond('GET', MANUSCRIPT_PATH, VIEW_WARNED);
    const harness = await renderPage('/projects/p1/manuscript');
    const root = harness.routeNativeElement as HTMLElement;

    await until(harness.fixture, () => {
      leafWith(root, 'Body: 2800 words. Manuscript: 3000 words.');
    });

    const shown = [
      leafWith(root, 'Manuscript'),
      leafWith(root, 'Body: 2800 words. Manuscript: 3000 words.'),
      leafWith(root, 'Order: story graph, then project.yaml'),
      leafWith(
        root,
        'Story graph cycle among drafts/ch02.md, drafts/ch03.md. The graph is ignored.',
      ),
      leafWith(root, 'Story graph skipped as invalid: graphs/broken.json.'),
      leafWith(root, 'Order entry for a missing file ignored: drafts/gone.md.'),
      leafWith(root, 'Front matter'),
      leafWith(root, 'Body'),
      leafWith(root, 'Back matter'),
    ];
    for (let i = 1; i < shown.length; i++) {
      const before = shown[i - 1] as HTMLElement;
      const after = shown[i] as HTMLElement;
      expect(
        before.compareDocumentPosition(after) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }

    expect(root.textContent?.split('Graph order').length).toBe(2);
    expect(rowOf(root, 'drafts/ch01.md').textContent).toContain('Graph order');

    for (const row of root.querySelectorAll<HTMLElement>('li[data-path]')) {
      const path = row.getAttribute('data-path') ?? '';
      const link = row.querySelector('a');
      const url = new URL(link?.getAttribute('href') ?? '', 'http://x');
      expect(url.pathname).toBe('/projects/p1/files');
      expect(url.searchParams.get('path')).toBe(path);
    }
  });

  it('T3 files-changed refetches only for drafts/, project.yaml and this project', async () => {
    doubles.api.respond('GET', MANUSCRIPT_PATH, VIEW_1);
    const harness = await renderPage('/projects/p1/manuscript');
    await settle(harness);
    expect(countOf(MANUSCRIPT_PATH)).toBe(1);

    push('project-store', {
      type: 'files-changed',
      data: { projectId: 'p1', paths: ['drafts/ch02.md'] },
    });
    await settle(harness);
    expect(countOf(MANUSCRIPT_PATH)).toBe(2);

    push('project-store', {
      type: 'files-changed',
      data: { projectId: 'p1', paths: ['sources/outline.md'] },
    });
    await settle(harness);
    expect(countOf(MANUSCRIPT_PATH)).toBe(2);

    push('project-store', {
      type: 'files-changed',
      data: { projectId: 'other', paths: ['drafts/ch02.md'] },
    });
    await settle(harness);
    expect(countOf(MANUSCRIPT_PATH)).toBe(2);

    push('project-store', {
      type: 'files-changed',
      data: { projectId: 'p1', paths: ['project.yaml'] },
    });
    await settle(harness);
    expect(countOf(MANUSCRIPT_PATH)).toBe(3);
  });

  it('M1 a drag sends a reorder with the current revision; graph-ordered rows can not be dragged', async () => {
    doubles.api.respond('GET', MANUSCRIPT_PATH, VIEW_1);
    doubles.api.respond('POST', MANUSCRIPT_REORDER_PATH, VIEW_2);
    const harness = await renderPage('/projects/p1/manuscript', 1280, 800);
    const root = harness.routeNativeElement as HTMLElement;
    await until(harness.fixture, () => {
      expect(pathsIn(root, 'body')).toEqual([
        'drafts/ch01.md',
        'drafts/ch02.md',
        'drafts/ch03.md',
      ]);
    });
    const graphRow = root.querySelector<HTMLElement>(
      'li[data-path="drafts/ch01.md"]',
    );
    expect(dragOf(graphRow as HTMLElement).disabled).toBe(true);

    dropOn(partList(root, 'body'), 2, 1);
    await settle(harness);

    expect(doubles.api.requests.at(-1)).toEqual({
      method: 'POST',
      path: MANUSCRIPT_REORDER_PATH,
      body: {
        revision: REV1,
        front: ['drafts/front.md'],
        body: ['drafts/ch01.md', 'drafts/ch03.md', 'drafts/ch02.md'],
        back: ['drafts/back.md'],
      },
    });
    expect(pathsIn(root, 'body')).toEqual([
      'drafts/ch01.md',
      'drafts/ch03.md',
      'drafts/ch02.md',
    ]);
  });

  it('M2 a conflict shows the reload prompt, and manuscript-updated refetches', async () => {
    doubles.api.respond('GET', MANUSCRIPT_PATH, VIEW_1);
    doubles.api.fail(
      'POST',
      MANUSCRIPT_REORDER_PATH,
      new ApiError(409, ORDER_CONFLICT_CODE, CONFLICT_TEXT),
    );
    const harness = await renderPage('/projects/p1/manuscript', 1280, 800);
    const root = harness.routeNativeElement as HTMLElement;
    await until(harness.fixture, () => {
      expect(pathsIn(root, 'body')).toHaveLength(3);
    });

    dropOn(partList(root, 'body'), 2, 1);
    await settle(harness);

    const alert = root.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain(CONFLICT_TEXT);
    const reload = Array.from(root.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Reload manuscript',
    );
    expect(reload).toBeDefined();

    doubles.api.respond('GET', MANUSCRIPT_PATH, VIEW_2);
    push('compile-export', {
      type: 'manuscript-updated',
      data: { projectId: 'p1', revision: REV2 },
    });
    await settle(harness);

    expect(countOf(MANUSCRIPT_PATH)).toBe(2);
    expect(pathsIn(root, 'body')).toEqual([
      'drafts/ch01.md',
      'drafts/ch03.md',
      'drafts/ch02.md',
    ]);
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('M3 status and part changes send their requests, each with the revision of the last answer', async () => {
    doubles.api.respond('GET', MANUSCRIPT_PATH, VIEW_1);
    doubles.api.respond('POST', MANUSCRIPT_STATUS_PATH, VIEW_2);
    doubles.api.respond('POST', MANUSCRIPT_PART_PATH, VIEW_3);
    const harness = await renderPage('/projects/p1/manuscript', 1280, 800);
    const root = harness.routeNativeElement as HTMLElement;
    await until(harness.fixture, () => {
      selectNamed(root, 'Status of ch02.md');
    });

    choose(selectNamed(root, 'Status of ch02.md'), 'final');
    await settle(harness);
    expect(doubles.api.requests.at(-1)).toEqual({
      method: 'POST',
      path: MANUSCRIPT_STATUS_PATH,
      body: { revision: REV1, path: 'drafts/ch02.md', status: 'final' },
    });

    choose(selectNamed(root, 'Part of ch02.md'), 'back');
    await settle(harness);
    expect(doubles.api.requests.at(-1)).toEqual({
      method: 'POST',
      path: MANUSCRIPT_PART_PATH,
      body: { revision: REV2, path: 'drafts/ch02.md', part: 'back' },
    });
  });

  it('T4 a drop above the graph block is refused, and a graph row part select is disabled', async () => {
    doubles.api.respond('GET', MANUSCRIPT_PATH, VIEW_1);
    const harness = await renderPage('/projects/p1/manuscript', 1280, 800);
    const root = harness.routeNativeElement as HTMLElement;
    await until(harness.fixture, () => {
      selectNamed(root, 'Part of ch01.md');
    });

    dropOn(partList(root, 'body'), 1, 0);
    await settle(harness);

    expect(countOf(MANUSCRIPT_REORDER_PATH, 'POST')).toBe(0);
    expect(selectNamed(root, 'Part of ch01.md').disabled).toBe(true);
  });

  it('M4 the phone viewport is read-only: the controls and drags are disabled and no write is sent', async () => {
    doubles.api.respond('GET', MANUSCRIPT_PATH, VIEW_1);
    const harness = await renderPage('/projects/p1/manuscript', 390, 844);
    const root = harness.routeNativeElement as HTMLElement;
    await until(harness.fixture, () => {
      selectNamed(root, 'Status of ch02.md');
    });

    expect(selectNamed(root, 'Status of ch02.md').disabled).toBe(true);
    expect(selectNamed(root, 'Part of ch02.md').disabled).toBe(true);
    expect(dragOf(rowOf(root, 'drafts/ch02.md')).disabled).toBe(true);

    dropOn(partList(root, 'body'), 1, 2);
    choose(selectNamed(root, 'Status of ch02.md'), 'final');
    await settle(harness);

    expect(doubles.api.requests.map((request) => request.method)).toEqual([
      'GET',
    ]);
    expect(
      rowOf(root, 'drafts/ch02.md').querySelector('a')?.getAttribute('href'),
    ).toContain('/projects/p1/files');
  });
});
