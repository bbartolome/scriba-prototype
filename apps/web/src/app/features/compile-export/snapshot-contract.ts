import type {
  SnapshotList,
  SnapshotSummary,
} from '@bbartolome/scriba-contracts/compile-export';
import type { ApiPath, ResponseSchema } from '../../shell';

// Hand-written copies of the snapshot routes, the pre-restore label and the response and event shapes
// that the snapshots panel reads. This file imports only types from the contract: the browser ships no
// runtime zod, so a value import would not load. snapshot-contract.spec.ts (K1 to K3) checks each copy.

/** GET lists the snapshots, POST creates one (`SNAPSHOTS_ROUTE`). */
export const SNAPSHOTS_PATH = '/api/compile-export/snapshots' as ApiPath;
/** POST restores a snapshot (`SNAPSHOT_RESTORE_ROUTE`). */
export const SNAPSHOT_RESTORE_PATH =
  '/api/compile-export/snapshots/restore' as ApiPath;

/**
 * The label the server gives the snapshot that a restore takes first (`PRE_RESTORE_LABEL` in the API).
 * The API's own test pins the same literal, so a change of either side fails a test (P10).
 */
export const PRE_RESTORE_LABEL = 'pre-restore';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

// The shape of z.iso.datetime() for a UTC time: a date, a time, optional fractional seconds, and `Z`.
const UTC_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function isUtcIso(value: unknown): value is string {
  return typeof value === 'string' && UTC_ISO.test(value);
}

/** One snapshot row, checked as snapshotSummarySchema does. */
function summaryOf(value: unknown): SnapshotSummary | undefined {
  if (!isRecord(value)) return undefined;
  const { id, label, createdAt, fileCount, words, unreadable } = value;
  if (typeof id !== 'string' || id.length === 0) return undefined;
  if (typeof label !== 'string') return undefined;
  if (!isUtcIso(createdAt)) return undefined;
  if (!isNonNegativeInteger(fileCount)) return undefined;
  if (unreadable !== undefined && typeof unreadable !== 'boolean') {
    return undefined;
  }
  let parsedWords: SnapshotSummary['words'];
  if (words === null) {
    parsedWords = null;
  } else if (
    isRecord(words) &&
    isNonNegativeInteger(words['body']) &&
    isNonNegativeInteger(words['total'])
  ) {
    parsedWords = { body: words['body'], total: words['total'] };
  } else {
    return undefined;
  }
  return unreadable === undefined
    ? { id, label, createdAt, fileCount, words: parsedWords }
    : { id, label, createdAt, fileCount, words: parsedWords, unreadable };
}

/** One snapshot, as the create route answers it (`snapshotSummarySchema`). */
export const snapshotSummaryCopy: ResponseSchema<SnapshotSummary> = {
  safeParse(data) {
    const summary = summaryOf(data);
    return summary === undefined
      ? { success: false, error: 'the snapshot does not match' }
      : { success: true, data: summary };
  },
};

/** The list answered by GET the snapshots route (`snapshotListSchema`). */
export const snapshotListCopy: ResponseSchema<SnapshotList> = {
  safeParse(data) {
    if (!isRecord(data)) {
      return { success: false, error: 'the list is not an object' };
    }
    const { snapshots } = data;
    if (!Array.isArray(snapshots)) {
      return { success: false, error: 'snapshots is not a list' };
    }
    const parsed: SnapshotSummary[] = [];
    for (const item of snapshots) {
      const summary = summaryOf(item);
      if (summary === undefined) {
        return { success: false, error: 'a snapshot does not match' };
      }
      parsed.push(summary);
    }
    return { success: true, data: { snapshots: parsed } };
  },
};

/** The data of snapshot-created and snapshot-restored, when it names a project (both schemas). */
export function isSnapshotEventData(
  data: unknown,
): data is { projectId: string } {
  if (!isRecord(data)) return false;
  const { projectId } = data;
  return typeof projectId === 'string' && projectId.length > 0;
}
