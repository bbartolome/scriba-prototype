import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import type {
  AgentRunState,
  AgentSettings,
  AgentSettingsUpdate,
  ConversationSummary,
  DiffPreview,
} from '@bbartolome/scriba-contracts/agent-loop';
import type { EntityResolution } from '@bbartolome/scriba-contracts/project-store';
import { catchError, filter, map, of, Subject, switchMap, tap } from 'rxjs';
import {
  ActiveProjectSignal,
  API_CLIENT,
  ApiError,
  DiffView,
  MarkdownPreview,
  SSE_CLIENT,
  ToolCallCard,
  type ToolCallView,
} from '../../shell';
import {
  AGENT_CONVERSATIONS_PATH,
  AGENT_GROUNDING_PATH,
  AGENT_NO_PROVIDER_CODE,
  AGENT_RUN_ACTIVE_CODE,
  AGENT_RUN_CURRENT_PATH,
  AGENT_RUN_NOT_FOUND_CODE,
  AGENT_RUN_STOP_PATH,
  AGENT_RUNS_PATH,
  AGENT_SETTINGS_PATH,
  anyReply,
  type ChatEvent,
  conversationHistoryReply,
  conversationListReply,
  conversationPath,
  entityResolutionReply,
  entityResolvePath,
  isChatEvent,
  isQueueEvent,
  runStateReply,
  settingsReply,
  startReply,
} from './agent-contract';
import {
  acceptsEvent,
  applyChatEvent,
  applyRunState,
  applyStart,
  canContinue,
  type ChatGrounding,
  type ChatState,
  type ChatTurn,
  cardSources,
  cardView,
  checkPathOf,
  stepLabel,
  turnsOfHistory,
} from './chat-state';
import { GroundingChip } from './grounding-chip';

/** A notice for the page: its text, and whether it links to the providers page. */
interface Notice {
  readonly text: string;
  readonly providers?: boolean;
}

/** The result of one run-state read: the state (or null), or the error. */
type Refresh =
  | { readonly ok: true; readonly run: AgentRunState | null }
  | { readonly ok: false; readonly error: unknown };

/** A status of a pending change that closes it: an accepted or a rejected change needs no review (AGL-14 P9). */
function isClosed(status: string | undefined): boolean {
  return status === 'accepted' || status === 'rejected';
}

/** The data of a queue event, as isQueueEvent checks it: the project, and the change's ID and status. */
interface QueueData {
  readonly projectId: string;
  readonly pendingChange: { readonly id: string; readonly status: string };
}

interface CardEntry {
  readonly key: string;
  readonly view: ToolCallView;
  /** The before and after text of a write, shown in the card's content slot (AGL-14 P5). */
  readonly diff?: DiffPreview;
  /** The path of the card's Check grounding action, for a draft card (D8). */
  readonly checkPath?: string;
  /** The chip of the turn's entry for the card's path, shown after the card (D3). */
  readonly grounding?: ChatGrounding;
}

interface TurnEntry {
  readonly turn: ChatTurn;
  readonly cards: readonly CardEntry[];
  /** The chips of entries that match no card of the turn, shown after the cards (D3). */
  readonly grounding: readonly ChatGrounding[];
  readonly reviewHref?: string;
}

/** The message of a refused or failed call: the two agent codes have their own text. */
function noticeOf(error: unknown): Notice {
  if (error instanceof ApiError && error.code === AGENT_NO_PROVIDER_CODE) {
    return { text: 'Set up a model provider first.', providers: true };
  }
  if (error instanceof ApiError && error.code === AGENT_RUN_ACTIVE_CODE) {
    return { text: 'An agent run is already active in this project.' };
  }
  return {
    text:
      error instanceof Error && error.message !== ''
        ? error.message
        : 'The request failed.',
  };
}

/** "No run" is an absent run state (AGENT_RUN_NOT_FOUND), which shows nothing (D6). */
function isNoRun(error: unknown): boolean {
  return error instanceof ApiError && error.code === AGENT_RUN_NOT_FOUND_CODE;
}

function textOf(event: Event): string {
  return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
}

function checkedOf(event: Event): boolean {
  return (event.target as HTMLInputElement).checked;
}

/**
 * The agent chat at /projects/:projectId/chat: the conversation list, the message stream, the intent
 * box, Stop, Continue, the step counter and the settings sheet. It reads the agent API through the
 * Shell's client and applies the stream's events by the seq rule (D4, D6).
 */
