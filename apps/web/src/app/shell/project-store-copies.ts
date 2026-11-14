import type {
  ActiveProject,
  ProjectList,
  ProjectStatus,
  ProjectSummary,
} from '@bbartolome/scriba-contracts/project-store';
import type { ResponseSchema } from './api-client';

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
