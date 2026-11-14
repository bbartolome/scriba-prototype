import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  NavigationEnd,
  provideRouter,
  Router,
  type Route,
  type Routes,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { filter, firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { APP_ROUTES } from '../app.routes';
import { deviceClassGuard, withDeviceGate } from './device-class';
import { restoreMatchMedia, stubMatchMedia } from './testing/match-media';

@Component({ template: '<p>probe tablet view</p>' })
class TabletView {}

@Component({ template: '<p>start probe</p>' })
class StartProbe {}

const startRoute: Route = {
  path: '',
  pathMatch: 'full',
  component: StartProbe,
};

@Component({ template: '<p>probe phone view</p>' })
class PhoneView {}

@Component({ template: '<p>probe child</p>' })
class ChildProbe {}

@Component({ template: '<p>probe canvas</p>' })
class CanvasProbe {}

@Component({ template: '<p>graphs home</p>' })
class GraphsHome {}

@Component({ template: '<p>deep home</p>' })
class DeepHome {}

const tabletLeaf: Route = {
  path: 'tablet-view',
  data: { scope: 'app', minDeviceClass: 'tablet' },
  component: TabletView,
};

const deepRoute: Route = {
  path: 'deep',
  data: { scope: 'app', minDeviceClass: 'tablet' },
  children: [{ path: '', pathMatch: 'full', component: DeepHome }],
};

const parentRoutes = withDeviceGate([
  {
    path: 'parent',
    children: [
      {
        path: 'child',
        canMatch: [deviceClassGuard('tablet')],
        component: ChildProbe,
      },
    ],
  },
]);

const graphChildren: Routes = [
  { path: '', pathMatch: 'full', component: GraphsHome },
  {
    path: ':graphId',
    canMatch: [deviceClassGuard('tablet')],
    component: CanvasProbe,
  },
];

const lazyGraphRoutes = withDeviceGate([
  {
    path: 'graphs',
    data: { scope: 'app', minDeviceClass: 'phone' },
    loadChildren: () => Promise.resolve(graphChildren),
  },
]);

let resize: (width: number, height: number) => void;

beforeEach(() => {
  resize = stubMatchMedia(390, 844);
});

afterEach(() => {
  restoreMatchMedia();
});

/** Routes the test's table ahead of the App's own table. */
function useRoutes(routes: Routes): void {
  TestBed.configureTestingModule({
    providers: [provideRouter([...routes, ...APP_ROUTES])],
  });
}

function textOf(harness: RouterTestingHarness): string {
  return (harness.fixture.nativeElement as HTMLElement).textContent ?? '';
}

function pathOf(): string {
  return TestBed.inject(Location).path();
}

describe('device gate', () => {
  it('G1 keeps the URL on a phone and shows the page there; back returns to the start page', async () => {
    useRoutes([startRoute, ...withDeviceGate([tabletLeaf])]);
    const router = TestBed.inject(Router);
    // Under the test harness the router listens to popstate only after this call.
    router.setUpLocationChangeListener();
    const harness = await RouterTestingHarness.create('/');
    expect(textOf(harness)).toContain('start probe');

    await router.navigateByUrl('/tablet-view');
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
    expect(pathOf()).toBe('/tablet-view');
    expect(textOf(harness)).toContain('needs a larger screen');
    expect(textOf(harness)).toContain('Go to the start page');
    expect(textOf(harness)).not.toContain('probe tablet view');

    const back = firstValueFrom(
      router.events.pipe(filter((event) => event instanceof NavigationEnd)),
    );
    TestBed.inject(Location).back();
    await back;
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
    expect(pathOf()).toBe('');
    expect(textOf(harness)).toContain('start probe');
    expect(textOf(harness)).not.toContain('needs a larger screen');
  });

  it('G2 refuses a tablet child on a phone and shows the page at the same URL', async () => {
    useRoutes(parentRoutes);
    const harness = await RouterTestingHarness.create('/parent/child');

    expect(pathOf()).toBe('/parent/child');
    expect(textOf(harness)).toContain('needs a larger screen');
    expect(textOf(harness)).not.toContain('probe child');
  });

  it('G3 shows a tablet child on a tablet', async () => {
    resize(820, 1180);
    useRoutes(parentRoutes);
    const harness = await RouterTestingHarness.create('/parent/child');

    expect(pathOf()).toBe('/parent/child');
    expect(textOf(harness)).toContain('probe child');
    expect(textOf(harness)).not.toContain('needs a larger screen');
  });

  it('G4 keeps the URL of a lazily loaded tablet child on a phone', async () => {
    useRoutes(lazyGraphRoutes);
    const harness = await RouterTestingHarness.create('/graphs/g1');

    expect(pathOf()).toBe('/graphs/g1');
    expect(textOf(harness)).toContain('needs a larger screen');
    expect(textOf(harness)).not.toContain('probe canvas');
  });

  it('G5 shows a lazily loaded tablet child on a tablet', async () => {
    resize(820, 1180);
    useRoutes(lazyGraphRoutes);
    const harness = await RouterTestingHarness.create('/graphs/g1');

    expect(pathOf()).toBe('/graphs/g1');
    expect(textOf(harness)).toContain('probe canvas');
    expect(textOf(harness)).not.toContain('needs a larger screen');
  });

  it('G6 shows the page for a deep URL and for the exact URL under a gated parent with children', async () => {
    useRoutes(withDeviceGate([deepRoute]));
    const router = TestBed.inject(Router);
    const harness = await RouterTestingHarness.create('/deep/x/y');

    expect(pathOf()).toBe('/deep/x/y');
    expect(textOf(harness)).toContain('needs a larger screen');

    await router.navigateByUrl('/deep');
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
    expect(pathOf()).toBe('/deep');
    expect(textOf(harness)).toContain('needs a larger screen');
  });

  it('G7 keeps the not-found page for an unknown URL and for a URL under a gated leaf', async () => {
    useRoutes(withDeviceGate([deepRoute, tabletLeaf]));
    const router = TestBed.inject(Router);
    const harness = await RouterTestingHarness.create('/no-such-top');

    expect(textOf(harness)).toContain('Page not found');
    expect(textOf(harness)).not.toContain('needs a larger screen');

    await router.navigateByUrl('/tablet-view/x');
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
    expect(textOf(harness)).toContain('Page not found');
    expect(textOf(harness)).not.toContain('needs a larger screen');
    expect(textOf(harness)).not.toContain('probe tablet view');
  });

  it('G8 shows the untagged child of a phone view on a phone', async () => {
    useRoutes(
      withDeviceGate([
        {
          path: 'phone-view',
          data: { scope: 'app', minDeviceClass: 'phone' },
          children: [
            { path: '', pathMatch: 'full', component: PhoneView },
            {
              path: 'canvas',
              canMatch: [deviceClassGuard('tablet')],
              component: CanvasProbe,
            },
          ],
        },
      ]),
    );
    const harness = await RouterTestingHarness.create('/phone-view');

    expect(textOf(harness)).toContain('probe phone view');
    expect(textOf(harness)).not.toContain('needs a larger screen');
  });
});
