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
import type { EntityResolution } from '@bbartolome/scriba-contracts/project-store';
import type { ApiPath, ResponseSchema } from '../../shell';

/** `POST` the start of a run (`AGENT_RUNS_ROUTE`). */
export const AGENT_RUNS_PATH: ApiPath = '/api/agent-loop/runs';
/** `POST` the stop of a run (`AGENT_RUN_STOP_ROUTE`). */
export const AGENT_RUN_STOP_PATH: ApiPath = '/api/agent-loop/runs/stop';
/** `GET` the current run state (`AGENT_RUN_CURRENT_ROUTE`). */
export const AGENT_RUN_CURRENT_PATH: ApiPath = '/api/agent-loop/runs/current';
/** `POST` the on-demand grounding check of a file (`AGENT_GROUNDING_ROUTE`); the reply starts a run. */
export const AGENT_GROUNDING_PATH: ApiPath = '/api/agent-loop/grounding';
/** `GET` the conversation list (`AGENT_CONVERSATIONS_ROUTE`). */
export const AGENT_CONVERSATIONS_PATH: ApiPath =
  '/api/agent-loop/conversations';
/** `GET` one conversation's history (`AGENT_CONVERSATION_ROUTE`). A template: see `conversationPath`. */
export const AGENT_CONVERSATION_PATH: ApiPath =
  '/api/agent-loop/conversations/:conversationId';
/** `GET` and `POST` the agent settings (`AGENT_SETTINGS_ROUTE`). */
export const AGENT_SETTINGS_PATH: ApiPath = '/api/agent-loop/settings';
/** `GET` the entities of a project by ID (`PROJECT_ENTITY_RESOLVE_ROUTE`). A template: see `entityResolvePath`. */
export const PROJECT_ENTITY_RESOLVE_PATH: ApiPath =
  '/api/project-store/projects/:projectId/entities/resolve';

/** Fills the history route's `:conversationId` with the id, encoded as one path segment. */
export function conversationPath(conversationId: string): ApiPath {
  return AGENT_CONVERSATION_PATH.replace(
    ':conversationId',
    encodeURIComponent(conversationId),
  ) as ApiPath;
}

/** Fills the resolve route's `:projectId` with the id, encoded as one path segment. */
export function entityResolvePath(projectId: string): ApiPath {
  return PROJECT_ENTITY_RESOLVE_PATH.replace(
    ':projectId',
    encodeURIComponent(projectId),
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
export const GROUNDING_VERDICT_VALUES = [
  'supported',
  'weak',
  'unsupported',
] as const;

/** The ten event types the page handles. */
export type ChatEventType =
  | 'run-started'
  | 'token-delta'
  | 'tool-call-started'
  | 'tool-call-args'
  | 'tool-call-result'
  | 'tool-call-error'
  | 'step-cap-reached'
  | 'run-ended'
  | 'grounding-started'
  | 'grounding-result';

/** One of the ten handled members of the agent loop's SSE union. */
export type ChatEvent = Extract<AgentLoopEvent, { type: ChatEventType }>;

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

/** A passage the verdict cites: its path (any string, as the contract has it), offset and snippet. */
function isPassage(value: unknown): boolean {
  return (
    isRecord(value) &&
    isText(value['path']) &&
    isInteger(value['offset'], 0) &&
    isText(value['snippet'])
  );
}

/** One checked claim: the text is filled, the verdict is one of the three, the passage is optional. */
function isGroundingClaim(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFilled(value['text']) &&
    isOneOf(GROUNDING_VERDICT_VALUES, value['verdict']) &&
    isOptional(value['passage'], isPassage)
  );
}

/**
 * A grounding result (the claims artefact, D11). The target path is any string, as the contract's
 * projectPathSchema is z.string(), so an empty path is accepted.
 */
export function isGroundingResult(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const claims = value['claims'];
  return (
    value['schemaVersion'] === 1 &&
    isText(value['targetPath']) &&
    Array.isArray(claims) &&
    claims.every(isGroundingClaim)
  );
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

/** The before and after text of a write: `base` is '' for a file that does not exist yet (AGL-14 D2). */
function isDiffPreview(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFilled(value['path']) &&
    isText(value['base']) &&
    isText(value['proposed'])
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
    isOptional(value['diffPreview'], isDiffPreview) &&
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
  const grounding = value['groundingResults'];
  return (
    isFilled(value['runId']) &&
    isFilled(value['conversationId']) &&
    isOneOf(RUN_STATUS_VALUES, value['status']) &&
    isInteger(value['step'], 0) &&
    isInteger(value['cap'], 1) &&
    isText(value['assistantText']) &&
    Array.isArray(cards) &&
    cards.every(isCard) &&
    Array.isArray(grounding) &&
    grounding.every(isGroundingResult) &&
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

/** The body of GET .../entities/resolve: each resolved entity has an ID, a type, a path and its content. */
function isEntityResolution(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const resolved = value['resolved'];
  const errors = value['errors'];
  return (
    Array.isArray(resolved) &&
    resolved.every(
      (entry: unknown) =>
        isRecord(entry) &&
        isFilled(entry['id']) &&
        isFilled(entry['type']) &&
        isFilled(entry['path']) &&
        isText(entry['content']),
    ) &&
    Array.isArray(errors) &&
    errors.every(
      (entry: unknown) =>
        isRecord(entry) &&
        isFilled(entry['id']) &&
        (entry['code'] === 'unknown' || entry['code'] === 'duplicate') &&
        isOptional(entry['paths'], Array.isArray),
    )
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

/** The body of GET .../entities/resolve (the source paths of a card). */
export const entityResolutionReply: ResponseSchema<EntityResolution> =
  replyOf(isEntityResolution);

/** The stop reply is ignored, so every body is accepted (D8). */
export const anyReply: ResponseSchema<unknown> = replyOf(() => true);

/** Whether an SSE envelope is one of the ten events the page handles, with the fields the page reads checked. */
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
        isOptional(data['diffPreview'], isDiffPreview) &&
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
    case 'grounding-started':
      return isText(data['targetPath']);
    case 'grounding-result':
      return isGroundingResult(data);
    default:
      return false;
  }
}

// The statuses a pending change can have (the Project store's pendingStatusSchema).
const PENDING_STATUS_VALUES = ['pending', 'accepted', 'rejected'] as const;

/**
 * Whether an SSE envelope is one of the three queue events of the Project store that the chat page reads (AGL-14 P8):
 * the project and the pending change's id and status are checked, and no other field.
 */
export function isQueueEvent(value: unknown): boolean {
  if (!isRecord(value) || value['module'] !== 'project-store') {
    return false;
  }
  const type = value['type'];
  if (
    type !== 'pending-created' &&
    type !== 'pending-updated' &&
    type !== 'pending-resolved'
  ) {
    return false;
  }
  const data = value['data'];
  if (!isRecord(data) || !isFilled(data['projectId'])) {
    return false;
  }
  const change = data['pendingChange'];
  return (
    isRecord(change) &&
    isFilled(change['id']) &&
    isOneOf(PENDING_STATUS_VALUES, change['status'])
  );
}
