import type {
  PendingChange,
  PendingEventData,
  PendingList,
} from '@bbartolome/scriba-contracts/project-store';
import type { ApiPath, ResponseSchema } from '../../shell';

// Hand-written copies of the pending-change routes and response schemas that the review page reads.
// This file imports only types from the contract: the browser ships no runtime zod, so a value import
// would not load. review-contract.spec.ts (K1 and K2) checks each copy against the contract.

/** The four commands on one open change. Each is a POST. */
export type PendingAction = 'accept' | 'reject' | 'refresh' | 'accept-anyway';

/** The open-change list of one project (`PROJECT_PENDING_ROUTE`), with its id encoded as one segment. */
export function pendingListPath(projectId: string): ApiPath {
  return '/api/project-store/projects/:projectId/pending'.replace(
    ':projectId',
    encodeURIComponent(projectId),
  ) as ApiPath;
}

/** One command on one change (`PROJECT_PENDING_*_ROUTE`), with its ids encoded as path segments. */
export function pendingActionPath(
  projectId: string,
  id: string,
  action: PendingAction,
): ApiPath {
  return `/api/project-store/projects/${encodeURIComponent(projectId)}/pending/${encodeURIComponent(id)}/${action}` as ApiPath;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

// The date part of zod 4's z.iso.datetime(), copied from zod's own source (no offset, seconds required).
const ISO_DATE = String.raw`(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))`;

// A UTC timestamp with a Z, as the contract's `z.iso.datetime()` fields take.
const UTC_DATETIME = new RegExp(
  String.raw`^${ISO_DATE}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?Z$`,
);

function isUtcDatetime(value: unknown): value is string {
  return typeof value === 'string' && UTC_DATETIME.test(value);
}

// A content hash: sha256: followed by 64 lowercase hex digits (`CONTENT_HASH_PATTERN`).
const CONTENT_HASH = /^sha256:[0-9a-f]{64}$/;

// The origin union (`pendingOriginSchema`).
function isOrigin(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value['kind'] === 'agent-run') {
    return (
      isNonEmptyString(value['runId']) &&
      (value['toolCallId'] === undefined ||
        typeof value['toolCallId'] === 'string')
    );
  }
  if (value['kind'] === 'recipe-run') {
    return (
      isNonEmptyString(value['runId']) &&
      isNonEmptyString(value['graphId']) &&
      isNonEmptyString(value['nodeId'])
    );
  }
  return false;
}

// The grounding summary (`pendingGroundingSchema`).
function isGrounding(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isNonNegativeInteger(value['supported']) &&
    isNonNegativeInteger(value['weak']) &&
    isNonNegativeInteger(value['unsupported']) &&
    isUtcDatetime(value['checkedAt'])
  );
}

// The conflict summary (`pendingConflictSchema`).
function isConflict(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    (value['reason'] === 'base-changed' ||
      value['reason'] === 'target-missing' ||
      value['reason'] === 'target-exists') &&
    isUtcDatetime(value['detectedAt'])
  );
}

// The captured base (`capturedBase`): null, or a hash and the text it hashes.
function isCapturedBase(value: unknown): boolean {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  return (
    typeof value['hash'] === 'string' &&
    CONTENT_HASH.test(value['hash']) &&
    typeof value['content'] === 'string'
  );
}

/** One pending change, checked as `pendingChangeSchema` does. Keys the schema does not name are ignored. */
function isChange(value: unknown): value is PendingChange {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value['id']) &&
    isNonEmptyString(value['projectId']) &&
    typeof value['targetPath'] === 'string' &&
    (value['kind'] === 'create' || value['kind'] === 'modify') &&
    typeof value['diff'] === 'string' &&
    isCapturedBase(value['capturedBase']) &&
    typeof value['proposed'] === 'string' &&
    isOrigin(value['origin']) &&
    (value['provenance'] === undefined || isRecord(value['provenance'])) &&
    (value['grounding'] === undefined || isGrounding(value['grounding'])) &&
    (value['status'] === 'pending' ||
      value['status'] === 'accepted' ||
      value['status'] === 'rejected') &&
    (value['conflict'] === null || isConflict(value['conflict'])) &&
    isUtcDatetime(value['createdAt']) &&
    isUtcDatetime(value['updatedAt'])
  );
}

/** Response of GET .../pending (`pendingListSchema`): the open changes. */
export const pendingListCopy: ResponseSchema<PendingList> = {
  safeParse(data) {
    const changes = isRecord(data) ? data['changes'] : undefined;
    if (!Array.isArray(changes) || !changes.every(isChange)) {
      return { success: false, error: 'changes is not a list of changes' };
    }
    return { success: true, data: { changes } };
  },
};

/** The answer of an action on one change (`pendingChangeSchema`). */
export const pendingChangeCopy: ResponseSchema<PendingChange> = {
  safeParse(data) {
    if (!isChange(data)) {
      return { success: false, error: 'not a pending change' };
    }
    return { success: true, data };
  },
};

/** The data of the three pending events (`pendingEventDataSchema`): the project and its change. */
export const pendingEventCopy: ResponseSchema<PendingEventData> = {
  safeParse(data) {
    if (!isRecord(data)) {
      return { success: false, error: 'event data is not an object' };
    }
    const { projectId, pendingChange } = data;
    if (!isNonEmptyString(projectId) || !isChange(pendingChange)) {
      return { success: false, error: 'event data does not match' };
    }
    return { success: true, data: { projectId, pendingChange } };
  },
};