@Component({
  selector: 'app-chat-page',
  imports: [DiffView, GroundingChip, MarkdownPreview, ToolCallCard],
  styles: `
    :host {
      display: block;
    }
    .chat {
      display: grid;
      gap: 0.75rem;
      max-width: 48rem;
      margin-inline: auto;
      padding: 0.75rem;
    }
    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    h1 {
      margin: 0;
      font-size: 1.25rem;
    }
    .control {
      min-height: 44px;
      min-width: 44px;
      padding: 0 0.875rem;
      border: 1px solid var(--mat-sys-outline);
      border-radius: 999px;
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface);
      font: inherit;
      cursor: pointer;
    }
    .control:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .sheet {
      display: grid;
      gap: 0.75rem;
      padding: 0.75rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 0.75rem;
    }
    .field {
      display: grid;
      gap: 0.25rem;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 44px;
    }
    input,
    textarea {
      box-sizing: border-box;
      min-height: 44px;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 0.5rem;
      background: var(--mat-sys-surface);
      color: inherit;
      font: inherit;
    }
    textarea {
      width: 100%;
      resize: vertical;
    }
    .conversations ul {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0.5rem 0 0;
      padding: 0;
      list-style: none;
    }
    .turn {
      display: grid;
      gap: 0.5rem;
    }
    .intent {
      margin: 0;
      font-weight: 600;
    }
    .notice {
      margin: 0;
      padding: 0.75rem;
      border-radius: 0.5rem;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
    .muted,
    .step {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }
    .composer {
      position: sticky;
      bottom: 0;
      display: grid;
      gap: 0.5rem;
      padding: 0.75rem 0;
      background: var(--mat-sys-surface);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
  `,
  template: `
    <main class="chat">
      <header class="bar">
        <h1>Chat</h1>
        <button
          type="button"
          class="control"
          [attr.aria-expanded]="settingsOpen()"
          (click)="toggleSettings()"
        >
          Settings
        </button>
      </header>

      @if (settingsOpen()) {
        <section class="sheet" aria-label="Agent settings">
          <label class="field">
            <span>Step cap</span>
            <input
              type="number"
              min="1"
              step="1"
              [value]="stepCapText()"
              (input)="stepCapText.set(textOf($event))"
            />
          </label>
          <label class="check">
            <input
              type="checkbox"
              [checked]="researchOn()"
              (change)="researchOn.set(checkedOf($event))"
            />
            <span>Research enabled</span>
          </label>
          <label class="field">
            <span>Search endpoint</span>
            <input
              type="url"
              [value]="endpointText()"
              (input)="endpointText.set(textOf($event))"
            />
          </label>
          <button type="button" class="control" (click)="saveSettings()">
            Save settings
          </button>
        </section>
      }

      <section class="conversations" aria-label="Conversations">
        <button
          type="button"
          class="control"
          [disabled]="running()"
          (click)="newConversation()"
        >
          New conversation
        </button>
        <ul>
          @for (summary of conversations(); track summary.conversationId) {
            <li>
              <button
                type="button"
                class="control"
                [disabled]="running()"
                (click)="openConversation(summary)"
              >
                {{ summary.intent }}
              </button>
            </li>
          } @empty {
            <li class="muted">No conversations yet.</li>
          }
        </ul>
      </section>

      @if (notice(); as current) {
        <p class="notice" role="alert">
          {{ current.text }}
          @if (current.providers) {
            <a href="/providers">Open providers</a>
          }
        </p>
      }

      @if (checkQuery(); as path) {
        <button
          type="button"
          class="control"
          [disabled]="running()"
          (click)="checkGrounding(path)"
        >
          Check grounding: {{ path }}
        </button>
      }

      <section class="stream" aria-label="Messages">
        @for (entry of entries(); track entry.turn.runId) {
          <article class="turn">
            @if (entry.turn.intent; as intent) {
              <p class="intent">{{ intent }}</p>
            }
            @if (entry.turn.text !== '') {
              <app-markdown-preview [content]="entry.turn.text" />
            }
            @for (card of entry.cards; track card.key) {
              <app-tool-call-card [call]="card.view">
                @if (card.diff; as diff) {
                  <app-diff-view
                    [path]="diff.path"
                    [base]="diff.base"
                    [proposed]="diff.proposed"
                  />
                }
              </app-tool-call-card>
              @if (card.grounding; as grounding) {
                <app-grounding-chip [entry]="grounding" />
              }
              @if (card.checkPath; as path) {
                <button
                  type="button"
                  class="control"
                  [disabled]="running()"
                  (click)="checkGrounding(path)"
                >
                  Check grounding
                </button>
              }
            }
            @for (grounding of entry.grounding; track grounding.targetPath) {
              <app-grounding-chip [entry]="grounding" />
            }
            @if (entry.reviewHref; as href) {
              <p><a [href]="href">Review the changes of this run</a></p>
            }
          </article>
        } @empty {
          <p class="muted">Send an intent to start the agent.</p>
        }
      </section>

      <footer class="composer">
        @if (step(); as label) {
          <p class="step" aria-live="polite">{{ label }}</p>
        }
        <form (submit)="onSubmit($event)">
          <textarea
            aria-label="Intent"
            rows="2"
            [value]="intent()"
            (input)="intent.set(textOf($event))"
          ></textarea>
          <div class="actions">
            <button type="submit" class="control" [disabled]="!canSend()">
              Send
            </button>
            @if (running()) {
              <button type="button" class="control" (click)="stop()">
                Stop
              </button>
            }
            @if (continuable()) {
              <button type="button" class="control" (click)="continueRun()">
                Continue
              </button>
            }
          </div>
        </form>
      </footer>
    </main>
  `,
})
export class ChatPage {
  private readonly api = inject(API_CLIENT);
  private readonly events = inject(SSE_CLIENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectId = inject(ActiveProjectSignal).projectId;

  protected readonly chat = signal<ChatState>({ turns: [] });
  /** The last status the queue events of the active project gave each pending change, by change ID (AGL-14 P9). */
  private readonly queue = signal<ReadonlyMap<string, string>>(new Map());
  protected readonly notice = signal<Notice | undefined>(undefined);
  protected readonly conversations = signal<readonly ConversationSummary[]>([]);
  protected readonly settingsOpen = signal(false);
  protected readonly intent = signal('');
  protected readonly stepCapText = signal('');
  protected readonly researchOn = signal(false);
  protected readonly endpointText = signal('');
  /** The project-relative path of each source entity the page has resolved (OP1, step 9 b). */
  protected readonly sourcePaths = signal<ReadonlyMap<string, string>>(
    new Map(),
  );

  protected readonly textOf = textOf;
  protected readonly checkedOf = checkedOf;

  protected readonly running = computed(
    () => this.chat().activeRunId !== undefined,
  );
  protected readonly canSend = computed(
    () => !this.running() && this.intent().trim() !== '',
  );
  protected readonly continuable = computed(() => canContinue(this.chat()));
  protected readonly step = computed(() => stepLabel(this.chat()));

  /** The `check` query of the Files link (D14): a draft path to check, when it starts with `drafts/`. */
  private readonly route = inject(ActivatedRoute);
  private readonly checkParam = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => params.get('check') ?? undefined),
    ),
    { requireSync: true },
  );
  protected readonly checkQuery = computed(() => {
    const path = this.checkParam();
    return path !== undefined && path.startsWith('drafts/') ? path : undefined;
  });

  /**
   * The stream's entries. Computed, so the shared card gets a new view only when a turn changes. A
   * grounding entry is shown after the first card whose diff preview path is its target (D3).
   */
  protected readonly entries = computed<readonly TurnEntry[]>(() => {
    const project = this.projectId();
    const statuses = this.queue();
    return this.chat().turns.map((turn) => {
      const placed = new Set<string>();
      const cards = turn.cards.map((card): CardEntry => {
        const path = card.diffPreview?.path;
        const grounding =
          path === undefined || placed.has(path)
            ? undefined
            : turn.grounding.find((entry) => entry.targetPath === path);
        if (grounding !== undefined && path !== undefined) {
          placed.add(path);
        }
        return {
          key: card.callId,
          view: cardView(card, cardSources(card, this.sourcePaths())),
          diff: card.diffPreview,
          checkPath: checkPathOf(card),
          grounding,
        };
      });
      return {
        turn,
        cards,
        grounding: turn.grounding.filter(
          (entry) => !placed.has(entry.targetPath),
        ),
        // The link stays while one change of the run is not known to be accepted or rejected (AGL-14 P9).
        reviewHref:
          project !== undefined &&
          turn.pendingChangeIds.some((id) => !isClosed(statuses.get(id)))
            ? `/projects/${encodeURIComponent(project)}/review?run=${encodeURIComponent(turn.runId)}`
            : undefined,
      };
    });
  });

  /** The settings the page last received; the save compares its fields against these. */
  private settings: AgentSettings | undefined;
  private readonly refreshes = new Subject<void>();
  private refreshing = false;
  private buffered: ChatEvent[] = [];
  private loadedFor = this.projectId();
  /** The source IDs already asked for, as `project` and `id` joined, so each is asked for once. */
  private readonly requestedSources = new Set<string>();

  constructor() {
    // Each source ID of the stream is resolved to its path, once per project (OP1, step 9 b). An ID that is not
    // resolved, or a failed request, leaves its ID without a path and shows no notice.
    effect(() => {
      const project = this.projectId();
      if (project === undefined) {
        return;
      }
      for (const card of this.chat().turns.flatMap((turn) => turn.cards)) {
        for (const id of card.sourcesUsed ?? []) {
          const key = `${project}\n${id}`;
          if (this.requestedSources.has(key)) {
            continue;
          }
          this.requestedSources.add(key);
          this.api
            .get(entityResolvePath(project), entityResolutionReply, { ids: id })
            .subscribe({
              next: (reply) => this.takeResolution(project, reply),
              error: () => undefined,
            });
        }
      }
    });

    this.refreshes
      .pipe(
        tap(() => {
          this.refreshing = true;
        }),
        switchMap(() =>
          this.api.get(AGENT_RUN_CURRENT_PATH, runStateReply).pipe(
            map((run): Refresh => ({ ok: true, run })),
            catchError((error: unknown) => of<Refresh>({ ok: false, error })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.finishRefresh(result));

    this.events
      .stream('agent-loop')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (envelope) => {
          if (isChatEvent(envelope)) {
            this.receive(envelope);
          }
        },
        error: (error: unknown) => this.showError(error),
      });

    this.events
      .stream('project-store')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (envelope) => {
          if (isQueueEvent(envelope)) {
            this.receiveQueue(envelope.data as QueueData);
          }
        },
        error: (error: unknown) => this.showError(error),
      });

    this.events.reconcile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshes.next());

    // The Shell's project switch reuses this page: the view starts again for the new project (D6).
    toObservable(this.projectId)
      .pipe(
        filter((id) => id !== this.loadedFor),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => {
        this.loadedFor = id;
        this.resetView();
        this.load();
      });

    this.load();
  }

  /** Opens or closes the settings sheet. */
  protected toggleSettings(): void {
    this.settingsOpen.update((open) => !open);
  }

  /** The Send button and the form's submit: sends the trimmed intent as a new run. */
  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.send();
  }

  protected send(): void {
    const text = this.intent().trim();
    if (text === '' || this.running()) {
      return;
    }
    this.startRun(text, () => this.intent.set(''));
  }

  /** Continue starts a run in the same conversation with the intent Continue (D9). */
  protected continueRun(): void {
    this.startRun('Continue');
  }

  /** Stop ends the active run. The reply is ignored; run-ended clears the button (D8). */
  protected stop(): void {
    const runId = this.chat().activeRunId;
    if (runId === undefined) {
      return;
    }
    this.notice.set(undefined);
    this.api
      .post(AGENT_RUN_STOP_PATH, { runId }, anyReply)
      .subscribe({ error: (error: unknown) => this.showError(error) });
  }

  /**
   * Check grounding posts the file's path (D8). The reply starts a run, which the stream then shows;
   * the run's intent label is the action, and the label is not sent.
   */
  protected checkGrounding(path: string): void {
    this.notice.set(undefined);
    this.api.post(AGENT_GROUNDING_PATH, { path }, startReply).subscribe({
      next: (start) =>
        this.chat.update((state) =>
          applyStart(state, start, `Check grounding: ${path}`),
        ),
      error: (error: unknown) => this.showError(error),
    });
  }

  /** New conversation clears the stream and the page's conversation (D14). */
  protected newConversation(): void {
    this.notice.set(undefined);
    this.chat.update((state) => ({ turns: [], stepCap: state.stepCap }));
  }

  /** Opens a conversation: its finished turns replace the stream (D14). */
  protected openConversation(summary: ConversationSummary): void {
    this.notice.set(undefined);
    this.api
      .get(conversationPath(summary.conversationId), conversationHistoryReply)
      .subscribe({
        next: (history) =>
          this.chat.update((state) => ({
            turns: turnsOfHistory(history),
            conversationId: history.conversationId,
            stepCap: state.stepCap,
          })),
        error: (error: unknown) => this.showError(error),
      });
  }

  /** Saves the fields that changed. An emptied search endpoint is not sent (open point 7). */
  protected saveSettings(): void {
    const stepCap = Number(this.stepCapText());
    if (!Number.isSafeInteger(stepCap) || stepCap < 1) {
      this.notice.set({
        text: 'Step cap must be a whole number of at least 1.',
      });
      return;
    }
    const body: AgentSettingsUpdate = {};
    if (stepCap !== this.settings?.stepCap) {
      body.stepCap = stepCap;
    }
    const research: { enabled?: boolean; searchEndpoint?: string } = {};
    if (this.researchOn() !== this.settings?.research.enabled) {
      research.enabled = this.researchOn();
    }
    const endpoint = this.endpointText().trim();
    if (
      endpoint !== '' &&
      endpoint !== (this.settings?.research.searchEndpoint ?? '')
    ) {
      research.searchEndpoint = endpoint;
    }
    if (Object.keys(research).length > 0) {
      body.research = research;
    }
    this.notice.set(undefined);
    this.api.post(AGENT_SETTINGS_PATH, body, settingsReply).subscribe({
      next: (settings) => this.takeSettings(settings),
      error: (error: unknown) => this.showError(error),
    });
  }

  /** A start (or Continue) posts the intent, with the page's conversation when it has one. */
  private startRun(intent: string, onStarted?: () => void): void {
    const conversationId = this.chat().conversationId;
    const body =
      conversationId === undefined ? { intent } : { intent, conversationId };
    this.notice.set(undefined);
    this.api.post(AGENT_RUNS_PATH, body, startReply).subscribe({
      next: (start) => {
        this.chat.update((state) => applyStart(state, start, intent));
        onStarted?.();
      },
      error: (error: unknown) => this.showError(error),
    });
  }

  private load(): void {
    this.refreshes.next();
    this.api.get(AGENT_SETTINGS_PATH, settingsReply).subscribe({
      next: (settings) => this.takeSettings(settings),
      error: (error: unknown) => this.showError(error),
    });
    this.loadConversations();
  }

  private loadConversations(): void {
    this.api.get(AGENT_CONVERSATIONS_PATH, conversationListReply).subscribe({
      next: (list) => this.conversations.set(list.conversations),
      error: (error: unknown) => this.showError(error),
    });
  }

  /** Takes a queue event of the active project: the status of its change is kept (AGL-14 P9). */
  private receiveQueue(data: QueueData): void {
    if (data.projectId !== this.projectId()) {
      return;
    }
    this.queue.update((statuses) =>
      new Map(statuses).set(data.pendingChange.id, data.pendingChange.status),
    );
  }

  private resetView(): void {
    this.notice.set(undefined);
    this.buffered = [];
    this.queue.set(new Map());
    this.chat.set({ turns: [] });
    this.sourcePaths.set(new Map());
    this.requestedSources.clear();
  }

  /** Takes one resolution of a source: each resolved path is kept, unless the project has changed since the request. */
  private takeResolution(project: string, reply: EntityResolution): void {
    if (this.projectId() !== project) {
      return;
    }
    this.sourcePaths.update((paths) => {
      const next = new Map(paths);
      for (const entity of reply.resolved) {
        next.set(entity.id, entity.path);
      }
      return next;
    });
  }

  /** Takes the settings: the step cap goes to the view, and the form shows the stored values. */
  private takeSettings(settings: AgentSettings): void {
    this.settings = settings;
    this.chat.update((state) => ({ ...state, stepCap: settings.stepCap }));
    this.stepCapText.set(String(settings.stepCap));
    this.researchOn.set(settings.research.enabled);
    this.endpointText.set(settings.research.searchEndpoint ?? '');
  }

  /**
   * Applies a run-state read (S9): the state replaces the view, then the events that arrived during
   * the read are applied by the seq rule. A failed read keeps the view and shows its error.
   */
  private finishRefresh(result: Refresh): void {
    this.refreshing = false;
    if (result.ok) {
      this.chat.update((state) => applyRunState(state, result.run));
    } else if (!isNoRun(result.error)) {
      this.showError(result.error);
    }
    this.flush();
  }

  /** An event arrives: during a read it waits in the buffer; otherwise it is applied now. */
  private receive(event: ChatEvent): void {
    if (this.refreshing) {
      this.buffered.push(event);
      return;
    }
    this.apply(event);
  }

  private apply(event: ChatEvent): void {
    if (!acceptsEvent(this.chat(), event)) {
      return;
    }
    this.chat.update((state) => applyChatEvent(state, event));
    // Each applied tool call re-reads the run state, so the step counter is current (D12).
    if (event.type === 'tool-call-started') {
      this.refreshes.next();
    }
    if (event.type === 'run-ended') {
      this.loadConversations();
    }
  }

  private flush(): void {
    const pending = this.buffered;
    this.buffered = [];
    for (const event of pending) {
      this.receive(event);
    }
  }

  private showError(error: unknown): void {
    this.notice.set(noticeOf(error));
  }
}
