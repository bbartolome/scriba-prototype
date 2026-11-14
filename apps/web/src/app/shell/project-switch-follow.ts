import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { projectTarget, remainderOf } from './project-scope';
import { SSE_CLIENT } from './tokens';

// Hand-written check of the project-switched data (`projectSwitchedDataSchema` in events.ts).
// project-switch-follow.spec.ts (E5) checks it against the contract.
export function isProjectSwitchedData(
  value: unknown,
): value is { from: string | null; to: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const { from, to } = value as Record<string, unknown>;
  const fromOk = from === null || (typeof from === 'string' && from !== '');
  return fromOk && typeof to === 'string' && to !== '';
}

/**
 * Moves the tabs on project routes when the server switches the active project. A
 * `project-switched` event sends a project tab to the same child path under the new id. Tabs on
 * other routes stay where they are.
 */
@Injectable({ providedIn: 'root' })
export class ProjectSwitchFollow {
  private readonly router = inject(Router);
  private readonly events = inject(SSE_CLIENT);

  constructor() {
    this.events
      .stream('project-store')
      .pipe(takeUntilDestroyed())
      .subscribe((envelope) => {
        if (
          envelope.type !== 'project-switched' ||
          !isProjectSwitchedData(envelope.data)
        ) {
          return;
        }
        const remainder = remainderOf(this.router.url);
        if (remainder === undefined) {
          return;
        }
        void this.router.navigateByUrl(
          projectTarget(envelope.data.to, remainder),
          { replaceUrl: true },
        );
      });
  }
}
