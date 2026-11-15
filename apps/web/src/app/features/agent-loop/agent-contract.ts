// Hand-written copies of the agent-loop contract that the chat panel reads: route paths, error codes,
// enumerations, response guards and the event guard. The browser ships no runtime zod (DECISIONS lines
// 1084 to 1090), so this file imports only types from the contract. agent-contract.spec.ts (X1) checks
// each copy and guard against the contract's schemas.

import type {
  AgentLoopEvent,
  AgentRunState,
  AgentStartResponse,
  AgentSettings,
  ConversationHistory,
  ConversationList,
} from '@bbartolome/scriba-contracts/agent-loop';
import type { ApiPath, ResponseSchema } from '../../shell';

/** `POST` the start of a run (`AGENT_RUNS_ROUTE`). */
export const AGENT_RUNS_PATH: ApiPath = '/api/agent-loop/runs';
/** `POST` the stop of a run (`AGENT_RUN_STOP_ROUTE`). */
export const AGENT_RUN_STOP_PATH: ApiPath = '/api/agent-loop/runs/stop';
/** `GET` the current run state (`AGENT_RUN_CURRENT_ROUTE`). */
export const AGENT_RUN_CURRENT_PATH: ApiPath = '/api/agent-loop/runs/current';
/** `GET` the conversation list (`AGENT_CONVERSATIONS_ROUTE`). */
export const AGENT_CONVERSATIONS_PATH: ApiPath =
  '/api/agent-loop/conversations';
/** `GET` one conversation's history (`AGENT_CONVERSATION_ROUTE`). A template: see `conversationPath`. */
export const AGENT_CONVERSATION_PATH: ApiPath =
  '/api/agent-loop/conversations/:conversationId';
/** `GET` and `POST` the agent settings (`AGENT_SETTINGS_ROUTE`). */
export const AGENT_SETTINGS_PATH: ApiPath = '/api/agent-loop/settings';

/** Fills the history route's `:conversationId` with the id, encoded as one path segment. */
export function conversationPath(conversationId: string): ApiPath {
  return AGENT_CONVERSATION_PATH.replace(
    ':conversationId',
    encodeURIComponent(conversationId),
  ) as ApiPath;
}

/** The error codes the page reads (`AGENT_ERROR_CODES`). */
export const AGENT_NO_PROVIDER_CODE = 'AGENT_NO_PROVIDER';
export const AGENT_RUN_ACTIVE_CODE = 'AGENT_RUN_ACTIVE';
export const AGENT_RUN_NOT_FOUND_CODE = 'AGENT_RUN_NOT_FOUND';

/** The enumerations the guards check (`AGENT_TOOL_FAMILIES` and the other constants). */
export const TOOL_FAMILY_VALUES = [
  'project',
  'narrative',
  'research',
  'compile',
  'grounding',
] as const;
export const CARD_STATUS_VALUES = ['running', 'done', 'error'] as const;
export const RUN_STATUS_VALUES = ['running', 'ended'] as const;
export const RUN_END_REASON_VALUES = [
  'completed',
  'stopped',
  'capped',
  'error',
  'project-switched',
] as const;

/** The eight event types the page handles. The grounding types are not among them (D18). */
const HANDLED_TYPES = [
  'run-started',
  'token-delta',
  'tool-call-started',
  'tool-call-args',
  'tool-call-result',
  'tool-call-error',
  'step-cap-reached',
  'run-ended',
] as const;

/** One of the eight handled members of the agent loop's SSE union. */
export type ChatEvent = Extract<
  AgentLoopEvent,
  { type: (typeof HANDLED_TYPES)[number] }
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string';
}

function isFilled(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isInteger(value: unknown, min: number): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= min
  );
}

function isOneOf(values: readonly string[], value: unknown): boolean {
  return typeof value === 'string' && values.includes(value);
}

/** A key that may be absent (`undefined`) or must pass `check`. */
function isOptional(
  value: unknown,
  check: (value: unknown) => boolean,
): boolean {
  return value === undefined || check(value);
}

function isHttpUrl(value: unknown): boolean {
  if (!isText(value)) {
    return false;
  }
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

function isErrorBody(value: unknown): boolean {
  return (
    isRecord(value) &&
    isText(value['message']) &&
    isInteger(value['attempt'], 1) &&
    isOptional(value['withdrawn'], isBoolean)
  );
}

/** One tool-call card of a run state or a history turn. `arguments` and `output` take any value. */
function isCard(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFilled(value['callId']) &&
    isFilled(value['name']) &&
    isOneOf(TOOL_FAMILY_VALUES, value['family']) &&
    isOneOf(CARD_STATUS_VALUES, value['status']) &&
    isOptional(value['valid'], isBoolean) &&
    isOptional(value['summary'], isText) &&
    isOptional(value['diffPreview'], isRecord) &&
    isOptional(value['sourcesUsed'], Array.isArray) &&
    isOptional(value['provenance'], isRecord) &&
    isOptional(value['error'], isErrorBody)
  );
}

