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
import {
  type ApiPath,
  API_CLIENT,
  DeviceClassService,
  DiffView,
  SSE_CLIENT,
} from '../../shell';
import { UnsavedTextRegistry } from '../../shell/unsaved-text';
import {
  TOOL_ORIGIN_ORDER,
  TOOL_NAME_PATTERN,
  TOOLS_PATH,
  toolBuiltinPath,
  toolDeletePath,
  toolDeleteCopy,
  toolEnabledPath,
  toolListCopy,
  toolSourceCopy,
  toolSummaryCopy,
  toolUserPath,
  type ToolSourceView,
} from './tool-copy';
import { blankToolSource, duplicateToolSource } from './tool-template';
import { ToolEditor } from './tool-editor';
import { ToolsPreviewPage } from './tools-preview';
import { ToolsTryPanel } from './tools-try';

/** The heading of each origin's group. */
const ORIGIN_LABELS: Record<ToolOrigin, string> = {
  core: 'Core',
  nonfiction: 'Nonfiction',
  fiction: 'Fiction',
  user: 'User',
};

/** The selection key of a new tool that is not saved yet (C8). */
const DRAFT_KEY = 'draft';

const NAME_IN_USE = 'That name is in use.';
const NAME_INVALID = 'A name is lower snake case, starting with a letter.';

/**
 * The tabs of the detail. A draft shows only Source. Try is TRG-16's tab: its panel (`ToolsTryPanel`) is
 * shown only on one valid row. Both units share the one `tab` signal.
 */
type DetailTab = 'preview' | 'source' | 'compare' | 'try';

/** A new tool, or a copy, that is not saved yet. */
interface Draft {
  readonly name: string;
  readonly source: string;
}

/** The name form: a new tool, or a copy of one row. */
type NameForm =
  | { readonly kind: 'new' }
  | { readonly kind: 'duplicate'; readonly row: ToolRow };

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

/** The path of the source a row shows: its user copy for a user row, else the built-in. */
function ownPath(row: ToolRow): ApiPath {
  return row.origin === 'user'
    ? toolUserPath(row.name)
    : toolBuiltinPath(row.name);
}

/**
 * The Tools list (TRG-13, TRG-14): every tool grouped by origin, with its validity, lint counts, the
 * "overrides built-in" marker and an enable switch. A row's name opens the detail below the list. The
 * detail has a Preview tab (the TRG-05 preview), a Source tab (the YAML editor) and, for an override, a
 * Compare tab. Its actions are Customize, Duplicate, Revert to built-in and Delete; New starts a draft.
 * On a phone the names are not buttons and no detail or action is shown. The list reads again on each
 * `catalog-changed` event, each reconcile tick and each command answer.
 */
