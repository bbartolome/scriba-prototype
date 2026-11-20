import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  ACTIVE_PROJECT_ROUTE,
  PROJECTS_ROUTE,
} from '@bbartolome/scriba-contracts/project-store';
import { type Observable, map, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type ApiPath, parseResponse, type ResponseSchema } from './api-client';
import { AppNav } from './app-nav';
import { NotFoundPage } from './not-found';
import { SwitchProjectPage } from './switch-project';
import { restoreMatchMedia, stubMatchMedia } from './testing/match-media';
import { createShellTestDoubles, FakeApiClient } from './testing/test-doubles';
import { API_CLIENT } from './tokens';

/** A fake whose project list read waits for the test. Every other read is answered as usual. */
class HoldingProjectList extends FakeApiClient {
  readonly projects = new Subject<unknown>();

  override get<T>(
    path: ApiPath,
    schema: ResponseSchema<T>,
    params?: Record<string, string>,
  ): Observable<T> {
    if (path !== PROJECTS_ROUTE) return super.get(path, schema, params);
    this.requests.push({ method: 'GET', path });
    return this.projects.pipe(map((body) => parseResponse(path, schema, body)));
  }
}

// A route table with no `data.nav` entry, so the nav has no features.
const TABLE = [
  { path: 'projects/:projectId/switch', component: SwitchProjectPage },
  { path: '**', component: NotFoundPage },
];

beforeEach(() => {
  stubMatchMedia(1280, 800);
});

afterEach(() => {
  restoreMatchMedia();
});

describe('shell states', () => {
  it('criterion 3: Component tests cover skeletons and empty states.', async () => {
    const doubles = createShellTestDoubles();
    const projects = new HoldingProjectList();
    projects.respond('GET', ACTIVE_PROJECT_ROUTE, { active: null });
    TestBed.configureTestingModule({
      // The holding client comes last, so it replaces the API_CLIENT of the shell doubles.
      providers: [
        provideRouter(TABLE),
        ...doubles.providers,
        { provide: API_CLIENT, useValue: projects },
      ],
    });

    const harness = await RouterTestingHarness.create();
    const nav = TestBed.createComponent(AppNav);
    nav.detectChanges();

    // No-features state: the nav has no link and says so.
    expect(nav.nativeElement.textContent).toContain('No features registered.');
    expect(nav.nativeElement.querySelector('a')).toBeNull();

    // Skeleton state and no-project state while the project list is held.
    await harness.navigateByUrl('/projects/beta/switch');
    harness.detectChanges();
    const route = harness.routeNativeElement as HTMLElement;
    expect(route.querySelector('[role="status"]')?.textContent).toContain(
      'Loading',
    );
    expect(route.querySelector('h2')).toBeNull();
    expect(route.textContent).toContain('No project is active.');
    expect(
      Array.from(route.querySelectorAll('button')).some(
        (button) => button.textContent?.trim() === 'Switch',
      ),
    ).toBe(true);

    // The held read answers: the heading shows and the skeleton is gone.
    projects.projects.next({
      projects: [{ id: 'beta', title: 'Beta', active: false, status: 'ok' }],
    });
    harness.detectChanges();
    expect(route.textContent).toContain('Switch to Beta?');
    expect(route.querySelector('[role="status"]')).toBeNull();

    // Not-found state.
    await harness.navigateByUrl('/nowhere');
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Page not found');
  });
});
