import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { GroundingClaim } from '@bbartolome/scriba-contracts/agent-loop';
import { ActiveProjectSignal, DeviceClassService } from '../../shell';
import { type ChatGrounding, summaryText, verdictView } from './chat-state';

let lastClaimsId = 0;

function nextClaimsId(): number {
  lastClaimsId += 1;
  return lastClaimsId;
}

/**
 * The grounding chip of one target file (unit line 18): a summary button, and under it the claim list
 * with a verdict badge, the claim text, the cited passage and a link to its file. The list is shown
 * when the chip is expanded; on a phone the chip starts collapsed (D6). It sits outside the card.
 */
@Component({
  selector: 'app-grounding-chip',
  imports: [MatIcon, RouterLink],
  styles: `
    :host {
      display: block;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 44px;
      padding: 0 0.875rem;
      border: 1px solid var(--mat-sys-outline);
      border-radius: 999px;
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface);
      font: inherit;
      cursor: pointer;
      overflow-wrap: anywhere;
    }
    .chip::after {
      content: '\\25B8';
    }
    .chip[aria-expanded='true']::after {
      content: '\\25BE';
    }
    .claims {
      display: grid;
      gap: 0.5rem;
      margin: 0.5rem 0 0;
      padding: 0;
      list-style: none;
    }
    .claim {
      display: grid;
      gap: 0.25rem;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      background: var(--mat-sys-surface-container-low);
      overflow-wrap: anywhere;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      width: fit-content;
      padding: 0.125rem 0.5rem;
      border-radius: 999px;
    }
    .badge[data-verdict='supported'] {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    .badge[data-verdict='weak'] {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    .badge[data-verdict='unsupported'] {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
    .text,
    .snippet,
    .none {
      margin: 0;
    }
    .snippet,
    .none {
      color: var(--mat-sys-on-surface-variant);
    }
    .link {
      display: inline-block;
      min-height: 44px;
      overflow-wrap: anywhere;
    }
  `,
  template: `
    <button
      type="button"
      class="chip"
      [attr.aria-expanded]="expanded()"
      [attr.aria-controls]="listId"
      (click)="toggle()"
    >
      <span class="summary">{{ summary() }}</span>
    </button>
    @if (expanded()) {
      <ul class="claims" [id]="listId">
        @for (claim of claims(); track $index) {
          <li class="claim">
            <span class="badge" [attr.data-verdict]="claim.verdict">
              <mat-icon aria-hidden="true">{{
                viewOf(claim.verdict).icon
              }}</mat-icon>
              <span class="label">{{ viewOf(claim.verdict).label }}</span>
            </span>
            <p class="text">{{ claim.text }}</p>
            @if (claim.passage; as passage) {
              <p class="snippet">{{ passage.snippet }}</p>
              @if (projectId(); as id) {
                <a
                  class="link"
                  [routerLink]="['/projects', id, 'files']"
                  [queryParams]="{ path: passage.path }"
                  >{{ passage.path }}</a
                >
              } @else {
                <span>{{ passage.path }}</span>
              }
            } @else {
              <p class="none">No source passage cited.</p>
            }
          </li>
        }
      </ul>
    }
  `,
})
export class GroundingChip {
  /** The turn's entry for one target file. A host passes a new object on each change to it. */
  readonly entry = input.required<ChatGrounding>();

  private readonly devices = inject(DeviceClassService);
  protected readonly projectId = inject(ActiveProjectSignal).projectId;

  /** Collapsed on a phone and expanded on other devices (D6); tapping the chip changes it. */
  private readonly defaultExpanded = computed(
    () => this.devices.deviceClass() !== 'phone',
  );

  /** The state of the list. It resets only when the default's value changes (as the card's does). */
  protected readonly expanded = linkedSignal({
    source: this.defaultExpanded,
    computation: (value: boolean) => value,
  });

  protected readonly listId = `grounding-claims-${nextClaimsId()}`;
  protected readonly summary = computed(() => summaryText(this.entry()));
  protected readonly claims = computed<readonly GroundingClaim[]>(
    () => this.entry().result?.claims ?? [],
  );
  protected readonly viewOf = verdictView;

  protected toggle(): void {
    this.expanded.update((open) => !open);
  }
}
