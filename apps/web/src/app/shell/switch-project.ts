import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, EMPTY, map, switchMap, tap } from 'rxjs';
import { projectTarget, validTo } from './project-scope';
import { ShellSkeleton } from './skeleton';
import {
  ACTIVE_PROJECT_PATH,
  activeProjectCopy,
  PROJECTS_PATH,
  projectListCopy,
} from './project-store-copies';
import { API_CLIENT } from './tokens';

/**
 * The switch page, at `projects/:projectId/switch?to=<path>`. It opens when a project URL names a
 * project that is not the server's active one. The user switches to it, or goes to the active
 * project at the same child path.
 */
@Component({
  selector: 'app-switch-project',
  imports: [ShellSkeleton],
  template: `
    @if (loading()) {
      <app-skeleton />
    } @else {
      <h2>Switch to {{ title() }}?</h2>
    }
    <button type="button" (click)="switchTo()">Switch</button>
    @if (active() === null) {
      <p>No project is active.</p>
    }
    @if (active(); as activeId) {
      <button type="button" (click)="goTo(activeId)">
        Go to the active project
      </button>
    }
    @if (error(); as message) {
      <p role="alert">{{ message }}</p>
    }
  `,
})
export class SwitchProjectPage {
  private readonly api = inject(API_CLIENT);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly title = signal('');
  protected readonly active = signal<string | null | undefined>(undefined);
  protected readonly error = signal<string | undefined>(undefined);
  /** True while the project list is loading, when the heading is a skeleton. */
  protected readonly loading = signal(true);

  constructor() {
    // The router reuses this page when the URL changes within its route, so the title and the
    // active id are loaded again on each change of the id. The two reads are separate streams:
    // one failing does not stop the other.
    this.route.paramMap
      .pipe(
        map((params) => params.get('projectId') ?? ''),
        tap((projectId) => {
          this.title.set(projectId);
          this.error.set(undefined);
          this.loading.set(true);
        }),
        switchMap((projectId) =>
          this.api.get(PROJECTS_PATH, projectListCopy).pipe(
            map((list) => {
              this.loading.set(false);
              return (
                list.projects.find((entry) => entry.id === projectId)?.title ??
                projectId
              );
            }),
            catchError((error: unknown) => {
              this.loading.set(false);
              this.error.set(messageOf(error));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((title) => this.title.set(title));
    this.route.paramMap
      .pipe(
        switchMap(() =>
          this.api.get(ACTIVE_PROJECT_PATH, activeProjectCopy).pipe(
            catchError((error: unknown) => {
              this.error.set(messageOf(error));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ active }) => this.active.set(active));
  }

  protected switchTo(): void {
    const { projectId, to } = this.current();
    this.api
      .post(ACTIVE_PROJECT_PATH, { projectId }, activeProjectCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.open(projectId, to),
        error: (error: unknown) => this.error.set(messageOf(error)),
      });
  }

  protected goTo(activeId: string): void {
    this.open(activeId, this.current().to);
  }

  /** The id and the `to` of the URL as they are when a button is clicked. */
  private current(): { projectId: string; to: string } {
    const to = this.route.snapshot.queryParamMap.get('to') ?? '';
    return {
      projectId: this.route.snapshot.paramMap.get('projectId') ?? '',
      to: validTo(to) ? to : '',
    };
  }

  private open(projectId: string, to: string): void {
    void this.router.navigateByUrl(projectTarget(projectId, to), {
      replaceUrl: true,
    });
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed.';
}
