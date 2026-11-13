import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  type ActivatedRouteSnapshot,
  type CanMatchFn,
  type LoadChildren,
  NavigationEnd,
  type Route,
  Router,
  type Routes,
} from '@angular/router';
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
} from 'rxjs';
import { LargerScreenPage } from './larger-screen';
import { NoticesService } from './notices';
import type { DeviceClass, ShellRouteData } from './route-data';

/** Device classes from smallest to largest. */
const RANK: Readonly<Record<DeviceClass, number>> = {
  phone: 0,
  tablet: 1,
  desktop: 2,
};

/** True when `device` is at least `min`. */
export function isAtLeast(device: DeviceClass, min: DeviceClass): boolean {
  return RANK[device] >= RANK[min];
}

/** The minimum class of a device gate, or `undefined` for any other guard. */
function gateMinimum(guard: unknown): DeviceClass | undefined {
  return typeof guard === 'function'
    ? (guard as Partial<DeviceGate>).minDeviceClass
    : undefined;
}

/** A device gate: a `canMatch` guard tagged with the class it requires. */
type DeviceGate = CanMatchFn & { readonly minDeviceClass: DeviceClass };

const BELOW_MESSAGE =
  'This view needs a larger screen. It stays open, so unsaved changes are kept.';

/**
 * The device class (`phone`, `tablet` or `desktop`) as a root signal. It is
 * built from one `observe` of the CDK's three sets, so one resize gives one
 * change. It also posts a dismissible notice when the open view needs a larger
 * class than the device has.
 */
@Injectable({ providedIn: 'root' })
export class DeviceClassService {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly notices = inject(NoticesService);

  private readonly classes = this.breakpoints
    .observe([Breakpoints.Handset, Breakpoints.Tablet, Breakpoints.Web])
    .pipe(
      map(() => this.current()),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  /** The device class now. It changes only when the class changes. */
  readonly deviceClass = toSignal(this.classes, { requireSync: true });

  constructor() {
    // The notice is recomputed on each device change and each navigation, so
    // leaving a gated view clears it. A post or clear happens only on a change.
    const navigations = this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
    );
    combineLatest([this.classes, navigations])
      .pipe(
        map(([device]) => !isAtLeast(device, this.openViewMinimum())),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((below) => {
        if (below) {
          this.notices.postBanner({
            key: 'device-class',
            message: BELOW_MESSAGE,
            dismissible: true,
          });
        } else {
          this.notices.clearBanner('device-class');
        }
      });
  }

  private current(): DeviceClass {
    if (this.breakpoints.isMatched(Breakpoints.Handset)) return 'phone';
    if (this.breakpoints.isMatched(Breakpoints.Tablet)) return 'tablet';
    return 'desktop';
  }

  /** The highest minimum of the gates on the active route chain; `phone` when none. */
  private openViewMinimum(): DeviceClass {
    let minimum: DeviceClass = 'phone';
    for (
      let node: ActivatedRouteSnapshot | null =
        this.router.routerState.snapshot.root;
      node;
      node = node.firstChild
    ) {
      for (const guard of node.routeConfig?.canMatch ?? []) {
        const min = gateMinimum(guard);
        if (min && !isAtLeast(minimum, min)) minimum = min;
      }
    }
    return minimum;
  }
}

/**
 * A `canMatch` guard that passes when the device class is at least `minClass`.
 * It never redirects: on a smaller device the route does not match, and the
 * fallback that `withDeviceGate` generates shows the page at the same URL.
 */
export function deviceClassGuard(minClass: DeviceClass): DeviceGate {
  const guard = (): boolean =>
    isAtLeast(inject(DeviceClassService).deviceClass(), minClass);
  return Object.assign(guard, { minDeviceClass: minClass });
}

/** A guard that passes only when the device class is below `minClass`. */
function deviceClassBelow(minClass: DeviceClass): CanMatchFn {
  return () => !isAtLeast(inject(DeviceClassService).deviceClass(), minClass);
}

/**
 * Applies the device gate to a route table, at any depth. A route with
 * `data.scope` gets a `deviceClassGuard` for `data.minDeviceClass` (absent
 * means `tablet`). A route whose `canMatch` already holds a device gate keeps
 * it. Every gated route gets a generated sibling after it, which shows
 * `LargerScreenPage` where the gate refuses. A route with `loadChildren` has
 * its loader wrapped, so the routes it loads are gated too. Other routes are
 * unchanged.
 */
export function withDeviceGate(routes: Routes): Routes {
  return routes.flatMap(gateRoute);
}

function gateRoute(route: Route): Route[] {
  const data = route.data as Partial<ShellRouteData> | undefined;
  const minimums: DeviceClass[] = [];
  for (const guard of route.canMatch ?? []) {
    const min = gateMinimum(guard);
    if (min) minimums.push(min);
  }

  const next: Route = { ...route };
  if (data?.scope !== undefined) {
    const min = data.minDeviceClass ?? 'tablet';
    minimums.push(min);
    next.canMatch = [...(route.canMatch ?? []), deviceClassGuard(min)];
  }
  if (route.children) next.children = withDeviceGate(route.children);
  if (route.loadChildren) next.loadChildren = wrapLoader(route.loadChildren);

  if (minimums.length === 0) return [next];
  return [next, fallbackFor(route, highest(minimums))];
}

/** The class that a set of gates needs: the largest of them. */
function highest(classes: readonly DeviceClass[]): DeviceClass {
  return classes.reduce((a, b) => (RANK[b] > RANK[a] ? b : a));
}

/**
 * The generated sibling of a gated route. It copies the path and `pathMatch`,
 * has no data, and matches only when the device is below `min`. A route with
 * children or a loader gets a `**` child, so it takes the URLs below its path;
 * a leaf route takes only its own URL.
 */
function fallbackFor(route: Route, min: DeviceClass): Route {
  const fallback: Route = { canMatch: [deviceClassBelow(min)] };
  if (route.path !== undefined) fallback.path = route.path;
  if (route.pathMatch !== undefined) fallback.pathMatch = route.pathMatch;
  if (route.children === undefined && route.loadChildren === undefined) {
    fallback.component = LargerScreenPage;
  } else {
    fallback.children = [{ path: '**', component: LargerScreenPage }];
  }
  return fallback;
}

/** Wraps a lazy loader so that the `Routes` it loads are gated as well. */
function wrapLoader(load: LoadChildren): LoadChildren {
  return async () => withDeviceGate((await load()) as Routes);
}
