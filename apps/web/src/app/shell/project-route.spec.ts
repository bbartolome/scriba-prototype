import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  ACTIVE_PROJECT_ROUTE,
  PROJECTS_ROUTE,
} from '@bbartolome/scriba-contracts/project-store';
import { describe, expect, it, vi } from 'vitest';
import { APP_ROUTES } from '../app.routes';
import { ApiError } from './api-error';
import { ActiveProjectSignal } from './project-scope';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from './testing/test-doubles';

/**
 * The switch page and the lazy feature routes load through the router, and `whenStable()` does not
 * track that load in these tests. A cold load can pass the 1000 ms default of `vi.waitFor` on a busy
 * machine, so the waits give it more (as `landing.spec.ts` does).
 */
const LOAD_WAIT = { timeout: 5000 };

const projectList = {
  projects: [
    { id: 'a', title: 'Alpha', active: true, status: 'ok' },
    { id: 'b', title: 'Beta', active: false, status: 'ok' },
    { id: 'c', title: 'Gamma', active: false, status: 'ok' },
  ],
};

@Component({
  template: `<p>Project: {{ ids.projectId() ?? 'none' }}</p>`,
})
class IdProbe {
  protected readonly ids = inject(ActiveProjectSignal);
}

function seed(doubles: ShellTestDoubles, active: string | null): void {
  doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active });
  doubles.api.respond('GET', PROJECTS_ROUTE, projectList);
}

function renderWith(doubles: ShellTestDoubles): void {
  TestBed.configureTestingModule({
    providers: [provideRouter(APP_ROUTES), ...doubles.providers],
  });
}

function textOf(harness: RouterTestingHarness): string {
  harness.detectChanges();
  return harness.routeNativeElement?.textContent ?? '';
}

function buttonsOf(harness: RouterTestingHarness): HTMLButtonElement[] {
  harness.detectChanges();
  return Array.from(
    harness.routeNativeElement?.querySelectorAll('button') ?? [],
  );
}

function hasButton(harness: RouterTestingHarness, label: string): boolean {
  return buttonsOf(harness).some((b) => b.textContent?.trim() === label);
}

function clickButton(harness: RouterTestingHarness, label: string): void {
  const button = buttonsOf(harness).find(
    (b) => b.textContent?.trim() === label,
  );
  if (button === undefined) {
    throw new Error(`No button named ${label}.`);
  }
  button.click();
}

function alertOf(harness: RouterTestingHarness): string {
  harness.detectChanges();
  return (
    harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent ??
    ''
  ).trim();
}

