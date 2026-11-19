import type {
  ManuscriptEntry,
  ManuscriptPart,
  ManuscriptStatus,
  ManuscriptView,
  ManuscriptWarning,
} from '@bbartolome/scriba-contracts/compile-export';
import type { ApiPath, ResponseSchema } from '../../shell';

// Hand-written copies of the manuscript's routes, values and response schema, which the outline page reads.
// This file imports only types from the contract: the browser ships no runtime zod, so a value import
// would not load. manuscript-contract.spec.ts (K1 to K3) checks each copy against the contract.

/** GET of the manuscript view (`MANUSCRIPT_ROUTE`). */
export const MANUSCRIPT_PATH = '/api/compile-export/manuscript' as ApiPath;
/** POST of a full reorder (`MANUSCRIPT_REORDER_ROUTE`). */
export const MANUSCRIPT_REORDER_PATH =
  '/api/compile-export/manuscript/reorder' as ApiPath;
/** POST of a status change (`MANUSCRIPT_STATUS_ROUTE`). */
export const MANUSCRIPT_STATUS_PATH =
  '/api/compile-export/manuscript/status' as ApiPath;
/** POST of a part change (`MANUSCRIPT_PART_ROUTE`). */
export const MANUSCRIPT_PART_PATH =
  '/api/compile-export/manuscript/part' as ApiPath;

/** The error code of a stale revision (`COMPILE_ERROR_CODES.ORDER_CONFLICT`). */
export const ORDER_CONFLICT_CODE = 'COMPILE_ORDER_CONFLICT';

/** The status values, in the contract's order (`MANUSCRIPT_STATUSES`). */
export const MANUSCRIPT_STATUS_VALUES = [
  'outline',
  'draft',
  'revised',
  'final',
] as const satisfies readonly ManuscriptStatus[];

/** The part values, in the contract's order (`MANUSCRIPT_PARTS`). */
export const MANUSCRIPT_PART_VALUES = [
  'front',
  'body',
  'back',
] as const satisfies readonly ManuscriptPart[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

// The shape of contentHashSchema: `sha256:` and 64 lowercase hex digits.
const REVISION = /^sha256:[0-9a-f]{64}$/;

// The shape of manuscriptPathSchema (MANUSCRIPT_PATH_PATTERN in project-store/order-export.ts).
const MANUSCRIPT_PATH_RE =
  /^drafts\/(?:(?!\.{1,2}(?:\/|$))[^/\\\0]+\/)*(?!\.{1,2}$)[^/\\\0]+$/;

function isRevision(value: unknown): value is string {
  return typeof value === 'string' && REVISION.test(value);
}

function isManuscriptPath(value: unknown): value is string {
  return typeof value === 'string' && MANUSCRIPT_PATH_RE.test(value);
}

function isStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** One entry, checked as manuscriptEntrySchema does. */
function entryOf(value: unknown): ManuscriptEntry | undefined {
  if (!isRecord(value)) return undefined;
  const { path, part, status, words, graphOrdered, inOrderField } = value;
  if (
    !isManuscriptPath(path) ||
    !MANUSCRIPT_PART_VALUES.includes(part as ManuscriptPart) ||
    !MANUSCRIPT_STATUS_VALUES.includes(status as ManuscriptStatus) ||
    !isNonNegativeInteger(words) ||
    typeof graphOrdered !== 'boolean' ||
    typeof inOrderField !== 'boolean'
  ) {
    return undefined;
  }
  return {
    path,
    part: part as ManuscriptPart,
    status: status as ManuscriptStatus,
    words,
    graphOrdered,
    inOrderField,
  };
}

/** One warning, checked as manuscriptWarningSchema does (the kind is the discriminator). */
function warningOf(value: unknown): ManuscriptWarning | undefined {
  if (!isRecord(value)) return undefined;
  const { kind } = value;
  if (kind === 'graphCycle' && isStrings(value['files'])) {
    return { kind, files: value['files'] };
  }
  if (
    (kind === 'invalidGraph' || kind === 'staleEntry') &&
    typeof value['path'] === 'string'
  ) {
    return { kind, path: value['path'] };
  }
  return undefined;
}

/** The view answered by GET the manuscript route and by each write (`manuscriptViewSchema`). */
export const manuscriptViewCopy: ResponseSchema<ManuscriptView> = {
  safeParse(data) {
    if (!isRecord(data)) {
      return { success: false, error: 'the view is not an object' };
    }
    const { entries, totals, orderSource, warnings, revision } = data;
    if (!Array.isArray(entries)) {
      return { success: false, error: 'entries is not a list' };
    }
    const parsedEntries: ManuscriptEntry[] = [];
    for (const item of entries) {
      const entry = entryOf(item);
      if (entry === undefined) {
        return { success: false, error: 'an entry does not match' };
      }
      parsedEntries.push(entry);
    }
    if (
      !isRecord(totals) ||
      !isNonNegativeInteger(totals['body']) ||
      !isNonNegativeInteger(totals['manuscript'])
    ) {
      return { success: false, error: 'totals do not match' };
    }
    if (
      orderSource !== 'alphabetical' &&
      orderSource !== 'project' &&
      orderSource !== 'graph+project'
    ) {
      return { success: false, error: 'orderSource is not a known source' };
    }
    if (!Array.isArray(warnings)) {
      return { success: false, error: 'warnings is not a list' };
    }
    const parsedWarnings: ManuscriptWarning[] = [];
    for (const item of warnings) {
      const warning = warningOf(item);
      if (warning === undefined) {
        return { success: false, error: 'a warning does not match' };
      }
      parsedWarnings.push(warning);
    }
    if (!isRevision(revision)) {
      return { success: false, error: 'revision is not a content hash' };
    }
    return {
      success: true,
      data: {
        entries: parsedEntries,
        totals: { body: totals['body'], manuscript: totals['manuscript'] },
        orderSource,
        warnings: parsedWarnings,
        revision,
      },
    };
  },
};

/** The data of manuscript-updated, when it has the shape of manuscriptUpdatedDataSchema. */
export function isManuscriptUpdatedData(
  data: unknown,
): data is { projectId: string; revision: string } {
  if (!isRecord(data)) return false;
  const { projectId, revision } = data;
  return (
    typeof projectId === 'string' &&
    projectId.length > 0 &&
    isRevision(revision)
  );
}

/** The data of files-changed, when it has the shape of filesChangedDataSchema. */
export function isFilesChangedData(
  data: unknown,
): data is { projectId: string; paths: string[] } {
  if (!isRecord(data)) return false;
  const { projectId, paths } = data;
  return (
    typeof projectId === 'string' &&
    projectId.length > 0 &&
    Array.isArray(paths) &&
    paths.every((path) => typeof path === 'string' && path.length > 0)
  );
}
