// The chat panel's view state and its pure reducers. No Angular import: the page holds the state in
// signals and calls these functions, and the functions are read by agent-contract.spec.ts through the page.

import type {
  AgentCard,
  AgentRunEndReason,
  AgentRunState,
  AgentToolFamily,
  ConversationHistory,
  ConversationTurn,
  GroundingResult,
} from '@bbartolome/scriba-contracts/agent-loop';
import type { ToolCallOutput, ToolCallStatus, ToolCallView } from '../../shell';
import type { ChatEvent } from './agent-contract';

type CardDiff = NonNullable<AgentCard['diffPreview']>;
type CardSources = NonNullable<AgentCard['sourcesUsed']>;
type CardProvenance = NonNullable<AgentCard['provenance']>;

/** A card's error: kept as the fields, shown as one line by `errorText`. */
export interface ChatCardError {
  readonly message: string;
  readonly attempt: number;
  readonly withdrawn?: boolean;
}

/**
 * One tool call of a turn. `status` is pending until the call's args arrive (the contract's card
 * statuses are running, done and error; pending is the page's own, from tool-call-started).
 */
export interface ChatCard {
  readonly callId: string;
  readonly name: string;
  readonly family: AgentToolFamily;
  readonly status: ToolCallStatus;
  readonly arguments?: unknown;
  readonly valid?: boolean;
  readonly summary?: string;
  readonly output?: unknown;
  readonly diffPreview?: CardDiff;
  readonly sourcesUsed?: CardSources;
  readonly provenance?: CardProvenance;
  readonly error?: ChatCardError;
}

/**
 * The grounding of one target file in a turn (D9): a check that runs (`checking`), or the latest
 * result for the path. A turn holds one entry per path, in order of first appearance.
 */
export interface ChatGrounding {
  readonly targetPath: string;
  readonly checking: boolean;
  readonly result?: GroundingResult;
}

/** One run's turn in the stream: its intent, text, cards and the state the page shows. */
export interface ChatTurn {
  readonly runId: string;
  readonly intent?: string;
  readonly text: string;
  readonly cards: readonly ChatCard[];
  /** The grounding entries of the turn. History turns carry none (D10). */
  readonly grounding: readonly ChatGrounding[];
  readonly status: 'running' | 'ended';
  readonly reason?: AgentRunEndReason;
  readonly step?: number;
  readonly cap?: number;
  /** The seq of the last event applied to this turn (the per-run counter, D4). */
  readonly lastSeq: number;
  readonly pendingChangeIds: readonly string[];
}

/** The page's view: the turns of the stream, the conversation and the active run. */
export interface ChatState {
  readonly turns: readonly ChatTurn[];
  readonly conversationId?: string;
  readonly activeRunId?: string;
  /** The step cap from the settings, used by the counter until a run state gives one. */
  readonly stepCap?: number;
}

function newTurn(runId: string, intent?: string): ChatTurn {
  return {
    runId,
    intent,
    text: '',
    cards: [],
    grounding: [],
    status: 'running',
    lastSeq: 0,
    pendingChangeIds: [],
  };
}

/** The turn of a run in the view, if the view has one. */
export function findTurn(
  state: ChatState,
  runId: string,
): ChatTurn | undefined {
  return state.turns.find((turn) => turn.runId === runId);
}

function putTurn(state: ChatState, turn: ChatTurn): ChatState {
  const exists = findTurn(state, turn.runId) !== undefined;
  const turns = exists
    ? state.turns.map((current) =>
        current.runId === turn.runId ? turn : current,
      )
    : [...state.turns, turn];
  return { ...state, turns };
}

/**
 * Whether the view applies an event (D4). A run's first event is its run-started, which opens the
 * turn. Any other event of an unknown run is ignored. Then an event at or below the turn's lastSeq is
 * ignored, and any other is applied.
 */
export function acceptsEvent(state: ChatState, event: ChatEvent): boolean {
  const turn = findTurn(state, event.data.runId);
  if (turn === undefined) {
    return event.type === 'run-started';
  }
  return event.data.seq > turn.lastSeq;
}

