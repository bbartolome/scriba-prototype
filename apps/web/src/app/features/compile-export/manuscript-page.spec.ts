import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { SseEnvelope } from '@bbartolome/scriba-contracts/platform';
import { ACTIVE_PROJECT_ROUTE } from '@bbartolome/scriba-contracts/project-store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app';
import { APP_ROUTES } from '../../app.routes';
import type { ApiPath } from '../../shell';
import {
  restoreMatchMedia,
  stubMatchMedia,
} from '../../shell/testing/match-media';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from '../../shell/testing/test-doubles';
import { manuscriptRoutes } from './compile-export.routes';
import { MANUSCRIPT_PATH } from './manuscript-contract';

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
});
