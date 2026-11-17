import type {
  DraftVersion,
  DraftVersionList,
  DraftVersionRead,
} from '@bbartolome/scriba-contracts/project-store';
import type { ApiPath, ResponseSchema } from '../../shell';

// Hand-written copies of the draft version routes and response schemas, which the version history
// panel reads. This file imports only types from the contract: the browser ships no runtime zod, so a
// value import would not load. versions-contract.spec.ts (K1 and K2) checks each copy against the contract.

/** The version list route of one project (`PROJECT_VERSIONS_ROUTE`), with its id encoded as one path segment. */
export function draftVersionsPath(projectId: string): ApiPath {
  return '/api/project-store/projects/:projectId/versions'.replace(
    ':projectId',
    encodeURIComponent(projectId),
  ) as ApiPath;
}

/** The version read route of one project (`PROJECT_VERSION_ROUTE`), with its id encoded as one path segment. */
export function draftVersionReadPath(projectId: string): ApiPath {
  return '/api/project-store/projects/:projectId/versions/read'.replace(
    ':projectId',
    encodeURIComponent(projectId),
  ) as ApiPath;
}

/** The restore route of one project (`PROJECT_VERSION_RESTORE_ROUTE`), with its id encoded as one path segment. */
export function draftRestorePath(projectId: string): ApiPath {
  return '/api/project-store/projects/:projectId/versions/restore'.replace(
    ':projectId',
    encodeURIComponent(projectId),
  ) as ApiPath;
}

/** The rule of `isTopLevelDraft` (draft-versions.ts): a file directly in `drafts/`. */
const TOP_LEVEL_DRAFT = /^drafts\/[^/]+$/;

/** True for a path the version history covers: `drafts/<name>` with no further folder. */
export function isTopLevelDraftPath(path: string): boolean {
  return TOP_LEVEL_DRAFT.test(path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// The date part of zod 4's z.iso.datetime(), copied from zod's own source (no offset, seconds required).
const ISO_DATE = String.raw`(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))`;

// A UTC timestamp with a Z, as the contract's `createdAt` requires.
const UTC_DATETIME = new RegExp(
  String.raw`^${ISO_DATE}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?Z$`,
);

function isUtcDatetime(value: unknown): value is string {
  return typeof value === 'string' && UTC_DATETIME.test(value);
}

/** One version, checked as draftVersionSchema does. A key the schema does not name is dropped, as zod drops it. */
function versionOf(value: unknown): DraftVersion | undefined {
  if (!isRecord(value)) return undefined;
  const { id, createdAt, size } = value;
  if (
    typeof id !== 'string' ||
    id.length === 0 ||
    !isUtcDatetime(createdAt) ||
    typeof size !== 'number' ||
    !Number.isInteger(size) ||
    size < 0
  ) {
    return undefined;
  }
  return { id, createdAt, size };
}

/** Response of GET .../versions (`draftVersionListSchema`). */
export const draftVersionListCopy: ResponseSchema<DraftVersionList> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const { draftPath, versions } = fields;
    if (typeof draftPath !== 'string' || !Array.isArray(versions)) {
      return { success: false, error: 'the version list is not valid' };
    }
    const parsed: DraftVersion[] = [];
    for (const item of versions) {
      const version = versionOf(item);
      if (version === undefined) {
        return {
          success: false,
          error: 'a version does not match draftVersionSchema',
        };
      }
      parsed.push(version);
    }
    return { success: true, data: { draftPath, versions: parsed } };
  },
};

/** Response of GET .../versions/read and of POST .../versions/restore (`draftVersionReadSchema`). */
export const draftVersionReadCopy: ResponseSchema<DraftVersionRead> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const { draftPath, id, content } = fields;
    if (
      typeof draftPath !== 'string' ||
      typeof id !== 'string' ||
      id.length === 0 ||
      typeof content !== 'string'
    ) {
      return { success: false, error: 'the version text is not valid' };
    }
    return { success: true, data: { draftPath, id, content } };
  },
};