function changeTurn(
  state: ChatState,
  event: ChatEvent,
  change: (turn: ChatTurn) => ChatTurn,
): ChatState {
  const turn = findTurn(state, event.data.runId);
  if (turn === undefined) {
    return state;
  }
  return putTurn(state, { ...change(turn), lastSeq: event.data.seq });
}

function changeCard(
  cards: readonly ChatCard[],
  callId: string,
  change: (card: ChatCard) => ChatCard,
): readonly ChatCard[] {
  return cards.map((card) => (card.callId === callId ? change(card) : card));
}

/** The entries with `entry` in place of the one of its path, or appended when the path has none. */
function withGrounding(
  entries: readonly ChatGrounding[],
  entry: ChatGrounding,
): readonly ChatGrounding[] {
  return entries.some((current) => current.targetPath === entry.targetPath)
    ? entries.map((current) =>
        current.targetPath === entry.targetPath ? entry : current,
      )
    : [...entries, entry];
}

function startCard(
  cards: readonly ChatCard[],
  card: ChatCard,
): readonly ChatCard[] {
  return cards.some((current) => current.callId === card.callId)
    ? cards.map((current) => (current.callId === card.callId ? card : current))
    : [...cards, card];
}

/** Applies one handled event to the view, under the seq rule of acceptsEvent. */
export function applyChatEvent(state: ChatState, event: ChatEvent): ChatState {
  if (!acceptsEvent(state, event)) {
    return state;
  }
  switch (event.type) {
    case 'run-started': {
      const { runId, seq } = event.data;
      const turn = findTurn(state, runId) ?? newTurn(runId);
      return {
        ...putTurn(state, { ...turn, lastSeq: seq }),
        activeRunId: runId,
      };
    }
    case 'token-delta': {
      const { text } = event.data;
      return changeTurn(state, event, (turn) => ({
        ...turn,
        text: turn.text + text,
      }));
    }
    case 'tool-call-started': {
      const { callId, name, family } = event.data;
      return changeTurn(state, event, (turn) => ({
        ...turn,
        cards: startCard(turn.cards, {
          callId,
          name,
          family,
          status: 'pending',
        }),
      }));
    }
    case 'tool-call-args': {
      const { callId, arguments: args, valid } = event.data;
      return changeTurn(state, event, (turn) => ({
        ...turn,
        cards: changeCard(turn.cards, callId, (card) => ({
          ...card,
          status: 'running',
          arguments: args,
          valid,
        })),
      }));
    }
    case 'tool-call-result': {
      const { callId, summary, output, diffPreview, sourcesUsed, provenance } =
        event.data;
      return changeTurn(state, event, (turn) => ({
        ...turn,
        cards: changeCard(turn.cards, callId, (card) => ({
          ...card,
          status: 'done',
          summary,
          output,
          diffPreview,
          sourcesUsed,
          provenance,
        })),
      }));
    }
    case 'tool-call-error': {
      const { callId, message, attempt, withdrawn } = event.data;
      return changeTurn(state, event, (turn) => ({
        ...turn,
        cards: changeCard(turn.cards, callId, (card) => ({
          ...card,
          status: 'error',
          error: { message, attempt, withdrawn },
        })),
      }));
    }
    case 'step-cap-reached': {
      const { step, cap } = event.data;
      return changeTurn(state, event, (turn) => ({ ...turn, step, cap }));
    }
    case 'grounding-started': {
      const { targetPath } = event.data;
      return changeTurn(state, event, (turn) => {
        const current = turn.grounding.find(
          (entry) => entry.targetPath === targetPath,
        );
        return {
          ...turn,
          grounding: withGrounding(turn.grounding, {
            targetPath,
            checking: true,
            result: current?.result,
          }),
        };
      });
    }
    case 'grounding-result': {
      const result = event.data;
      return changeTurn(state, event, (turn) => ({
        ...turn,
        grounding: withGrounding(turn.grounding, {
          targetPath: result.targetPath,
          checking: false,
          result,
        }),
      }));
    }
    case 'run-ended': {
      const { runId, reason, pendingChangeIds } = event.data;
      const next = changeTurn(state, event, (turn) => ({
        ...turn,
        status: 'ended',
        reason,
        pendingChangeIds,
      }));
      return state.activeRunId === runId
        ? { ...next, activeRunId: undefined }
        : next;
    }
  }
}

