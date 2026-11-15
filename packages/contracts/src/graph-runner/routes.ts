// Routes of the graph-runner module. Reads are GET and never mutate; every command is POST.
// The `:id` segment is the graph id.

// The graph list (GET) and the graph routes (GET for the detail, POST for the rest).
export const GRAPHS_ROUTE = '/api/graph-runner/graphs' as const;
export const GRAPH_ROUTE = '/api/graph-runner/graphs/:id' as const;
export const GRAPH_CREATE_ROUTE = '/api/graph-runner/graphs/create' as const;
export const GRAPH_VALIDATE_ROUTE =
  '/api/graph-runner/graphs/validate' as const;
export const GRAPH_SAVE_ROUTE = '/api/graph-runner/graphs/:id/save' as const;
export const GRAPH_RENAME_ROUTE =
  '/api/graph-runner/graphs/:id/rename' as const;
export const GRAPH_DELETE_ROUTE =
  '/api/graph-runner/graphs/:id/delete' as const;

// The run routes: start (POST), stop (POST, body {runId}) and the current run (GET).
export const RUNS_ROUTE = '/api/graph-runner/runs' as const;
export const RUN_STOP_ROUTE = '/api/graph-runner/runs/stop' as const;
export const RUN_CURRENT_ROUTE = '/api/graph-runner/runs/current' as const;