function isRunState(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const cards = value['cards'];
  const pending = value['pendingChangeIds'];
  return (
    isFilled(value['runId']) &&
    isFilled(value['conversationId']) &&
    isOneOf(RUN_STATUS_VALUES, value['status']) &&
    isInteger(value['step'], 0) &&
    isInteger(value['cap'], 1) &&
    isText(value['assistantText']) &&
    Array.isArray(cards) &&
    cards.every(isCard) &&
    // groundingResults is checked as an array only (D18).
    Array.isArray(value['groundingResults']) &&
    Array.isArray(pending) &&
    pending.every(isFilled) &&
    isInteger(value['lastSeq'], 0) &&
    isOptional(value['reason'], (reason) =>
      isOneOf(RUN_END_REASON_VALUES, reason),
    )
  );
}

function isTurn(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const cards = value['cards'];
  return (
    isFilled(value['runId']) &&
    isFilled(value['intent']) &&
    isText(value['assistantText']) &&
    Array.isArray(cards) &&
    cards.every(isCard) &&
    isOneOf(RUN_END_REASON_VALUES, value['reason'])
  );
}

function isHistory(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const turns = value['turns'];
  return (
    isFilled(value['conversationId']) &&
    Array.isArray(turns) &&
    turns.every(isTurn)
  );
}

function isConversationList(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const conversations = value['conversations'];
  return (
    Array.isArray(conversations) &&
    conversations.every(
      (entry: unknown) =>
        isRecord(entry) &&
        isFilled(entry['conversationId']) &&
        isFilled(entry['intent']),
    )
  );
}

function isSettings(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const research = value['research'];
  return (
    value['schemaVersion'] === 1 &&
    isInteger(value['stepCap'], 1) &&
    isRecord(research) &&
    isBoolean(research['enabled']) &&
    isOptional(research['searchEndpoint'], isHttpUrl)
  );
}

function isStart(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFilled(value['runId']) &&
    isFilled(value['conversationId'])
  );
}

/** One ResponseSchema that accepts a body when `check` does. The body is passed on unchanged. */
function replyOf<T>(check: (value: unknown) => boolean): ResponseSchema<T> {
  return {
    safeParse(data: unknown) {
      return check(data)
        ? { success: true, data: data as T }
        : { success: false, error: 'The body does not match the contract.' };
    },
  };
}

/** The body of POST .../runs: the run id and the conversation id. */
export const startReply: ResponseSchema<AgentStartResponse> = replyOf(isStart);

/** The body of GET .../runs/current: a run state, or null when no run is active. */
export const runStateReply: ResponseSchema<AgentRunState | null> = replyOf(
  (value) => value === null || isRunState(value),
);

/** The body of GET .../conversations. */
export const conversationListReply: ResponseSchema<ConversationList> =
  replyOf(isConversationList);

/** The body of GET .../conversations/:conversationId. */
export const conversationHistoryReply: ResponseSchema<ConversationHistory> =
  replyOf(isHistory);

/** The bare section, the same for GET and POST .../settings. */
export const settingsReply: ResponseSchema<AgentSettings> = replyOf(isSettings);

/** The stop reply is ignored, so every body is accepted (D8). */
export const anyReply: ResponseSchema<unknown> = replyOf(() => true);

/**
 * Whether an SSE envelope is one of the eight events the page handles, with the fields the page reads
 * checked. The grounding events are refused (D18).
 */
export function isChatEvent(value: unknown): value is ChatEvent {
  if (!isRecord(value) || value['module'] !== 'agent-loop') {
    return false;
  }
  const data = value['data'];
  if (
    !isRecord(data) ||
    !isFilled(data['runId']) ||
    !isInteger(data['seq'], 1)
  ) {
    return false;
  }
  switch (value['type']) {
    case 'run-started':
      return true;
    case 'token-delta':
      return isText(data['text']);
    case 'tool-call-started':
      return (
        isFilled(data['callId']) &&
        isFilled(data['name']) &&
        isOneOf(TOOL_FAMILY_VALUES, data['family'])
      );
    case 'tool-call-args':
      return isFilled(data['callId']) && isBoolean(data['valid']);
    case 'tool-call-result':
      return (
        isFilled(data['callId']) &&
        isText(data['summary']) &&
        isOptional(data['diffPreview'], isRecord) &&
        isOptional(data['sourcesUsed'], Array.isArray) &&
        isOptional(data['provenance'], isRecord)
      );
    case 'tool-call-error':
      return (
        isFilled(data['callId']) &&
        isText(data['message']) &&
        isInteger(data['attempt'], 1) &&
        isOptional(data['withdrawn'], isBoolean)
      );
    case 'step-cap-reached':
      return isInteger(data['step'], 0) && isInteger(data['cap'], 1);
    case 'run-ended': {
      const pending = data['pendingChangeIds'];
      return (
        isOneOf(RUN_END_REASON_VALUES, data['reason']) &&
        isOptional(data['message'], isText) &&
        Array.isArray(pending) &&
        pending.every(isFilled)
      );
    }
    default:
      return false;
  }
}
