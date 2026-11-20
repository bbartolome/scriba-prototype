import { Component, computed, input } from '@angular/core';

/**
 * A loading placeholder: one pulsing bar per line. It is announced once as "Loading" and the bars
 * are hidden from assistive technology. The pulse runs only when the user allows motion.
 */
@Component({
  selector: 'app-skeleton',
  styles: `
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
      padding: 0;
    }

    .bar {
      display: block;
      height: 0.9em;
      width: 6em;
      max-width: 100%;
      margin: 0.25em 0;
      border-radius: 4px;
      background: var(--mat-sys-surface-container-highest);
    }

    @media (prefers-reduced-motion: no-preference) {
      .bar {
        animation: shell-skeleton-pulse 1.5s ease-in-out infinite;
      }

      @keyframes shell-skeleton-pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
    }
  `,
  template: `
    <span role="status">
      <span class="visually-hidden">Loading</span>
      @for (line of bars(); track $index) {
        <span class="bar" aria-hidden="true"></span>
      }
    </span>
  `,
})
export class ShellSkeleton {
  /** The number of bars. */
  readonly lines = input(1);

  protected readonly bars = computed(() =>
    Array.from({ length: this.lines() }, (_, index) => index),
  );
}
