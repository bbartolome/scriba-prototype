import type {
  ActiveProject,
  FileRead,
  FileWriteResult,
  ProjectList,
  ProjectStatus,
  ProjectSummary,
} from '@bbartolome/scriba-contracts/project-store';
import type { ApiPath, ResponseSchema } from './api-client';

// Hand-written copies of the project store's route constants and response schemas. The Shell ships
// no runtime zod, so these are checked against the contract by project-store-copies.spec.ts (E7).

/** Platform's active-project route (`ACTIVE_PROJECT_ROUTE` in routes.ts). */
export const ACTIVE_PROJECT_PATH = '/api/project-store/active';

/** Platform's project list route (`PROJECTS_ROUTE` in routes.ts). */
export const PROJECTS_PATH = '/api/project-store/projects';

// The project store's status values (`projectStatusSchema` in project.ts).
const PROJECT_STATUSES: readonly ProjectStatus[] = [
  'ok',
  'invalid',
  'too-new',
  'importable',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** One entry of the list, checked as `projectSummarySchema` does. */
function isSummary(value: unknown): value is ProjectSummary {
  if (!isRecord(value)) {
    return false;
  }
  const { id, title, genrePack, active, status, error } = value;
  return (
    typeof id === 'string' &&
    id !== '' &&
    (title === undefined || typeof title === 'string') &&
    (genrePack === undefined || typeof genrePack === 'string') &&
    typeof active === 'boolean' &&
    PROJECT_STATUSES.some((known) => known === status) &&
    (error === undefined || typeof error === 'string')
  );
}

/** Response of GET /api/project-store/active (`activeProjectSchema`): `active` is null or an id. */
export const activeProjectCopy: ResponseSchema<ActiveProject> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const active = fields['active'];
    if (active === null || (typeof active === 'string' && active !== '')) {
      return { success: true, data: { active } };
    }
    return { success: false, error: 'active is neither null nor a project id' };
  },
};

/**
 * Response of GET /api/project-store/projects (`projectListSchema`). The entries are returned as
 * received; zod would also strip keys it does not know, and the Shell reads only `id` and `title`.
 */
export const projectListCopy: ResponseSchema<ProjectList> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const projects = fields['projects'];
    if (Array.isArray(projects) && projects.every(isSummary)) {
      return { success: true, data: { projects } };
    }
    return { success: false, error: 'projects is not a list of summaries' };
  },
};

/** Platform's file read route (`PROJECT_FILE_ROUTE` in routes.ts). */
export const PROJECT_FILE_PATH = '/api/project-store/projects/:projectId/file';

/** Platform's file write route (`PROJECT_FILE_WRITE_ROUTE` in routes.ts). */
export const PROJECT_FILE_WRITE_PATH =
  '/api/project-store/projects/:projectId/file/write';

/** The read route of one project, with its id encoded as one path segment. */
export function projectFilePath(projectId: string): ApiPath {
  return PROJECT_FILE_PATH.replace(
    ':projectId',
    encodeURIComponent(projectId),
  ) as ApiPath;
}

/** The write route of one project, with its id encoded as one path segment. */
export function projectFileWritePath(projectId: string): ApiPath {
  return PROJECT_FILE_WRITE_PATH.replace(
    ':projectId',
    encodeURIComponent(projectId),
  ) as ApiPath;
}

// CONTENT_HASH_PATTERN: sha256: and 64 lowercase hex digits.
const CONTENT_HASH = /^sha256:[0-9a-f]{64}$/;

// The date part of zod 4's z.iso.datetime(), copied from zod's own source (no offset, seconds required).
const ISO_DATE = String.raw`(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))`;

// A UTC timestamp with a Z, as the contract's `mtime` requires.
const UTC_DATETIME = new RegExp(
  String.raw`^${ISO_DATE}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?Z$`,
);

function isContentHash(value: unknown): value is string {
  return typeof value === 'string' && CONTENT_HASH.test(value);
}

function isUtcDatetime(value: unknown): value is string {
  return typeof value === 'string' && UTC_DATETIME.test(value);
}

/** Response of GET .../file (`fileReadSchema`). A key the schema does not name is dropped, as zod drops it. */
export const readCopy: ResponseSchema<FileRead> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const { path, content, hash, mtime, upgraded } = fields;
    if (
      typeof path === 'string' &&
      typeof content === 'string' &&
      isContentHash(hash) &&
      isUtcDatetime(mtime) &&
      (upgraded === undefined || typeof upgraded === 'boolean')
    ) {
      return {
        success: true,
        data: {
          path,
          content,
          hash,
          mtime,
          ...(upgraded === undefined ? {} : { upgraded }),
        },
      };
    }
    return { success: false, error: 'not a file read' };
  },
};

/** Response of a file write (`fileWriteResultSchema`): the new hash, for the next save's base. */
export const writeResultCopy: ResponseSchema<FileWriteResult> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const { path, hash, mtime } = fields;
    if (
      typeof path === 'string' &&
      isContentHash(hash) &&
      isUtcDatetime(mtime)
    ) {
      return { success: true, data: { path, hash, mtime } };
    }
    return { success: false, error: 'not a file write result' };
  },
};
