import type {
  ActiveProject,
  ProjectList,
  ProjectStatus,
  ProjectSummary,
  Sample,
} from '@bbartolome/scriba-contracts/project-store';
import type { ApiPath, ResponseSchema } from '../../shell';

// Hand-written copies of the project store's route paths and response schemas that the first-project
// step reads. This file imports only types from the contract: the browser ships no runtime zod, so a
// value import would not load. first-project-copy.spec.ts (FC1) checks each copy against the contract.

/** `GET` the project list (`PROJECTS_ROUTE`). */
export const PROJECTS_PATH: ApiPath = '/api/project-store/projects';

/** `GET` the sample list (`SAMPLES_ROUTE`). */
export const SAMPLES_PATH: ApiPath = '/api/project-store/samples';

/** `POST` a new project (`PROJECT_NEW_ROUTE`). */
export const PROJECT_NEW_PATH: ApiPath = '/api/project-store/projects/new';

/** `POST` the import of a folder (`PROJECT_IMPORT_ROUTE`). */
export const PROJECT_IMPORT_PATH: ApiPath =
  '/api/project-store/projects/import';

/** `POST` a project made from a sample (`PROJECT_START_FROM_SAMPLE_ROUTE`). */
export const PROJECT_START_FROM_SAMPLE_PATH: ApiPath =
  '/api/project-store/projects/start-from-sample';

/** `GET` and `POST` the active project (`ACTIVE_PROJECT_ROUTE`). */
export const ACTIVE_PROJECT_PATH: ApiPath = '/api/project-store/active';

// The status values of projectStatusSchema.
const PROJECT_STATUSES: readonly ProjectStatus[] = [
  'ok',
  'invalid',
  'too-new',
  'importable',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** One summary, checked as projectSummarySchema does. Keys the schema does not name are ignored. */
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

/** One sample, checked as sampleSchema does. */
function isSample(value: unknown): value is Sample {
  if (!isRecord(value)) {
    return false;
  }
  const { id, title, description } = value;
  return (
    typeof id === 'string' &&
    id !== '' &&
    typeof title === 'string' &&
    typeof description === 'string'
  );
}

/** Response of GET .../projects (`projectListSchema`). */
export const projectListCopy: ResponseSchema<ProjectList> = {
  safeParse(data) {
    const projects = isRecord(data) ? data['projects'] : undefined;
    if (Array.isArray(projects) && projects.every(isSummary)) {
      return { success: true, data: { projects } };
    }
    return { success: false, error: 'projects is not a list of summaries' };
  },
};

/**
 * Response of a create, an import or a start from a sample (`projectSummarySchema`): the summary of
 * the one project.
 */
export const projectSummaryCopy: ResponseSchema<ProjectSummary> = {
  safeParse(data) {
    if (isSummary(data)) {
      return { success: true, data };
    }
    return { success: false, error: 'not a project summary' };
  },
};

/** Response of GET .../active and of POST .../active (`activeProjectSchema`): `active` is null or an id. */
export const activeCopy: ResponseSchema<ActiveProject> = {
  safeParse(data) {
    const active = isRecord(data) ? data['active'] : undefined;
    if (active === null || (typeof active === 'string' && active !== '')) {
      return { success: true, data: { active } };
    }
    return { success: false, error: 'active is neither null nor a project id' };
  },
};

/** Response of GET .../samples (`sampleListSchema`). */
export const sampleListCopy: ResponseSchema<Sample[]> = {
  safeParse(data) {
    if (Array.isArray(data) && data.every(isSample)) {
      return { success: true, data };
    }
    return { success: false, error: 'not a list of samples' };
  },
};