function cardOfState(card: AgentCard): ChatCard {
  return {
    callId: card.callId,
    name: card.name,
    family: card.family,
    status: card.status,
    arguments: card.arguments,
    valid: card.valid,
    summary: card.summary,
    output: card.output,
    diffPreview: card.diffPreview,
    sourcesUsed: card.sourcesUsed,
    provenance: card.provenance,
    error: card.error,
  };
}

/**
 * The grounding entries of a run state (D10): one per path, the last result of the path winning, in
 * order of first appearance. A checking entry whose path has no result is kept.
 */
function groundingOfState(
  results: readonly GroundingResult[],
  existing: readonly ChatGrounding[],
): ChatGrounding[] {
  let entries: readonly ChatGrounding[] = [];
  for (const result of results) {
    entries = withGrounding(entries, {
      targetPath: result.targetPath,
      checking: false,
      result,
    });
  }
  for (const entry of existing) {
    const hasResult = entries.some(
      (current) => current.targetPath === entry.targetPath,
    );
    if (entry.checking && !hasResult) {
      entries = [...entries, entry];
    }
  }
  return [...entries];
}

/**
 * Replaces the view's turn of the run with the run state (S9, D6). A null state (no run) changes
 * nothing. The state's conversation becomes the page's conversation.
 */
export function applyRunState(
  state: ChatState,
  run: AgentRunState | null,
): ChatState {
  if (run === null) {
    return state;
  }
  const existing = findTurn(state, run.runId);
  const ended = run.status === 'ended';
  const turn: ChatTurn = {
    runId: run.runId,
    intent: existing?.intent,
    text: run.assistantText,
    cards: run.cards.map(cardOfState),
    grounding: groundingOfState(
      run.groundingResults,
      existing?.grounding ?? [],
    ),
    status: ended ? 'ended' : 'running',
    reason: run.reason,
    step: run.step,
    cap: run.cap,
    lastSeq: run.lastSeq,
    pendingChangeIds: run.pendingChangeIds,
  };
  const activeRunId = ended
    ? state.activeRunId === run.runId
      ? undefined
      : state.activeRunId
    : run.runId;
  return {
    ...putTurn(state, turn),
    conversationId: run.conversationId,
    activeRunId,
  };
}

/**
 * Records a start reply (D10): the run's turn carries the intent sent, the page takes the reply's
 * conversation, and the run is active unless its run-ended has already been applied.
 */
export function applyStart(
  state: ChatState,
  start: { readonly runId: string; readonly conversationId: string },
  intent: string,
): ChatState {
  const existing = findTurn(state, start.runId);
  const turn: ChatTurn = {
    ...(existing ?? newTurn(start.runId)),
    intent: existing?.intent ?? intent,
  };
  return {
    ...putTurn(state, turn),
    conversationId: start.conversationId,
    activeRunId: turn.status === 'ended' ? state.activeRunId : start.runId,
  };
}

/** The finished turns of a conversation, as the stream shows them (D14). */
export function turnsOfHistory(history: ConversationHistory): ChatTurn[] {
  return history.turns.map((turn: ConversationTurn): ChatTurn => ({
    runId: turn.runId,
    intent: turn.intent,
    text: turn.assistantText,
    cards: turn.cards.map(cardOfState),
    grounding: [],
    status: 'ended',
    reason: turn.reason,
    lastSeq: 0,
    pendingChangeIds: [],
  }));
}

/** The latest turn that has finished, if any. */
export function latestFinished(state: ChatState): ChatTurn | undefined {
  for (let index = state.turns.length - 1; index >= 0; index--) {
    const turn = state.turns[index];
    if (turn?.status === 'ended') {
      return turn;
    }
  }
  return undefined;
}

