import {
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import type {
  PendingChange,
  PendingGrounding,
} from '@bbartolome/scriba-contracts/project-store';
import {
  catchError,
  EMPTY,
  filter,
  map,
  type Observable,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import {
  ActiveProjectSignal,
  API_CLIENT,
  ApiError,
  DiffView,
  SSE_CLIENT,
} from '../../shell';
import {
  type UnsavedSource,
  UnsavedTextRegistry,
} from '../../shell/unsaved-text';
import {
  pendingActionPath,
  type PendingAction,
  pendingChangeCopy,
  pendingEventCopy,
  pendingListCopy,
  pendingListPath,
} from './review-contract';

/** One origin group of the list: an agent run, or one output node of a recipe run. */
interface Group {
  readonly key: string;
  readonly heading: string;
  readonly changes: readonly PendingChange[];
}

/** A line shown in a change's panel: a status (the author's edit was dropped) or an alert (an action failed). */
interface Notice {
  readonly tone: 'status' | 'alert';
  readonly text: string;
}

const DISCARDED = 'The proposal changed, so your edit was discarded.';

const CONFLICT_MESSAGES: Record<string, string> = {
  'base-changed': 'The file changed after this change was proposed.',
  'target-missing': 'The file this change would edit is missing.',
  'target-exists': 'A file already exists at this path.',
};

const ACCEPT_ANYWAY_TEXT =
  'The file on disk is saved first: as a version for a top-level draft, otherwise as a backup under .scriba/backups/.';

function failureMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'The request failed.';
}

function outcomeOf<T>(
  source: Observable<T>,
): Observable<{ ok: true; value: T } | { ok: false; message: string }> {
  return source.pipe(
    map((value) => ({ ok: true as const, value })),
    catchError((error: unknown) =>
      of({ ok: false as const, message: failureMessage(error) }),
    ),
  );
}

/** The origin group key and heading of one change (agent run, or recipe run and output node). */
function groupOf(change: PendingChange): { key: string; heading: string } {
  const origin = change.origin;
  return origin.kind === 'agent-run'
    ? {
        key: `agent-run:${origin.runId}`,
        heading: `Agent run ${origin.runId}`,
      }
    : {
        key: `recipe-run:${origin.runId}:${origin.nodeId}`,
        heading: `Recipe run ${origin.runId}, output ${origin.nodeId}`,
      };
}

function groundingSummary(grounding: PendingGrounding): string {
  return `${grounding.supported} supported · ${grounding.weak} weak · ${grounding.unsupported} unsupported`;
}

/** The strings of a provenance list; a value that is not an array, or an item that is not a string, is dropped. */
function stringsOf(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/**
 * The open pending changes of the active project at `/projects/:projectId/review`, grouped by origin,
 * with `?run=` limiting them to one run. Each change opens in the Shell's diff view, which is editable:
 * the edited text is sent as `content` on accept. Live events keep the list current.
 */
@Component({
  imports: [DiffView],
  selector: 'app-review-page',
  styles: `
    :host {
      display: block;
      padding: 16px;
      overflow-wrap: anywhere;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      padding: 12px 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .badge {
      padding: 2px 8px;
      border-radius: 8px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }

    .provenance,
    .grounding {
      margin: 4px 0;
      color: var(--mat-sys-on-surface-variant);
    }

    button {
      min-height: 48px;
      min-width: 48px;
      padding: 0 16px;
      font: inherit;
    }

    .panel {
      display: grid;
      gap: 12px;
      margin-top: 12px;
    }

    .actions {
      position: sticky;
      bottom: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 0;
      background: var(--mat-sys-surface);
    }

    .alert {
      color: var(--mat-sys-error);
    }
  `,
  template: `
    <h2>Review</h2>
    @if (listFailure(); as message) {
      <div role="alert">
        <p>Could not load the open changes.</p>
        <p>{{ message }}</p>
      </div>
    } @else {
      @for (group of groups(); track group.key) {
        <section>
          <h3>{{ group.heading }}</h3>
          <ul>
            @for (change of group.changes; track change.id) {
              <li>
                <div class="row">
                  <code>{{ change.targetPath }}</code>
                  @if (change.conflict !== null) {
                    <span class="badge">Conflict</span>
                  }
                  <button
                    type="button"
                    [attr.aria-expanded]="isOpen(change.id)"
                    (click)="toggle(change.id)"
                  >
                    Open
                  </button>
                </div>
                @if (change.grounding; as grounding) {
                  <p class="grounding">
                    <span>{{ groundingSummary(grounding) }}</span>
                    <time [attr.datetime]="grounding.checkedAt">{{
                      grounding.checkedAt
                    }}</time>
                    @if (grounding.unsupported > 0) {
                      <span class="badge">Unsupported claims</span>
                    }
                  </p>
                }
                @if (entitiesOf(change).length > 0) {
                  <p class="provenance">
                    Entities: {{ entitiesOf(change).join(', ') }}
                  </p>
                }
                @if (sourcesOf(change).length > 0) {
                  <p class="provenance">
                    Sources: {{ sourcesOf(change).join(', ') }}
                  </p>
                }
                @if (isOpen(change.id)) {
                  <div class="panel" [id]="panelId(change.id)">
                    @if (notices().get(change.id); as notice) {
                      <p
                        [attr.role]="notice.tone"
                        [class.alert]="notice.tone === 'alert'"
                      >
                        {{ notice.text }}
                      </p>
                    }
                    <app-diff-view
                      [path]="change.targetPath"
                      [base]="baseOf(change)"
                      [proposed]="proposedOf(change)"
                      [conflict]="change.conflict !== null"
                      [conflictMessage]="conflictMessage(change)"
                      [editable]="true"
                      (contentChange)="onEdit(change.id, $event)"
                      (focusout)="commit(change.id)"
                      (click)="onDiffClick(change.id, $event)"
                    />
                    @if (confirming() === change.id) {
                      <div
                        role="alertdialog"
                        [attr.aria-labelledby]="headingId(change.id)"
                      >
                        <h4 [id]="headingId(change.id)">Accept anyway?</h4>
                        <p>{{ acceptAnywayText }}</p>
                        <button
                          type="button"
                          #cancelButton
                          (click)="cancelAcceptAnyway()"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          [disabled]="isBusy(change.id)"
                          (click)="
                            send(change, 'accept-anyway', editBody(change.id))
                          "
                        >
                          Confirm accept anyway
                        </button>
                      </div>
                    }
                    <div class="actions">
                      <button
                        type="button"
                        [disabled]="isBusy(change.id)"
                        (click)="send(change, 'accept', editBody(change.id))"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        [disabled]="isBusy(change.id)"
                        (click)="send(change, 'reject', undefined)"
                      >
                        Reject
                      </button>
                      @if (change.conflict !== null) {
                        <button
                          type="button"
                          [disabled]="isBusy(change.id)"
                          (click)="send(change, 'refresh', undefined)"
                        >
                          Refresh
                        </button>
                        <button
                          type="button"
                          [disabled]="isBusy(change.id)"
                          (click)="askAcceptAnyway(change.id)"
                        >
                          Accept anyway
                        </button>
                      }
                    </div>
                  </div>
                }
              </li>
            }
          </ul>
        </section>
      } @empty {
        @if (loaded()) {
          <p>
            {{
              run() === undefined
                ? 'No open changes.'
                : 'No open changes from this run.'
            }}
          </p>
        }
      }
    }
  `,
})
export class ReviewPage {
  private readonly api = inject(API_CLIENT);
  private readonly events = inject(SSE_CLIENT);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectId = inject(ActiveProjectSignal).projectId;

  /** The `run` query parameter: limits the list to the changes one run proposed. */
  protected readonly run = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => params.get('run') ?? undefined),
    ),
    { initialValue: this.route.snapshot.queryParamMap.get('run') ?? undefined },
  );

  /** The project and run the view was last loaded for. A change of either starts the view again. */
  private readonly scopeKey = computed(
    () => `${this.projectId() ?? ''}\u0000${this.run() ?? ''}`,
  );
  private loadedKey = this.scopeKey();

  protected readonly changes = signal<readonly PendingChange[]>([]);
  protected readonly listFailure = signal<string | undefined>(undefined);
  protected readonly loaded = signal(false);

  /** The open change, whose panel shows. One at a time. */
  protected readonly selected = signal<string | undefined>(undefined);
  /** The change whose accept-anyway panel is open. */
  protected readonly confirming = signal<string | undefined>(undefined);
  /** The changes with a command in flight: their buttons are disabled. */
  private readonly busy = signal<ReadonlySet<string>>(new Set());
  protected readonly notices = signal<ReadonlyMap<string, Notice>>(new Map());

  /** The latest text the editor emitted, per change: the text Accept sends. */
  private readonly held = new Map<string, string>();
  /** The text the diff view shows, per change: committed from `held` on focus loss, a click or a close. */
  protected readonly committed = signal<ReadonlyMap<string, string>>(new Map());

  protected readonly acceptAnywayText = ACCEPT_ANYWAY_TEXT;
  protected readonly groundingSummary = groundingSummary;

  protected readonly groups = computed<Group[]>(() => {
    const groups = new Map<
      string,
      { heading: string; changes: PendingChange[] }
    >();
    for (const change of this.changes()) {
      const { key, heading } = groupOf(change);
      const group = groups.get(key) ?? { heading, changes: [] };
      group.changes.push(change);
      groups.set(key, group);
    }
    return [...groups].map(([key, group]) => ({ key, ...group }));
  });

  private readonly cancelButtons =
    viewChildren<ElementRef<HTMLButtonElement>>('cancelButton');
  private focusedFor: string | undefined;

  private readonly listReads = new Subject<void>();

  private readonly unsavedSource: UnsavedSource = {
    hasUnsavedText: () => this.held.size > 0,
    // Only Accept saves an edit, so leaving the page asks the author instead of saving.
    flush: () => of(false),
  };

  constructor() {
    // The page is an editor with unsaved text while a change holds an edit (C13).
    const unregister = inject(UnsavedTextRegistry).register(this.unsavedSource);
    this.destroyRef.onDestroy(unregister);

    // Only the answer to the newest read is shown: switchMap cancels the one before it.
    this.listReads
      .pipe(
        switchMap(() => {
          const project = this.projectId();
          const run = this.run();
          if (project === undefined) return EMPTY;
          const params = run === undefined ? undefined : { run };
          return outcomeOf(
            this.api.get(pendingListPath(project), pendingListCopy, params),
          ).pipe(map((result) => ({ project, run, result })));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ project, run, result }) => {
        if (project !== this.projectId() || run !== this.run()) return;
        if (result.ok) {
          this.replaceAll(result.value.changes);
          this.listFailure.set(undefined);
          this.loaded.set(true);
        } else {
          this.listFailure.set(result.message);
        }
      });

    this.events
      .stream('project-store')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((envelope) => {
        const type = envelope.type;
        if (
          type !== 'pending-created' &&
          type !== 'pending-updated' &&
          type !== 'pending-resolved'
        ) {
          return;
        }
        const parsed = pendingEventCopy.safeParse(envelope.data);
        if (!parsed.success) return;
        const change = parsed.data.pendingChange;
        if (type === 'pending-resolved') {
          this.remove(change.id);
        } else if (this.inScope(parsed.data.projectId, change)) {
          this.apply(change);
        }
      });

    this.events.reconcile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.listReads.next());

    // A project switch or a change of `?run=` reuses this page: the view starts again.
    toObservable(this.scopeKey)
      .pipe(
        filter((key) => key !== this.loadedKey),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((key) => {
        this.loadedKey = key;
        this.reset();
      });

    // Opening a panel's diff focuses Cancel of the accept-anyway panel, once per request.
    afterRenderEffect(() => {
      const id = this.confirming();
      if (id === undefined) {
        this.focusedFor = undefined;
        return;
      }
      if (id === this.focusedFor) return;
      this.focusedFor = id;
      this.cancelButtons()[0]?.nativeElement.focus();
    });

    this.listReads.next();
  }

  protected isOpen(id: string): boolean {
    return this.selected() === id;
  }

  protected isBusy(id: string): boolean {
    return this.busy().has(id);
  }

  protected panelId(id: string): string {
    return `review-panel-${id}`;
  }

  protected headingId(id: string): string {
    return `review-accept-anyway-${id}`;
  }

  protected baseOf(change: PendingChange): string {
    return change.capturedBase?.content ?? '';
  }

  protected proposedOf(change: PendingChange): string {
    return this.committed().get(change.id) ?? change.proposed;
  }

  protected conflictMessage(change: PendingChange): string | undefined {
    return change.conflict === null
      ? undefined
      : CONFLICT_MESSAGES[change.conflict.reason];
  }

  protected entitiesOf(change: PendingChange): string[] {
    return stringsOf(change.provenance?.['entityIds']);
  }

  protected sourcesOf(change: PendingChange): string[] {
    return stringsOf(change.provenance?.['sourcesUsed']);
  }

  protected toggle(id: string): void {
    if (this.selected() === id) {
      this.close();
      return;
    }
    this.close();
    this.selected.set(id);
  }

  /** An edit the editor emitted. It is held for Accept; the view is not rebuilt from it. */
  protected onEdit(id: string, text: string): void {
    this.held.set(id, text);
  }

  /** Commits the held edit into the shown text: on focus loss, on a click outside the editor, and on close. */
  protected commit(id: string): void {
    const text = this.held.get(id);
    if (text === undefined) return;
    this.committed.update((map) => new Map(map).set(id, text));
  }

  protected onDiffClick(id: string, event: Event): void {
    const target = event.target;
    if (target instanceof Element && target.closest('.cm-editor') !== null) {
      return;
    }
    this.commit(id);
  }

  /** The body of accept and accept-anyway: the held edit as `content`, or no body when there is none. */
  protected editBody(id: string): { content?: string } {
    const text = this.held.get(id);
    return text === undefined ? {} : { content: text };
  }

  protected askAcceptAnyway(id: string): void {
    this.confirming.set(id);
  }

  protected cancelAcceptAnyway(): void {
    this.confirming.set(undefined);
  }

  /** Sends one command on one change. A second command on the same change waits for the first. */
  protected send(
    change: PendingChange,
    action: PendingAction,
    body: unknown,
  ): void {
    const id = change.id;
    const project = this.projectId();
    if (project === undefined || this.busy().has(id)) return;
    this.setBusy(id, true);
    this.clearNotice(id);
    this.api
      .post(pendingActionPath(project, id, action), body, pendingChangeCopy)
      .subscribe({
        next: (answer) => {
          this.setBusy(id, false);
          this.confirming.set(undefined);
          if (answer.projectId === this.projectId()) this.apply(answer);
        },
        error: (error: unknown) => {
          this.setBusy(id, false);
          this.confirming.set(undefined);
          this.setNotice(id, { tone: 'alert', text: failureMessage(error) });
          this.listReads.next();
        },
      });
  }

  private close(): void {
    const id = this.selected();
    if (id === undefined) return;
    this.commit(id);
    this.selected.set(undefined);
    this.confirming.set(undefined);
  }

  private reset(): void {
    this.close();
    this.changes.set([]);
    this.held.clear();
    this.committed.set(new Map());
    this.notices.set(new Map());
    this.listFailure.set(undefined);
    this.loaded.set(false);
    this.listReads.next();
  }

  private inScope(projectId: string, change: PendingChange): boolean {
    const run = this.run();
    return (
      projectId === this.projectId() &&
      (run === undefined || change.origin.runId === run)
    );
  }

  /** Applies one change as it now stands: an open change is stored, any other status removes the row. */
  private apply(change: PendingChange): void {
    if (change.status !== 'pending') {
      this.remove(change.id);
      return;
    }
    const previous = this.changes().find((item) => item.id === change.id);
    if (previous !== undefined) this.checkProposal(previous, change);
    this.changes.update((list) =>
      previous === undefined
        ? [...list, change]
        : list.map((item) => (item.id === change.id ? change : item)),
    );
  }

  /** Replaces the whole list with a read. A change the read no longer names leaves the list. */
  private replaceAll(next: readonly PendingChange[]): void {
    const current = new Map(
      this.changes().map((change) => [change.id, change]),
    );
    for (const change of next) {
      const previous = current.get(change.id);
      if (previous !== undefined) this.checkProposal(previous, change);
    }
    const ids = new Set(next.map((change) => change.id));
    for (const id of current.keys()) {
      if (!ids.has(id)) this.forget(id);
    }
    this.changes.set(next);
  }

  private remove(id: string): void {
    this.changes.update((list) => list.filter((change) => change.id !== id));
    this.forget(id);
  }

  /** Drops an edit whose proposal changed: the edit was made on text the author no longer sees. */
  private checkProposal(previous: PendingChange, next: PendingChange): void {
    if (
      previous.proposed === next.proposed &&
      previous.capturedBase?.content === next.capturedBase?.content
    ) {
      return;
    }
    if (!this.held.has(next.id) && !this.committed().has(next.id)) return;
    this.held.delete(next.id);
    this.committed.update((map) => {
      const copy = new Map(map);
      copy.delete(next.id);
      return copy;
    });
    this.setNotice(next.id, { tone: 'status', text: DISCARDED });
  }

  /** Clears everything the page keeps for a change that has left the list. */
  private forget(id: string): void {
    this.held.delete(id);
    this.committed.update((map) => {
      const copy = new Map(map);
      copy.delete(id);
      return copy;
    });
    this.notices.update((map) => {
      const copy = new Map(map);
      copy.delete(id);
      return copy;
    });
    if (this.selected() === id) this.selected.set(undefined);
    if (this.confirming() === id) this.confirming.set(undefined);
  }

  private setBusy(id: string, on: boolean): void {
    this.busy.update((set) => {
      const copy = new Set(set);
      if (on) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }

  private setNotice(id: string, notice: Notice): void {
    this.notices.update((map) => new Map(map).set(id, notice));
  }

  private clearNotice(id: string): void {
    this.notices.update((map) => {
      const copy = new Map(map);
      copy.delete(id);
      return copy;
    });
  }
}
