import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  type ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
} from '@angular/router';
import { filter, map } from 'rxjs';

/** The project id of the current URL, if it has one. */
export function projectIdOf(
  snapshot: ActivatedRouteSnapshot,
): string | undefined {
  for (
    let node: ActivatedRouteSnapshot | null = snapshot;
    node;
    node = node.firstChild
  ) {
    const id = node.params['projectId'];
    if (typeof id === 'string') return id;
  }
  return undefined;
}

// The base of the URL strings the Shell parses; only the path and the query are read.
const BASE = 'http://scriba.invalid';

/**
 * The part of a project URL after `projects/<id>`, as one string: the child path and the query
 * (`/chat?run=3`, or '' with no child). On the switch page it is the `to` query instead, or '' when
 * that query is not a valid `to` (see `validTo`). Any other URL gives undefined.
 */
export function remainderOf(url: string): string | undefined {
  const parsed = new URL(url, BASE);
  const segments = parsed.pathname
    .split('/')
    .filter((segment) => segment !== '');
  if (segments[0] !== 'projects' || segments.length < 2) return undefined;
  const child = segments.slice(2);
  if (child.length === 1 && child[0] === 'switch') {
    const to = parsed.searchParams.get('to');
    if (to === null) return undefined;
    return validTo(to) ? to : '';
  }
  const path = child.length === 0 ? '' : `/${child.join('/')}`;
  return path + parsed.search;
}

/**
 * Whether a `to` query is a child path or query of the project (`projectTarget` joins it to the
 * id): empty, or starting with `/` or `?`, with no `.` or `..` segment in its path. Percent-encoded
 * dots (`%2e`) count as dots.
 */
export function validTo(to: string): boolean {
  if (to === '') return true;
  if (!to.startsWith('/') && !to.startsWith('?')) return false;
  const path = to.split('?')[0] ?? '';
  return !path.split('/').some(isDotSegment);
}

function isDotSegment(segment: string): boolean {
  return /^(\.|%2e){1,2}$/i.test(segment);
}

/** The URL of a project route: the id is encoded, and the remainder follows it. */
export function projectTarget(projectId: string, remainder: string): string {
  return `/projects/${encodeURIComponent(projectId)}${remainder}`;
}

/**
 * The project id of the current URL, refreshed on each navigation. It is the URL's id, not the
 * server's active project: features that need the server's answer read GET /api/project-store/active.
 */
@Injectable({ providedIn: 'root' })
export class ActiveProjectSignal {
  private readonly router = inject(Router);

  readonly projectId = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => projectIdOf(this.router.routerState.snapshot.root)),
    ),
    { initialValue: projectIdOf(this.router.routerState.snapshot.root) },
  );
}
