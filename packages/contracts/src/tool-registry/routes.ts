// Route constants of the tool-registry API. Every path is under /api/tool-registry.
// Reads are GET and never mutate; every command is a POST. Per-tool routes sit under /tools/:name.
// GET: TOOLS_ROUTE, TOOL_ROUTE, TOOL_BUILTIN_ROUTE, TOOL_USER_ROUTE, FUNCTIONS_ROUTE, ENTITY_TYPES_ROUTE.
// POST: LINT_ROUTE and the eight per-tool commands (validate, enabled, save, delete, render, execute).
export const TOOLS_ROUTE = '/api/tool-registry/tools' as const;
export const TOOL_ROUTE = '/api/tool-registry/tools/:name' as const;
export const TOOL_BUILTIN_ROUTE =
  '/api/tool-registry/tools/:name/builtin' as const;
export const TOOL_USER_ROUTE = '/api/tool-registry/tools/:name/user' as const;
export const FUNCTIONS_ROUTE = '/api/tool-registry/functions' as const;
export const ENTITY_TYPES_ROUTE = '/api/tool-registry/entity-types' as const;
export const LINT_ROUTE = '/api/tool-registry/lint' as const;
export const TOOL_VALIDATE_ROUTE =
  '/api/tool-registry/tools/:name/validate' as const;
export const TOOL_ENABLED_ROUTE =
  '/api/tool-registry/tools/:name/enabled' as const;
export const TOOL_SAVE_ROUTE = '/api/tool-registry/tools/:name/save' as const;
export const TOOL_DELETE_ROUTE =
  '/api/tool-registry/tools/:name/delete' as const;
export const TOOL_RENDER_ROUTE =
  '/api/tool-registry/tools/:name/render' as const;
export const TOOL_EXECUTE_ROUTE =
  '/api/tool-registry/tools/:name/execute' as const;