@Component({
  selector: 'app-tools-list',
  imports: [
    MatSlideToggle,
    ToolsPreviewPage,
    ToolEditor,
    DiffView,
    ToolsTryPanel,
  ],
  template: `
    <h1>Tools</h1>

    @if (!phone()) {
      <button type="button" data-new (click)="openNew()">New tool</button>
    }
    @if (form() !== undefined) {
      <div data-name-form>
        <label>Name <input data-name type="text" #nameInput /></label>
        <button type="button" data-create (click)="create(nameInput.value)">
          Create
        </button>
        @if (formMessage() !== '') {
          <p class="note">{{ formMessage() }}</p>
        }
      </div>
    }

    @if (message(); as text) {
      <p class="note">{{ text }}</p>
    }
    @if (switchFailed()) {
      <p class="note">The switch could not be saved.</p>
    }
    @if (actionFailed()) {
      <p class="note">The tool could not be deleted.</p>
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

    @if (detailOpen()) {
      <section aria-label="Tool detail">
        <div role="tablist">
          @if (draft() === undefined) {
            <button
              type="button"
              role="tab"
              data-tab="preview"
              [attr.aria-selected]="tab() === 'preview'"
              (click)="showTab('preview')"
            >
              Preview
            </button>
          }
          <button
            type="button"
            role="tab"
            data-tab="source"
            [attr.aria-selected]="tab() === 'source'"
            (click)="showTab('source')"
          >
            Source
          </button>
          @if (selectedRow(); as row) {
            @if (offersCompare(row)) {
              <button
                type="button"
                role="tab"
                data-tab="compare"
                [attr.aria-selected]="tab() === 'compare'"
                (click)="showTab('compare')"
              >
                Compare
              </button>
            }
          }
          @if (tryOffered()) {
            <button
              type="button"
              role="tab"
              data-tab="try"
              [attr.aria-selected]="tab() === 'try'"
              (click)="showTab('try')"
            >
              Try
            </button>
          }
        </div>

        @if (selectedRow(); as row) {
          <div data-actions>
            @if (canCustomize(row)) {
              <button type="button" data-customize (click)="customize()">
                Customize
              </button>
            }
            @if (row.valid) {
              <button type="button" data-duplicate (click)="openDuplicate(row)">
                Duplicate
              </button>
            }
            @if (row.origin === 'user' && row.overrides !== undefined) {
              <button type="button" data-revert (click)="remove(row)">
                Revert to built-in
              </button>
            }
            @if (row.origin === 'user' && row.overrides === undefined) {
              <button type="button" data-delete (click)="remove(row)">
                Delete
              </button>
            }
          </div>
        }

        <div role="tabpanel">
          @if (draft(); as current) {
            <app-tool-editor
              [source]="current.source"
              [label]="current.name + '.yaml'"
              [saveName]="current.name"
              [draft]="true"
              (saved)="draftSaved(current.name)"
            />
          } @else if (selectedRow(); as row) {
            @if (tab() === 'preview') {
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
            @if (tab() === 'source') {
              @if (sourceOf(row); as view) {
                <app-tool-editor
                  [source]="view.source"
                  [diagnostics]="view.lint"
                  [label]="row.name + '.yaml'"
                  [readOnly]="!editable(row)"
                  [saveName]="editable(row) ? row.name : undefined"
                  (saved)="rowSaved(row, $event)"
                />
              }
            }
            @if (tab() === 'compare') {
              @if (comparePair(row); as pair) {
                <app-diff-view
                  [path]="row.name + '.yaml'"
                  [base]="pair.base"
                  [proposed]="pair.proposed"
                />
              }
            }
            @if (tab() === 'try') {
              @if (row.valid) {
                <app-tools-try [tool]="row.name" />
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
  private readonly registry = inject(UnsavedTextRegistry);

  /** Each request for a read of the list; only the newest read's answer is kept. */
  private readonly reads = new Subject<void>();

  /** The rows of the last successful read. Undefined until one has answered. */
  private readonly list = signal<readonly ToolSummary[] | undefined>(undefined);
  /** True when the last read failed. */
  private readonly failed = signal(false);
  /** True when the last switch failed. */
  protected readonly switchFailed = signal(false);
  /** True when the last delete failed. */
  protected readonly actionFailed = signal(false);
  /** The key of the row whose detail is open, or undefined when none is. A draft has the key `draft`. */
  private readonly selectedKey = signal<string | undefined>(undefined);
  /** The selected tab of the detail. Preview is the default. */
  protected readonly tab = signal<DetailTab>('preview');
  /** The new tool being edited, or undefined when no draft is open. */
  protected readonly draft = signal<Draft | undefined>(undefined);
  /** The name form, or undefined when it is closed. */
  protected readonly form = signal<NameForm | undefined>(undefined);
  /** The refusal of the name form, or the empty text when there is none. */
  protected readonly formMessage = signal('');
  /** True while the Source tab of a built-in row is editable, after Customize. */
  protected readonly customizing = signal(false);
  /** The source of each path read so far, by path: the built-in or the user copy of a tool. */
  private readonly sources = signal<Readonly<Record<string, ToolSourceView>>>(
    {},
  );
  /** The paths with a read in flight, so a tab that is shown twice reads once. */
  private readonly loading = new Set<string>();

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

  /** Try is offered only while the detail shows one valid row: a draft is not in the list, so it has none. */
  protected readonly tryOffered = computed(() => {
    const rows = this.selectedList();
    return rows.length === 1 && rows[0].valid;
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

  /** The open row, or undefined when none is open (a draft has no row). */
  protected readonly selectedRow = computed<ToolRow | undefined>(
    () => this.selectedList()[0],
  );

  /** True when the detail shows: a row or a draft is open, and the page is not a phone. */
  protected readonly detailOpen = computed(
    () =>
      !this.phone() &&
      (this.draft() !== undefined || this.selectedRow() !== undefined),
  );

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
          this.ensureTab();
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

  /** Opens the detail of a row (C2: the selection is page state). A row opens on its Preview tab. */
  protected select(row: ToolRow): void {
    if (!this.mayDiscard()) return;
    this.openRow(row.key);
  }

  /** Shows a tab of the open detail. Leaving the Source tab with unsaved text asks first (C13). */
  protected showTab(next: DetailTab): void {
    if (next === this.tab()) return;
    if (this.tab() === 'source' && !this.mayDiscard()) return;
    this.customizing.set(false);
    this.tab.set(next);
    this.ensureTab();
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

  /** Whether the Compare tab is offered: a user row that overrides a built-in (C14). */
  protected offersCompare(row: ToolRow): boolean {
    return row.origin === 'user' && row.overrides !== undefined;
  }

  /** Whether Customize is offered: a built-in row with no user row of its name (C3). */
  protected canCustomize(row: ToolRow): boolean {
    return (
      row.origin !== 'user' &&
      !this.customizing() &&
      !this.hasUserCopy(row.name)
    );
  }

  /** Whether a row's Source tab is editable: a user row, or a built-in row after Customize. */
  protected editable(row: ToolRow): boolean {
    return row.origin === 'user' || this.customizing();
  }

  /** The source a row's Source tab shows, once it has been read. */
  protected sourceOf(row: ToolRow): ToolSourceView | undefined {
    return this.sources()[ownPath(row)];
  }

  /** The built-in and the user source of an overriding row, once both have been read. */
  protected comparePair(
    row: ToolRow,
  ): { readonly base: string; readonly proposed: string } | undefined {
    const base = this.sources()[toolBuiltinPath(row.name)];
    const proposed = this.sources()[toolUserPath(row.name)];
    if (base === undefined || proposed === undefined) return undefined;
    return { base: base.source, proposed: proposed.source };
  }

  /** Customize: the built-in's Source tab becomes editable, and saving it writes a user copy (C3). */
  protected customize(): void {
    this.customizing.set(true);
    this.tab.set('source');
    this.ensureTab();
  }

  /** Opens the name form for a new tool (D9: not on a phone, where the list has no form). */
  protected openNew(): void {
    if (!this.mayDiscard()) return;
    this.form.set({ kind: 'new' });
    this.formMessage.set('');
  }

  /** Opens the name form for a copy of a valid row (C7). */
  protected openDuplicate(row: ToolRow): void {
    if (!this.mayDiscard()) return;
    this.form.set({ kind: 'duplicate', row });
    this.formMessage.set('');
  }

  /**
   * The name form's Create: a name is refused with its message and posts nothing (C5). A new tool opens
   * the blank template (C6); a copy reads the row's own source first and opens it renamed (C7).
   */
  protected create(name: string): void {
    const current = this.form();
    if (current === undefined) return;
    if (!TOOL_NAME_PATTERN.test(name)) {
      this.formMessage.set(NAME_INVALID);
      return;
    }
    if (this.list()?.some((tool) => tool.name === name) === true) {
      this.formMessage.set(NAME_IN_USE);
      return;
    }
    if (current.kind === 'new') {
      this.openDraft(name, blankToolSource(name));
      return;
    }
    this.api
      .get(ownPath(current.row), toolSourceCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (view) =>
          this.openDraft(name, duplicateToolSource(view.source, name)),
        error: () => this.formMessage.set('The tool could not be read.'),
      });
  }

  /** A saved draft is a new user copy: the selection moves to its row and its Source tab stays (C9). */
  protected draftSaved(name: string): void {
    this.forget(toolUserPath(name));
    this.openRow(`user/${name}`, 'source');
    this.refresh();
  }

  /** A saved row: a user row keeps its selection; a built-in that was customized moves to its copy (C9). */
  protected rowSaved(row: ToolRow, result: ToolSourceView): void {
    if (row.origin === 'user') {
      this.sources.update((all) => ({
        ...all,
        [toolUserPath(row.name)]: result,
      }));
    } else {
      this.forget(toolUserPath(row.name));
      this.openRow(`user/${row.name}`, 'source');
    }
    this.refresh();
  }

  /** Revert to built-in (a user row with an override) or Delete (a user-only row), after a confirm (C4). */
  protected remove(row: ToolRow): void {
    const question =
      row.overrides === undefined
        ? `Delete ${row.name}?`
        : `Revert ${row.name} to the built-in?`;
    if (!window.confirm(question)) return;
    this.api
      .post(toolDeletePath(row.name), {}, toolDeleteCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.actionFailed.set(false);
          this.forget(toolUserPath(row.name));
          this.openRow(undefined);
          this.refresh();
        },
        error: () => this.actionFailed.set(true),
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

  /** Sets the selection to a row (or none), on the given tab, and drops any draft or form. */
  private openRow(key: string | undefined, tab: DetailTab = 'preview'): void {
    this.draft.set(undefined);
    this.form.set(undefined);
    this.formMessage.set('');
    this.customizing.set(false);
    this.tab.set(tab);
    this.selectedKey.set(key);
    this.ensureTab();
  }

  /** Opens a draft in the detail on its Source tab (C8). */
  private openDraft(name: string, source: string): void {
    this.draft.set({ name, source });
    this.selectedKey.set(DRAFT_KEY);
    this.form.set(undefined);
    this.formMessage.set('');
    this.customizing.set(false);
    this.tab.set('source');
  }

  /**
   * The author may leave the open editor only if it has no unsaved text, or confirms the discard
   * (C13). The name in the question is the open draft's or row's.
   */
  private mayDiscard(): boolean {
    if (this.registry.unsaved().length === 0) return true;
    const name = this.draft()?.name ?? this.selectedRow()?.name ?? '';
    return window.confirm(`Discard the unsaved text of ${name}?`);
  }

  private hasUserCopy(name: string): boolean {
    return (
      this.list()?.some(
        (tool) => tool.origin === 'user' && tool.name === name,
      ) === true
    );
  }

  /** Reads what the open tab needs (C2): the Source tab its own source, the Compare tab both. */
  private ensureTab(): void {
    const row = this.selectedRow();
    if (row === undefined) return;
    if (this.tab() === 'source') {
      this.loadSource(ownPath(row));
    }
    if (this.tab() === 'compare') {
      this.loadSource(toolBuiltinPath(row.name));
      this.loadSource(toolUserPath(row.name));
    }
  }

  private loadSource(path: ApiPath): void {
    if (this.loading.has(path) || this.sources()[path] !== undefined) return;
    this.loading.add(path);
    this.api
      .get(path, toolSourceCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (view) => {
          this.loading.delete(path);
          this.sources.update((all) => ({ ...all, [path]: view }));
        },
        error: () => this.loading.delete(path),
      });
  }

  /** Drops the read source of one path, so the next read gets the saved text. */
  private forget(path: ApiPath): void {
    this.sources.update((all) =>
      Object.fromEntries(Object.entries(all).filter(([key]) => key !== path)),
    );
  }
}
