import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { DeviceClassService } from './device-class';
import { MarkdownPreview } from './markdown-preview';
import { ActiveProjectSignal } from './project-scope';
import type { ToolCallStatus, ToolCallView } from './tool-call-view';

/** One row of a key/value tree: its text, and the rows nested under it. */
interface TreeRow {
  readonly text: string;
  readonly children: readonly TreeRow[];
}

/**
 * The depth at which an object or an array stops expanding. A row at this depth whose value is a
 * container shows an ellipsis instead of its children, so a deep or self-referencing value ends.
 */
const ELLIPSIS_DEPTH = 8;

/** The status word and the icon that the header shows for each status. */
const STATUS: Readonly<
  Record<ToolCallStatus, { readonly word: string; readonly icon: string }>
> = {
  pending: { word: 'Pending', icon: 'schedule' },
  running: { word: 'Running', icon: 'autorenew' },
  done: { word: 'Done', icon: 'check_circle' },
  error: { word: 'Error', icon: 'error' },
};

let lastBodyId = 0;

/** A new id for a card's body, unique in the page. */
function nextBodyId(): number {
  lastBodyId += 1;
  return lastBodyId;
}

function isContainer(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function leafText(value: unknown): string {
  return typeof value === 'string' ? value : String(value);
}

/** The rows of a container's entries, at one depth. Array entries are keyed by their index. */
function entryRows(container: object, depth: number): TreeRow[] {
  return Object.entries(container).map(([key, value]): TreeRow => {
    if (!isContainer(value)) {
      return { text: `${key}: ${leafText(value)}`, children: [] };
    }
    if (depth >= ELLIPSIS_DEPTH) {
      return { text: `${key}: …`, children: [] };
    }
    return { text: `${key}:`, children: entryRows(value, depth + 1) };
  });
}

/** The rows that show a value: its entries when it is an object or an array, else one row. */
function treeOf(value: unknown): readonly TreeRow[] {
  return isContainer(value)
    ? entryRows(value, 0)
    : [{ text: leafText(value), children: [] }];
}

/**
 * One tool call: its name, status, an optional one-line summary, and a body with the arguments,
 * the output, the error, the sources and any projected content. It is presentational: the host
 * maps its events onto a `ToolCallView`.
 */
@Component({
  imports: [MarkdownPreview, MatIcon, NgTemplateOutlet, RouterLink],
  selector: 'app-tool-call-card',
  styles: `
    :host {
      display: block;
    }
    .card {
      margin-block: 0.5rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 0.75rem;
      background: var(--mat-sys-surface-container-low);
      color: var(--mat-sys-on-surface);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      min-height: 44px;
      padding: 0.5rem 0.75rem;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .name {
      font-family: monospace;
      overflow-wrap: anywhere;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      white-space: nowrap;
    }
    .status mat-icon {
      width: 1.1rem;
      height: 1.1rem;
      font-size: 1.1rem;
    }
    .status[data-status='error'] {
      color: var(--mat-sys-error);
    }
    .summary {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      color: var(--mat-sys-on-surface-variant);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .body {
      display: grid;
      gap: 0.75rem;
      padding: 0 0.75rem 0.75rem;
    }
    section {
      min-width: 0;
    }
    h3 {
      margin: 0 0 0.25rem;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
    }
    ul {
      margin: 0;
      padding-inline-start: 1.25rem;
      overflow-wrap: anywhere;
    }
    .output {
      max-height: 20rem;
      overflow: auto;
    }
    .error {
      margin: 0;
      overflow-wrap: anywhere;
    }
  `,
  template: `
    <article class="card" [attr.aria-label]="'Tool call: ' + call().name">
      <button
        type="button"
        class="header"
        [attr.aria-expanded]="!collapsed()"
        [attr.aria-controls]="bodyId"
        (click)="toggle()"
      >
        <span class="name">{{ call().name }}</span>
        <span class="status" [attr.data-status]="call().status">
          <mat-icon aria-hidden="true">{{ status().icon }}</mat-icon>
          {{ status().word }}
        </span>
        @if (call().summary; as summary) {
          <span class="summary">{{ summary }}</span>
        }
      </button>
      @if (!collapsed()) {
        <div class="body" [id]="bodyId">
          @if (call().arguments !== undefined) {
            <section aria-label="Arguments">
              <h3>Arguments</h3>
              <ng-container
                [ngTemplateOutlet]="tree"
                [ngTemplateOutletContext]="{ $implicit: argumentRows() }"
              />
            </section>
          }
          @if (call().output; as output) {
            <section class="output" aria-label="Output" tabindex="0">
              <h3>Output</h3>
              @if (output.kind === 'markdown') {
                <app-markdown-preview [content]="output.text" />
              } @else {
                <ng-container
                  [ngTemplateOutlet]="tree"
                  [ngTemplateOutletContext]="{ $implicit: outputRows() }"
                />
              }
            </section>
          }
          @if (call().error !== undefined) {
            <section aria-label="Error">
              <h3>Error</h3>
              <p class="error">{{ call().error }}</p>
            </section>
          }
          @if (sources().length > 0) {
            <section aria-label="Sources">
              <h3>Sources</h3>
              <ul>
                @for (path of sources(); track $index) {
                  <li>
                    @if (projectId(); as id) {
                      <a
                        [routerLink]="['/projects', id, 'files']"
                        [queryParams]="{ path: path }"
                        >{{ path }}</a
                      >
                    } @else {
                      {{ path }}
                    }
                  </li>
                }
              </ul>
            </section>
          }
          <ng-content />
        </div>
      }
    </article>

    <ng-template #tree let-rows>
      <ul>
        @for (row of rows; track $index) {
          <li>
            {{ row.text }}
            @if (row.children.length > 0) {
              <ng-container
                [ngTemplateOutlet]="tree"
                [ngTemplateOutletContext]="{ $implicit: row.children }"
              />
            }
          </li>
        }
      </ul>
    </ng-template>
  `,
})
export class ToolCallCard {
  /** The call to show. A host passes a new object on each change to the call. */
  readonly call = input.required<ToolCallView>();

  private readonly devices = inject(DeviceClassService);
  protected readonly projectId = inject(ActiveProjectSignal).projectId;

  /** The default: an explicit flag wins, otherwise a phone collapses and other devices expand. */
  private readonly defaultCollapsed = computed(
    () => this.call().collapsed ?? this.devices.deviceClass() === 'phone',
  );

  /**
   * The state of the body. It starts at the default and resets only when the default's value
   * changes, so a status update keeps the state the reader set by tapping the header.
   */
  protected readonly collapsed = linkedSignal({
    source: this.defaultCollapsed,
    computation: (value: boolean) => value,
  });

  protected readonly bodyId = `tool-call-body-${nextBodyId()}`;
  protected readonly status = computed(() => STATUS[this.call().status]);
  protected readonly sources = computed(() => this.call().sources ?? []);
  protected readonly argumentRows = computed(() =>
    treeOf(this.call().arguments),
  );
  protected readonly outputRows = computed(() => {
    const output = this.call().output;
    return output?.kind === 'json' ? treeOf(output.value) : [];
  });

  /** Opens or closes the body. */
  protected toggle(): void {
    this.collapsed.update((value) => !value);
  }
}
