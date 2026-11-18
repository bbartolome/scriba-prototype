// Route constants of the compile-export API. Every path is under /api/compile-export/ and names no project: the active project is implied.
// Reads are GET and never mutate; commands are POST. Read parameters travel in the query string.
// GET of the manuscript view.
export const MANUSCRIPT_ROUTE = '/api/compile-export/manuscript' as const;
// POST of a full reorder of the manuscript.
export const MANUSCRIPT_REORDER_ROUTE =
  '/api/compile-export/manuscript/reorder' as const;
// POST of a status change of one entry.
export const MANUSCRIPT_STATUS_ROUTE =
  '/api/compile-export/manuscript/status' as const;
// POST of a part change of one entry.
export const MANUSCRIPT_PART_ROUTE =
  '/api/compile-export/manuscript/part' as const;
// POST of a preflight run.
export const PREFLIGHT_ROUTE = '/api/compile-export/preflight' as const;
// POST of an export run.
export const EXPORT_ROUTE = '/api/compile-export/export' as const;
// GET of an exported file. It has no side effects.
export const EXPORT_DOWNLOAD_ROUTE =
  '/api/compile-export/exports/:format' as const;
// GET reads the export settings; POST writes them.
export const EXPORT_SETTINGS_ROUTE = '/api/compile-export/settings' as const;
// POST copies the default template of a format into the project.
export const EXPORT_COPY_DEFAULT_ROUTE =
  '/api/compile-export/template/copy-default' as const;
// GET lists the snapshots; POST creates one.
export const SNAPSHOTS_ROUTE = '/api/compile-export/snapshots' as const;
// POST restores a snapshot.
export const SNAPSHOT_RESTORE_ROUTE =
  '/api/compile-export/snapshots/restore' as const;
