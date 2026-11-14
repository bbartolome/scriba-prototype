// Route constants of the project-store API. Every path is under /api/project-store/.
// Project-scoped routes carry :projectId; the others name no project. Reads are GET and never mutate;
// commands are POST. Read parameters travel in the query string, because paths contain slashes.
// `:id` is a pending change id.
export const PROJECTS_ROUTE = '/api/project-store/projects' as const;
export const PROJECT_NEW_ROUTE = '/api/project-store/projects/new' as const;
export const PROJECT_IMPORT_ROUTE =
  '/api/project-store/projects/import' as const;
export const PROJECT_START_FROM_SAMPLE_ROUTE =
  '/api/project-store/projects/start-from-sample' as const;
export const SAMPLES_ROUTE = '/api/project-store/samples' as const;
export const ACTIVE_PROJECT_ROUTE = '/api/project-store/active' as const;

export const PROJECT_FILES_ROUTE =
  '/api/project-store/projects/:projectId/files' as const;
export const PROJECT_FILE_ROUTE =
  '/api/project-store/projects/:projectId/file' as const;
export const PROJECT_FILE_WRITE_ROUTE =
  '/api/project-store/projects/:projectId/file/write' as const;
export const PROJECT_FILE_EDIT_ROUTE =
  '/api/project-store/projects/:projectId/file/edit' as const;
export const PROJECT_FILE_DELETE_ROUTE =
  '/api/project-store/projects/:projectId/file/delete' as const;
export const PROJECT_FILE_MOVE_ROUTE =
  '/api/project-store/projects/:projectId/file/move' as const;

export const PROJECT_ENTITIES_ROUTE =
  '/api/project-store/projects/:projectId/entities' as const;
export const PROJECT_ENTITY_RESOLVE_ROUTE =
  '/api/project-store/projects/:projectId/entities/resolve' as const;
export const PROJECT_SEARCH_ROUTE =
  '/api/project-store/projects/:projectId/search' as const;
export const PROJECT_REBUILD_ROUTE =
  '/api/project-store/projects/:projectId/rebuild' as const;

export const PROJECT_PENDING_ROUTE =
  '/api/project-store/projects/:projectId/pending' as const;
export const PROJECT_PENDING_ACCEPT_ROUTE =
  '/api/project-store/projects/:projectId/pending/:id/accept' as const;
export const PROJECT_PENDING_REJECT_ROUTE =
  '/api/project-store/projects/:projectId/pending/:id/reject' as const;
export const PROJECT_PENDING_REFRESH_ROUTE =
  '/api/project-store/projects/:projectId/pending/:id/refresh' as const;
export const PROJECT_PENDING_ACCEPT_ANYWAY_ROUTE =
  '/api/project-store/projects/:projectId/pending/:id/accept-anyway' as const;

export const PROJECT_VERSIONS_ROUTE =
  '/api/project-store/projects/:projectId/versions' as const;
export const PROJECT_VERSION_ROUTE =
  '/api/project-store/projects/:projectId/versions/read' as const;
export const PROJECT_VERSION_RESTORE_ROUTE =
  '/api/project-store/projects/:projectId/versions/restore' as const;