describe('project route', () => {
  it('C2 shows the switch page for a mismatched project; Switch activates and proceeds; Go goes to the active id', async () => {
    const doubles = createShellTestDoubles();
    seed(doubles, 'a');
    renderWith(doubles);
    const router = TestBed.inject(Router);
    const harness = await RouterTestingHarness.create('/projects/b/chat');
    await harness.fixture.whenStable();

    expect(router.url.startsWith('/projects/b/switch')).toBe(true);
    await vi.waitFor(() => {
      expect(textOf(harness)).toContain('Switch to Beta?');
      expect(hasButton(harness, 'Switch')).toBe(true);
      expect(hasButton(harness, 'Go to the active project')).toBe(true);
    }, LOAD_WAIT);

    clickButton(harness, 'Go to the active project');
    await vi.waitFor(
      () => expect(router.url).toBe('/projects/a/chat'),
      LOAD_WAIT,
    );

    await router.navigateByUrl('/projects/b/chat');
    await vi.waitFor(() => {
      expect(textOf(harness)).toContain('Switch to Beta?');
      expect(hasButton(harness, 'Switch')).toBe(true);
      expect(hasButton(harness, 'Go to the active project')).toBe(true);
    }, LOAD_WAIT);

    doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'b' });
    doubles.api.respond('POST', ACTIVE_PROJECT_ROUTE, { active: 'b' });
    clickButton(harness, 'Switch');
    await vi.waitFor(
      () => expect(router.url).toBe('/projects/b/chat'),
      LOAD_WAIT,
    );

    expect(doubles.api.requests).toContainEqual({
      method: 'POST',
      path: ACTIVE_PROJECT_ROUTE,
      body: { projectId: 'b' },
    });
  }, 25000);

  it('E2 ActiveProjectSignal reads the id of the URL', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'projects/:projectId',
            children: [{ path: 'probe', component: IdProbe }],
          },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create('/projects/b/probe');

    await vi.waitFor(
      () => expect(textOf(harness)).toContain('Project: b'),
      LOAD_WAIT,
    );
  }, 10000);

  it('E3 a failed Switch shows the message and stays on the switch page', async () => {
    const doubles = createShellTestDoubles();
    seed(doubles, 'a');
    renderWith(doubles);
    const router = TestBed.inject(Router);
    const harness = await RouterTestingHarness.create(
      '/projects/b/switch?to=%2Fchat',
    );
    await vi.waitFor(
      () => expect(textOf(harness)).toContain('Switch to Beta?'),
      LOAD_WAIT,
    );

    doubles.api.fail(
      'POST',
      ACTIVE_PROJECT_ROUTE,
      new ApiError(404, 'PROJECT_NOT_FOUND', 'Project not found.'),
    );
    clickButton(harness, 'Switch');

    await vi.waitFor(
      () => expect(alertOf(harness)).toBe('Project not found.'),
      LOAD_WAIT,
    );
    expect(router.url.startsWith('/projects/b/switch')).toBe(true);
  }, 15000);

  it('E6 carries a query in the remainder through the switch page', async () => {
    const doubles = createShellTestDoubles();
    seed(doubles, 'a');
    renderWith(doubles);
    const router = TestBed.inject(Router);
    const harness = await RouterTestingHarness.create(
      '/projects/b/review?run=3',
    );
    await harness.fixture.whenStable();

    expect(router.url.startsWith('/projects/b/switch')).toBe(true);
    expect(router.parseUrl(router.url).queryParamMap.get('to')).toBe(
      '/review?run=3',
    );
    await vi.waitFor(() => {
      expect(textOf(harness)).toContain('Switch to Beta?');
      expect(hasButton(harness, 'Go to the active project')).toBe(true);
    }, LOAD_WAIT);

    clickButton(harness, 'Go to the active project');
    await vi.waitFor(
      () => expect(router.url).toBe('/projects/a/review?run=3'),
      LOAD_WAIT,
    );
  }, 15000);

  it('a switch page reused for another URL of the route reads the new to on Go', async () => {
    const doubles = createShellTestDoubles();
    seed(doubles, 'a');
    renderWith(doubles);
    const router = TestBed.inject(Router);
    const harness = await RouterTestingHarness.create(
      '/projects/b/switch?to=%2Fchat',
    );
    await vi.waitFor(() => {
      expect(textOf(harness)).toContain('Switch to Beta?');
      expect(hasButton(harness, 'Go to the active project')).toBe(true);
    }, LOAD_WAIT);

    await router.navigateByUrl('/projects/b/review');
    await vi.waitFor(
      () =>
        expect(router.parseUrl(router.url).queryParamMap.get('to')).toBe(
          '/review',
        ),
      LOAD_WAIT,
    );

    clickButton(harness, 'Go to the active project');
    await vi.waitFor(
      () => expect(router.url).toBe('/projects/a/review'),
      LOAD_WAIT,
    );
  }, 20000);

  it('a switch page reused for another project id switches to that id on Switch', async () => {
    const doubles = createShellTestDoubles();
    seed(doubles, 'a');
    renderWith(doubles);
    const router = TestBed.inject(Router);
    const harness = await RouterTestingHarness.create(
      '/projects/b/switch?to=%2Fchat',
    );
    await vi.waitFor(
      () => expect(textOf(harness)).toContain('Switch to Beta?'),
      LOAD_WAIT,
    );

    await router.navigateByUrl('/projects/c/review');
    await vi.waitFor(
      () => expect(textOf(harness)).toContain('Switch to Gamma?'),
      LOAD_WAIT,
    );

    doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'c' });
    doubles.api.respond('POST', ACTIVE_PROJECT_ROUTE, { active: 'c' });
    clickButton(harness, 'Switch');
    await vi.waitFor(
      () => expect(router.url).toBe('/projects/c/review'),
      LOAD_WAIT,
    );

    expect(doubles.api.requests).toContainEqual({
      method: 'POST',
      path: ACTIVE_PROJECT_ROUTE,
      body: { projectId: 'c' },
    });
  }, 20000);

  it('a valid to keeps its path and query on Go from the switch page', async () => {
    const doubles = createShellTestDoubles();
    seed(doubles, 'a');
    renderWith(doubles);
    const router = TestBed.inject(Router);
    const harness = await RouterTestingHarness.create(
      `/projects/b/switch?to=${encodeURIComponent('/review?run=3')}`,
    );
    await vi.waitFor(() => {
      expect(textOf(harness)).toContain('Switch to Beta?');
      expect(hasButton(harness, 'Go to the active project')).toBe(true);
    }, LOAD_WAIT);

    clickButton(harness, 'Go to the active project');
    await vi.waitFor(
      () => expect(router.url).toBe('/projects/a/review?run=3'),
      LOAD_WAIT,
    );
  }, 15000);

  it.each(['x', '/../../settings'])(
    'an invalid to (%s) is treated as empty: Go goes to the active root, Switch to the id alone',
    async (to) => {
      const doubles = createShellTestDoubles();
      seed(doubles, 'a');
      renderWith(doubles);
      const router = TestBed.inject(Router);
      const url = `/projects/b/switch?to=${encodeURIComponent(to)}`;
      const harness = await RouterTestingHarness.create(url);
      await vi.waitFor(() => {
        expect(textOf(harness)).toContain('Switch to Beta?');
        expect(hasButton(harness, 'Go to the active project')).toBe(true);
      }, LOAD_WAIT);

      clickButton(harness, 'Go to the active project');
      await vi.waitFor(() => expect(router.url).toBe('/projects/a'), LOAD_WAIT);

      await router.navigateByUrl(url);
      await vi.waitFor(() => {
        expect(textOf(harness)).toContain('Switch to Beta?');
        expect(hasButton(harness, 'Go to the active project')).toBe(true);
      }, LOAD_WAIT);

      doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'b' });
      doubles.api.respond('POST', ACTIVE_PROJECT_ROUTE, { active: 'b' });
      clickButton(harness, 'Switch');
      await vi.waitFor(() => expect(router.url).toBe('/projects/b'), LOAD_WAIT);
      expect(doubles.api.requests).toContainEqual({
        method: 'POST',
        path: ACTIVE_PROJECT_ROUTE,
        body: { projectId: 'b' },
      });
    },
    25000,
  );
});
