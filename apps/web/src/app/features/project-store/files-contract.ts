import type {
  FileEntry,
  FileList,
} from '@bbartolome/scriba-contracts/project-store';
import type { ApiPath, ResponseSchema } from '../../shell';

// Hand-written copies of the file list's route and response schema, which the files page reads.
// This file imports only types from the contract: the browser ships no runtime zod, so a value import
// would not load. files-contract.spec.ts (K1 and K2) checks each copy against the contract.

/** The files route of one project (`PROJECT_FILES_ROUTE`), with its id encoded as one path segment. */
export function projectFilesPath(projectId: string): ApiPath {
  return '/api/project-store/projects/:projectId/files'.replace(
    ':projectId',
    encodeURIComponent(projectId),
  ) as ApiPath;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// The date part of zod 4's z.iso.datetime(), copied from zod's own source (no offset, seconds required).
const ISO_DATE = String.raw`(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))`;

// A UTC timestamp with a Z, as the contract's `mtime` requires.
const UTC_DATETIME = new RegExp(
  String.raw`^${ISO_DATE}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?Z$`,
);

function isUtcDatetime(value: unknown): value is string {
  return typeof value === 'string' && UTC_DATETIME.test(value);
}

/** One entry, checked as fileEntrySchema does. A key the schema does not name is dropped, as zod drops it. */
function entryOf(value: unknown): FileEntry | undefined {
  if (!isRecord(value)) return undefined;
  const { path, kind, size, mtime } = value;
  if (
    typeof path !== 'string' ||
    (kind !== 'file' && kind !== 'dir') ||
    typeof size !== 'number' ||
    !Number.isInteger(size) ||
    size < 0 ||
    !isUtcDatetime(mtime)
  ) {
    return undefined;
  }
  return { path, kind, size, mtime };
}

/** Response of GET .../files (`fileListSchema`). */
export const fileListCopy: ResponseSchema<FileList> = {
  safeParse(data) {
    const entries = isRecord(data) ? data['entries'] : undefined;
    if (!Array.isArray(entries)) {
      return { success: false, error: 'entries is not a list' };
    }
    const parsed: FileEntry[] = [];
    for (const item of entries) {
      const entry = entryOf(item);
      if (entry === undefined) {
        return { success: false, error: 'an entry does not match fileEntrySchema' };
      }
      parsed.push(entry);
    }
    return { success: true, data: { entries: parsed } };
  },
};
