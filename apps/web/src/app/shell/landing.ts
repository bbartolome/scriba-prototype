import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { type Observable } from 'rxjs';
import { loadSetupStatusContract } from './contract-chunks';
import { ACTIVE_PROJECT_PATH, activeProjectCopy } from './project-store-copies';
import { healthzCopy, VERSION_PATH, versionInfoCopy } from './platform-copies';
import { ShellSkeleton } from './skeleton';
import { HEALTHZ_PATH } from './sse-envelope';
import { API_CLIENT } from './tokens';

/**
 * The landing page at `/`. It sends the user to setup while setup is incomplete, and otherwise to
 * the active project's chat, or to the project list when no project is active. It shows the
 * platform version and health while it loads.
 */
@Component({
  selector: 'app-landing',
  imports: [ShellSkeleton],
  // The label, the value and the skeleton stay on one line with no whitespace between them, so the
  // loaded text reads "Platform version: 1.2.3"; prettier must not re-wrap them.
  // prettier-ignore
  template: `
    <p>Platform version: @if (version(); as value) {{{ value }}} @else {<app-skeleton />}</p>
    <p>Health: @if (health(); as value) {{{ value }}} @else {<app-skeleton />}</p>
    @if (error(); as message) {
      <p role="alert">{{ message }}</p>
    }
  `,
})
export class LandingPage {
  private readonly api = inject(API_CLIENT);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly version = signal<string | undefined>(undefined);
  protected readonly health = signal<string | undefined>(undefined);
  protected readonly error = signal<string | undefined>(undefined);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const contract = await loadSetupStatusContract();
      this.read(this.api.get(VERSION_PATH, versionInfoCopy), (info) =>
        this.version.set(info.version),
      );
      this.read(this.api.get(HEALTHZ_PATH, healthzCopy), (health) =>
        this.health.set(health.status),
      );
      this.read(
        this.api.get(contract.SETUP_STATUS_ROUTE, contract.setupStatusSchema),
        (status) => {
          if (status.complete) {
            this.toActiveProject();
          } else {
            void this.router.navigateByUrl('/setup', { replaceUrl: true });
          }
        },
      );
    } catch (error: unknown) {
      this.error.set(messageOf(error));
    }
  }

  private toActiveProject(): void {
    this.read(
      this.api.get(ACTIVE_PROJECT_PATH, activeProjectCopy),
      ({ active }) => {
        const target =
          active === null
            ? '/projects'
            : `/projects/${encodeURIComponent(active)}/chat`;
        void this.router.navigateByUrl(target, { replaceUrl: true });
      },
    );
  }

  /** Delivers a read's value; a failed read shows its message and leaves the page as it is. */
  private read<T>(source: Observable<T>, onValue: (value: T) => void): void {
    source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: onValue,
      error: (error: unknown) => this.error.set(messageOf(error)),
    });
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed.';
}