/** Continue is shown when no run is active and the latest finished turn ended capped (D9). */
export function canContinue(state: ChatState): boolean {
  return (
    state.activeRunId === undefined &&
    latestFinished(state)?.reason === 'capped'
  );
}

/** The step counter of the latest turn, once the turn has a step (D12). */
export function stepLabel(state: ChatState): string | undefined {
  const latest = state.turns.at(-1);
  if (latest?.step === undefined) {
    return undefined;
  }
  const cap = latest.cap ?? state.stepCap;
  return cap === undefined
    ? `step ${latest.step}`
    : `step ${latest.step} of ${cap}`;
}

/** The output of a card as the shared card shows it: Markdown for a string, JSON for any other value. */
export function outputOf(value: unknown): ToolCallOutput | undefined {
  if (value === undefined) {
    return undefined;
  }
  return typeof value === 'string'
    ? { kind: 'markdown', text: value }
    : { kind: 'json', value };
}

/** The error line: the attempt number, then the message, then the withdrawn marker (D5). */
export function errorText(error: ChatCardError): string {
  const marker = error.withdrawn === true ? ' (withdrawn)' : '';
  return `Attempt ${error.attempt}: ${error.message}${marker}`;
}

/**
 * The project-relative paths of a card's sources, in the order of sourcesUsed. An ID with no path in `paths` is
 * left out. Undefined when the card has no sourcesUsed.
 */
export function cardSources(
  card: ChatCard,
  paths: ReadonlyMap<string, string>,
): string[] | undefined {
  if (card.sourcesUsed === undefined) {
    return undefined;
  }
  return card.sourcesUsed.flatMap((id) => {
    const path = paths.get(id);
    return path === undefined ? [] : [path];
  });
}

/** The shared card's view of one chat card. The host never passes an event to the card. */
export function cardView(
  card: ChatCard,
  sources?: readonly string[],
): ToolCallView {
  return {
    name: card.name,
    status: card.status,
    summary: card.summary,
    arguments: card.arguments,
    output: outputOf(card.output),
    error: card.error === undefined ? undefined : errorText(card.error),
    sources,
  };
}

/** The verdict counts of a result's claims (D4). */
export function verdictCounts(result: GroundingResult | undefined): {
  readonly supported: number;
  readonly weak: number;
  readonly unsupported: number;
} {
  const counts = { supported: 0, weak: 0, unsupported: 0 };
  for (const claim of result?.claims ?? []) {
    counts[claim.verdict] += 1;
  }
  return counts;
}

/**
 * The chip's text (D4): "Checking <path>" while a check runs, otherwise the counts of the latest
 * result as "N supported · N weak · N unsupported".
 */
export function summaryText(entry: ChatGrounding): string {
  if (entry.checking) {
    return `Checking ${entry.targetPath}`;
  }
  const counts = verdictCounts(entry.result);
  return `${counts.supported} supported · ${counts.weak} weak · ${counts.unsupported} unsupported`;
}

/** The text and the icon name of a verdict's badge (D5). Its colours are set by the chip's styles. */
export function verdictView(
  verdict: GroundingResult['claims'][number]['verdict'],
): { readonly label: string; readonly icon: string } {
  switch (verdict) {
    case 'supported':
      return { label: 'Supported', icon: 'check_circle' };
    case 'weak':
      return { label: 'Weak', icon: 'warning' };
    case 'unsupported':
      return { label: 'Unsupported', icon: 'cancel' };
  }
}

/**
 * The path a draft card can be checked by (D8): its diff preview's path, when it is a string under
 * `drafts/`. Undefined otherwise. The contract's guard checks the preview as a record only.
 */
export function checkPathOf(card: ChatCard): string | undefined {
  const path: unknown = card.diffPreview?.path;
  return typeof path === 'string' && path.startsWith('drafts/')
    ? path
    : undefined;
}
