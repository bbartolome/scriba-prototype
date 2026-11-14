import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { projectTarget } from './project-scope';
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
  template: `
    <h2>Switch to {{ title() }}?</h2>
    <button type="button" (click)="switchTo()">Switch</button>
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

  // Read once, when the page opens: the id of the URL, and the path to return to (`to`).
  private readonly projectId =
    this.route.snapshot.paramMap.get('projectId') ?? '';
  private readonly to = this.route.snapshot.queryParamMap.get('to') ?? '';

  protected readonly title = signal(this.projectId);
  protected readonly active = signal<string | null | undefined>(undefined);
  protected readonly error = signal<string | undefined>(undefined);

  constructor() {
    this.api
      .get(PROJECTS_PATH, projectListCopy)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (list) =>
          this.title.set(
            list.projects.find((entry) => entry.id === this.projectId)?.title ??
              this.projectId,
          ),
        error: (error: unknown) => this.error.set(messageOf(error)),
      });
    this.api
      .get(ACTIVE_PROJECT_PATH, activeProjectCopy)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ({ active }) => this.active.set(active),
        error: (error: unknown) => this.error.set(messageOf(error)),
      });
  }

  protected switchTo(): void {
    this.api
      .post(
        ACTIVE_PROJECT_PATH,
        { projectId: this.projectId },
        activeProjectCopy,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.open(this.projectId),
        error: (error: unknown) => this.error.set(messageOf(error)),
      });
  }

  protected goTo(activeId: string): void {
    this.open(activeId);
  }

  private open(projectId: string): void {
    void this.router.navigateByUrl(projectTarget(projectId, this.to), {
      replaceUrl: true,
    });
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed.';
}
