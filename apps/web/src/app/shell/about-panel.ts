import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type Observable } from 'rxjs';
import { healthzCopy, VERSION_PATH, versionInfoCopy } from './platform-copies';
import { ShellSkeleton } from './skeleton';
import { HEALTHZ_PATH } from './sse-envelope';
import { API_CLIENT } from './tokens';

/**
 * The About panel: the app version and revision from Platform's version info, the health from
 * `/healthz`, and the keyboard shortcuts. Each value shows a skeleton until its read answers. A
 * failed read shows its message; the other read is unaffected.
 */
@Component({
  selector: 'app-about-panel',
  imports: [ShellSkeleton],
  styles: `
    dl {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      gap: 4px 16px;
      margin: 0;
    }

    dt {
      font-weight: 600;
    }

    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
  `,
  template: `
    <section aria-labelledby="about-heading">
      <h3 id="about-heading">About Scriba</h3>
      <dl>
        <dt>Version</dt>
        <dd>
          @if (version(); as value) {
            {{ value }}
          } @else {
            <app-skeleton />
          }
        </dd>
        <dt>Revision</dt>
        <dd>
          @if (revision(); as value) {
            {{ value }}
          } @else {
            <app-skeleton />
          }
        </dd>
        <dt>Health</dt>
        <dd>
          @if (health(); as value) {
            {{ value }}
          } @else {
            <app-skeleton />
          }
        </dd>
      </dl>
      <h4>Keyboard shortcuts</h4>
      <ul>
        <li>Alt+[ and Alt+]: previous and next nav entry (Option on a Mac)</li>
        <li>Ctrl+S (Cmd+S on a Mac) in the editor: save now</li>
      </ul>
      @if (error(); as message) {
        <p role="alert">{{ message }}</p>
      }
    </section>
  `,
})
export class AboutPanel {
  private readonly api = inject(API_CLIENT);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly version = signal<string | undefined>(undefined);
  protected readonly revision = signal<string | undefined>(undefined);
  protected readonly health = signal<string | undefined>(undefined);
  protected readonly error = signal<string | undefined>(undefined);

  constructor() {
    this.read(this.api.get(VERSION_PATH, versionInfoCopy), (info) => {
      this.version.set(info.version);
      this.revision.set(info.revision);
    });
    this.read(this.api.get(HEALTHZ_PATH, healthzCopy), (health) =>
      this.health.set(health.status),
    );
  }

  /** Delivers a read's value; a failed read shows its message and leaves the other value as it is. */
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
