import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  ACTIVE_PROJECT_ROUTE,
  projectSwitchedDataSchema,
} from '@bbartolome/scriba-contracts/project-store';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../app';
import { APP_ROUTES } from '../app.routes';
import { isProjectSwitchedData } from './project-switch-follow';
import { restoreMatchMedia, stubMatchMedia } from './testing/match-media';
import {
  createShellTestDoubles,
  type ShellTestDoubles,
} from './testing/test-doubles';

beforeEach(() => {
  stubMatchMedia(390, 844);
});

afterEach(() => {
  restoreMatchMedia();
});

async function render(
  doubles: ShellTestDoubles,
): Promise<ComponentFixture<App>> {
  TestBed.configureTestingModule({
    imports: [App],
    providers: [provideRouter(APP_ROUTES), ...doubles.providers],
  });
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('project switch follower', () => {
  it('C3 a project-switched event moves an open project tab to the same child path under the new id', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'a' });
    const fixture = await render(doubles);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/projects/a/review?run=3');
    await fixture.whenStable();
    expect(router.url).toBe('/projects/a/review?run=3');

    doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'b' });
    doubles.events.push({
      module: 'project-store',
      type: 'project-switched',
      data: { from: 'a', to: 'b' },
    });
    await fixture.whenStable();

    expect(router.url).toBe('/projects/b/review?run=3');
  });

  it('E4 other events and non-project tabs do not move', async () => {
    const doubles = createShellTestDoubles();
    doubles.api.respond('GET', ACTIVE_PROJECT_ROUTE, { active: 'a' });
    const fixture = await render(doubles);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/projects/a/review');
    await fixture.whenStable();
    doubles.events.push({
      module: 'project-store',
      type: 'files-changed',
      data: { from: 'a', to: 'b' },
    });
    await fixture.whenStable();
    expect(router.url).toBe('/projects/a/review');

    await router.navigateByUrl('/settings');
    await fixture.whenStable();
    doubles.events.push({
      module: 'project-store',
      type: 'project-switched',
      data: { from: 'a', to: 'b' },
    });
    await fixture.whenStable();
    expect(router.url).toBe('/settings');
  });

  it('E5 the hand-written guard agrees with the contract', () => {
    const cases: Array<[unknown, boolean]> = [
      [{ from: null, to: 'b' }, true],
      [{ from: 'a', to: 'b' }, true],
      [{ from: 'a' }, false],
      [{ from: 3, to: 'b' }, false],
      [{ from: 'a', to: '' }, false],
      [{ from: '', to: 'b' }, false],
    ];

    // The valid samples are accepted by both, so the table cannot pass with two always-false checks.
    expect(
      projectSwitchedDataSchema.safeParse({ from: 'a', to: 'b' }).success,
    ).toBe(true);
    for (const [value, accepted] of cases) {
      expect(projectSwitchedDataSchema.safeParse(value).success).toBe(accepted);
      expect(isProjectSwitchedData(value)).toBe(accepted);
    }
  });
});
