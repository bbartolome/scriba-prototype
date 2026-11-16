import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import type {
  ToolOrigin,
  ToolSummary,
} from '@bbartolome/scriba-contracts/tool-registry';
import {
  catchError,
  filter,
  map,
  Observable,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import { API_CLIENT, DeviceClassService, SSE_CLIENT } from '../../shell';
import {
  TOOL_ORIGIN_ORDER,
  TOOLS_PATH,
  toolEnabledPath,
  toolListCopy,
  toolSummaryCopy,
} from './tool-copy';
import { ToolsPreviewPage } from './tools-preview';

/** The heading of each origin's group. */
const ORIGIN_LABELS: Record<ToolOrigin, string> = {
  core: 'Core',
  nonfiction: 'Nonfiction',
  fiction: 'Fiction',
  user: 'User',
};

/** One row of the list, as the template reads it. */
interface ToolRow {
  /** The selection key: the origin and the name, which is unique in the list. */
  readonly key: string;
  readonly name: string;
  readonly origin: ToolOrigin;
  readonly description: string;
  readonly valid: boolean;
  readonly enabled: boolean;
  readonly overrides: string | undefined;
  /** The error message of an unreadable file, or undefined when there is none. */
  readonly errorMessage: string | undefined;
  readonly lintText: string;
  /** False for an invalid user copy beside its built-in: the built-in is used, so the switch is not shown. */
  readonly switchable: boolean;
  readonly marker: string | undefined;
}

interface ToolGroup {
  readonly origin: ToolOrigin;
  readonly label: string;
  readonly rows: readonly ToolRow[];
}

/** The outcome of one list read: the rows, or a failure. */
type ReadResult =
  | { readonly ok: true; readonly tools: readonly ToolSummary[] }
  | { readonly ok: false };

/** The row view of one summary. */
function rowOf(tool: ToolSummary): ToolRow {
  const { name, origin, description, valid, enabled, overrides, error } = tool;
  const lintText = `${tool.lintCounts.errors} errors, ${tool.lintCounts.warnings} warnings`;
  const switchable = !(origin === 'user' && !valid && overrides !== undefined);
  let marker: string | undefined;
  if (overrides !== undefined) {
    marker = valid
      ? `Overrides the ${overrides} built-in`
      : `Invalid copy of the ${overrides} built-in`;
  }
  return {
    key: `${origin}/${name}`,
    name,
    origin,
    description,
    valid,
    enabled,
    overrides,
    errorMessage: error?.message,
    lintText,
    switchable,
    marker,
  };
}

/**
 * The Tools list (TRG-13): every tool grouped by origin, with its validity, lint counts, the "overrides
 * built-in" marker and an enable switch. A row's name opens the detail below the list, whose Preview tab
 * is the TRG-05 preview. On a phone the names are not buttons and no detail is shown. The list reads
 * again on each `catalog-changed` event, each reconcile tick and each switch answer.
 */
@Component({
  selector: 'app-tools-list',
  imports: [MatSlideToggle, ToolsPreviewPage],
  template: `
    <h1>Tools</h1>

    @if (message(); as text) {
      <p class="note">{{ text }}</p>
    }
    @if (switchFailed()) {
      <p class="note">The switch could not be saved.</p>
    }

    @for (group of groups(); track group.origin) {
      <section [attr.data-group]="group.origin">
        <h2>{{ group.label }}</h2>
        <ul>
          @for (row of group.rows; track row.key) {
            <li [attr.data-tool]="row.name" [attr.data-origin]="row.origin">
              @if (phone()) {
                <span class="name">{{ row.name }}</span>
              } @else {
                <button type="button" data-open (click)="select(row)">
                  {{ row.name }}
                </button>
              }
              <p>{{ row.description }}</p>
              <p>
                <span>{{ row.origin }}</span>
                <span>{{ row.valid ? 'Valid' : 'Invalid' }}</span>
                @if (!row.valid && row.errorMessage !== undefined) {
                  <span>{{ row.errorMessage }}</span>
                }
                <span>{{ row.lintText }}</span>
              </p>
              @if (row.marker !== undefined) {
                <p>{{ row.marker }}</p>
              }
              @if (row.switchable) {
                <mat-slide-toggle
                  [checked]="row.enabled"
                  [aria-label]="'Enabled: ' + row.name"
                  (change)="setEnabled(row, $event.checked)"
                />
              } @else {
                <p>The {{ row.overrides }} built-in is used.</p>
              }
            </li>
          }
        </ul>
      </section>
    }

    @if (!phone() && selectedList().length > 0) {
      <section aria-label="Tool detail">
        <div role="tablist">
          <button type="button" role="tab" aria-selected="true">Preview</button>
        </div>
        <div role="tabpanel">
          @for (row of selectedList(); track row.key) {
            @if (row.valid) {
              <app-tools-preview [tool]="row.name" />
            } @else {
              <p data-detail-status>
                <span>Invalid</span>
                @if (row.errorMessage !== undefined) {
                  <span>{{ row.errorMessage }}</span>
                }
                <span>{{ row.lintText }}</span>
              </p>
            }
          }
        </div>
      </section>
    }
  `,
})
export class ToolsListPage {
  private readonly api = inject(API_CLIENT);
  private readonly events = inject(SSE_CLIENT);
  private readonly device = inject(DeviceClassService);
  private readonly destroyRef = inject(DestroyRef);

  /** Each request for a read of the list; only the newest read's answer is kept. */
  private readonly reads = new Subject<void>();

  /** The rows of the last successful read. Undefined until one has answered. */
  private readonly list = signal<readonly ToolSummary[] | undefined>(undefined);
  /** True when the last read failed. */
  private readonly failed = signal(false);
  /** True when the last switch failed. */
  protected readonly switchFailed = signal(false);
  /** The key of the row whose detail is open, or undefined when none is. */
  private readonly selectedKey = signal<string | undefined>(undefined);

  /** True on a phone: the names are not buttons and no detail is shown. */
  protected readonly phone = computed(
    () => this.device.deviceClass() === 'phone',
  );

  /** The one-line state of the list: loading, failed or empty. Undefined when the rows are shown. */
  protected readonly message = computed<string | undefined>(() => {
    if (this.failed()) return 'The tools could not be read.';
    const tools = this.list();
    if (tools === undefined) return 'Loading the tools';
    return tools.length === 0 ? 'No tools.' : undefined;
  });

  /** The groups of the list, in the origin order, each with at least one row. */
  protected readonly groups = computed<readonly ToolGroup[]>(() => {
    const rows = (this.list() ?? []).map(rowOf);
    return TOOL_ORIGIN_ORDER.map((origin) => ({
      origin,
      label: ORIGIN_LABELS[origin],
      rows: rows.filter((row) => row.origin === origin),
    })).filter((group) => group.rows.length > 0);
  });

  /** The open detail: zero or one row, the row of the list whose key is selected. */
  protected readonly selectedList = computed<readonly ToolRow[]>(() => {
    const key = this.selectedKey();
    if (key === undefined) return [];
    return this.groups()
      .flatMap((group) => group.rows)
      .filter((row) => row.key === key);
  });

  constructor() {
    this.reads
      .pipe(
        switchMap(() => this.readList()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result.ok) {
          this.list.set(result.tools);
          this.failed.set(false);
        } else {
          this.failed.set(true);
        }
      });
    this.events
      .stream('tool-registry')
      .pipe(
        filter((envelope) => envelope.type === 'catalog-changed'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.refresh());
    this.events.reconcile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh());
    this.refresh();
  }

  /** Opens the detail of a row (C2: the selection is page state). */
  protected select(row: ToolRow): void {
    this.selectedKey.set(row.key);
  }

  /** Posts the author's switch for a row, then reads the list again. */
  protected setEnabled(row: ToolRow, enabled: boolean): void {
    this.api
      .post(toolEnabledPath(row.name), { enabled }, toolSummaryCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.switchFailed.set(false);
          this.refresh();
        },
        error: () => {
          this.switchFailed.set(true);
          this.refresh();
        },
      });
  }

  /** Requests a read of the list. */
  private refresh(): void {
    this.reads.next();
  }

  /** One read of the list. Its own error is caught, so the stream of reads survives it. */
  private readList(): Observable<ReadResult> {
    return this.api.get(TOOLS_PATH, toolListCopy).pipe(
      map((list): ReadResult => ({ ok: true, tools: list.tools })),
      catchError(() => of<ReadResult>({ ok: false })),
    );
  }
}
