import type {
  CurrentRun,
  GraphDetail,
  GraphIdResult,
  GraphList,
  GraphSummary,
  RunState,
  ValidationResult,
} from '@bbartolome/scriba-contracts/graph-runner';
import type {
  PendingChange,
  PendingList,
} from '@bbartolome/scriba-contracts/project-store';
import type {
  ToolList,
  ToolViews,
} from '@bbartolome/scriba-contracts/tool-registry';
import type { ApiPath, ResponseSchema } from '../../shell';

// Hand-written copies of the graph-runner routes and the response schemas the graphs list reads.
// This file imports only types from the contract: the browser ships no runtime zod, so a value import
// would not load. graph-runner-contract.spec.ts checks each copy against the contract.

/** The graph list (`GRAPHS_ROUTE`). */
export const GRAPHS_PATH = '/api/graph-runner/graphs' as ApiPath;

/** The current-run read (`RUN_CURRENT_ROUTE`). */
export const RUN_CURRENT_PATH = '/api/graph-runner/runs/current' as ApiPath;

/** The create command (`GRAPH_CREATE_ROUTE`). */
export const GRAPH_CREATE_PATH = '/api/graph-runner/graphs/create' as ApiPath;

/** The read of one graph (`GRAPH_ROUTE`), with its id encoded as one segment. */
export function graphPath(id: string): ApiPath {
  return `/api/graph-runner/graphs/${encodeURIComponent(id)}` as ApiPath;
}

/** The whole-file save of one graph (`GRAPH_SAVE_ROUTE`), with its id encoded as one segment. */
export function graphSavePath(id: string): ApiPath {
  return `/api/graph-runner/graphs/${encodeURIComponent(id)}/save` as ApiPath;
}

/** The rename command of one graph (`GRAPH_RENAME_ROUTE`), with its id encoded as one segment. */
export function graphRenamePath(id: string): ApiPath {
  return `/api/graph-runner/graphs/${encodeURIComponent(id)}/rename` as ApiPath;
}

/** The delete command of one graph (`GRAPH_DELETE_ROUTE`), with its id encoded as one segment. */
export function graphDeletePath(id: string): ApiPath {
  return `/api/graph-runner/graphs/${encodeURIComponent(id)}/delete` as ApiPath;
}

/** The graph validate command (`GRAPH_VALIDATE_ROUTE`): the unsaved file, answered with its issues. */
export function graphValidatePath(): ApiPath {
  return '/api/graph-runner/graphs/validate' as ApiPath;
}

/** The tool list (`TOOLS_ROUTE`). */
export const TOOLS_PATH = '/api/tool-registry/tools' as ApiPath;

/** The detail of one tool (`TOOL_ROUTE`), with its name encoded as one segment. */
export function toolPath(name: string): ApiPath {
  return `/api/tool-registry/tools/${encodeURIComponent(name)}` as ApiPath;
}

/** The open-change list of one project (`PROJECT_PENDING_ROUTE`), with its id encoded as one segment. */
export function pendingPath(projectId: string): ApiPath {
  return `/api/project-store/projects/${encodeURIComponent(projectId)}/pending` as ApiPath;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// A UTC timestamp with a Z, as z.iso.datetime() accepts it without an offset.
const UTC_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function isUtcDatetime(value: unknown): value is string {
  return typeof value === 'string' && UTC_DATETIME.test(value);
}

// The graph id pattern (`GRAPH_ID_PATTERN` in constants.ts).
const GRAPH_ID = /^[a-z0-9][a-z0-9-]*$/;

const RUN_STATUSES = ['running', 'done', 'error', 'stopped'];
const PENDING_STATUSES = ['pending', 'accepted', 'rejected'];

/** One row of the graph list, checked as `graphSummarySchema` does. */
function summaryOf(value: unknown): GraphSummary | undefined {
  if (!isRecord(value)) return undefined;
  const { id, name, view, nodeCount, mtime, valid } = value;
  if (
    typeof id !== 'string' ||
    !GRAPH_ID.test(id) ||
    typeof name !== 'string' ||
    (view !== null && view !== 'story' && view !== 'recipe') ||
    !(
      nodeCount === null ||
      (typeof nodeCount === 'number' &&
        Number.isInteger(nodeCount) &&
        nodeCount >= 0)
    ) ||
    !isUtcDatetime(mtime) ||
    typeof valid !== 'boolean'
  ) {
    return undefined;
  }
  return { id, name, view, nodeCount, mtime, valid } as GraphSummary;
}

/** Response of GET /api/graph-runner/graphs (`graphListSchema`). Keys the schema does not name are refused. */
export const graphListCopy: ResponseSchema<GraphList> = {
  safeParse(data) {
    if (!isRecord(data)) {
      return { success: false, error: 'the reply is not an object' };
    }
    if (Object.keys(data).some((key) => key !== 'graphs')) {
      return { success: false, error: 'an unknown key is present' };
    }
    const graphs = data['graphs'];
    if (!Array.isArray(graphs)) {
      return { success: false, error: 'graphs is not a list' };
    }
    const parsed: GraphSummary[] = [];
    for (const item of graphs) {
      const row = summaryOf(item);
      if (row === undefined) {
        return { success: false, error: 'a graph row is not valid' };
      }
      parsed.push(row);
    }
    return { success: true, data: { graphs: parsed } };
  },
};

/** Response of GET /api/graph-runner/runs/current (`currentRunSchema`): `{run}`, the run or null. */
export const currentRunCopy: ResponseSchema<CurrentRun> = {
  safeParse(data) {
    if (!isRecord(data) || !('run' in data)) {
      return { success: false, error: 'run is missing' };
    }
    const run = data['run'];
    if (run === null) return { success: true, data: { run: null } };
    if (
      !isRecord(run) ||
      typeof run['runId'] !== 'string' ||
      run['runId'] === '' ||
      typeof run['graphId'] !== 'string' ||
      !GRAPH_ID.test(run['graphId']) ||
      typeof run['status'] !== 'string' ||
      !RUN_STATUSES.includes(run['status']) ||
      !isUtcDatetime(run['startedAt']) ||
      !isRecord(run['inputs']) ||
      !isRecord(run['targets']) ||
      !isRecord(run['nodes']) ||
      !Array.isArray(run['pendingChangeIds']) ||
      !run['pendingChangeIds'].every(
        (id) => typeof id === 'string' && id !== '',
      )
    ) {
      return { success: false, error: 'the run is not valid' };
    }
    return { success: true, data: { run: run as unknown as RunState } };
  },
};

/** One pending change, checked for the fields the graphs list reads and the others `pendingChangeSchema` requires. */
function changeOf(value: unknown): PendingChange | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value['id'] !== 'string' ||
    value['id'] === '' ||
    typeof value['projectId'] !== 'string' ||
    value['projectId'] === '' ||
    typeof value['targetPath'] !== 'string' ||
    (value['kind'] !== 'create' && value['kind'] !== 'modify') ||
    typeof value['diff'] !== 'string' ||
    typeof value['proposed'] !== 'string' ||
    typeof value['status'] !== 'string' ||
    !PENDING_STATUSES.includes(value['status']) ||
    !isUtcDatetime(value['createdAt']) ||
    !isUtcDatetime(value['updatedAt'])
  ) {
    return undefined;
  }
  return value as unknown as PendingChange;
}

/** Response of GET .../pending (`pendingListSchema`): the open changes. */
export const pendingListCopy: ResponseSchema<PendingList> = {
  safeParse(data) {
    const changes = isRecord(data) ? data['changes'] : undefined;
    if (!Array.isArray(changes)) {
      return { success: false, error: 'changes is not a list' };
    }
    const parsed: PendingChange[] = [];
    for (const item of changes) {
      const change = changeOf(item);
      if (change === undefined) {
        return { success: false, error: 'a change is not valid' };
      }
      parsed.push(change);
    }
    return { success: true, data: { changes: parsed } };
  },
};

/** Response of a create or a rename (`graphIdResultSchema`): `{id}`. */
export const graphIdCopy: ResponseSchema<GraphIdResult> = {
  safeParse(data) {
    if (!isRecord(data) || Object.keys(data).some((key) => key !== 'id')) {
      return { success: false, error: 'the reply is not {id}' };
    }
    const id = data['id'];
    if (typeof id !== 'string' || !GRAPH_ID.test(id)) {
      return { success: false, error: 'id is not a graph id' };
    }
    return { success: true, data: { id } };
  },
};

/** The empty reply of a delete: a null body, which the client parses (A2). */
export const noBodyCopy: ResponseSchema<null> = {
  safeParse(data) {
    return data === null
      ? { success: true, data: null }
      : { success: false, error: 'the reply is not empty' };
  },
};

/** One validation issue, checked for the fields the canvas reads and the others `validationIssueSchema` requires. */
function issueOf(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value['code'] === 'string' &&
    typeof value['message'] === 'string' &&
    (value['severity'] === 'error' || value['severity'] === 'warning') &&
    ['nodeId', 'edgeId', 'portId'].every(
      (key) =>
        value[key] === undefined ||
        (typeof value[key] === 'string' && value[key] !== ''),
    )
  );
}

/** Response of a save (`validationResultSchema`): `{issues}`. Keys the schema does not name are refused. */
export const validationResultCopy: ResponseSchema<ValidationResult> = {
  safeParse(data) {
    if (!isRecord(data) || Object.keys(data).some((key) => key !== 'issues')) {
      return { success: false, error: 'the reply is not {issues}' };
    }
    const issues = data['issues'];
    if (!Array.isArray(issues) || !issues.every(issueOf)) {
      return { success: false, error: 'an issue is not valid' };
    }
    return {
      success: true,
      data: { issues: issues as ValidationResult['issues'] },
    };
  },
};

// The fields of a graph file that the canvas reads: the envelope, and for each node and edge its id,
// kind and position (nodes) or its ends (edges). The server's parse is the authority for the rest.
function graphFieldsOk(graph: unknown): boolean {
  if (!isRecord(graph)) return false;
  if (
    graph['schemaVersion'] !== 1 ||
    (graph['view'] !== 'story' && graph['view'] !== 'recipe') ||
    typeof graph['name'] !== 'string' ||
    graph['name'] === '' ||
    !Array.isArray(graph['nodes']) ||
    !Array.isArray(graph['edges'])
  ) {
    return false;
  }
  const nodesOk = graph['nodes'].every(
    (node) =>
      isRecord(node) &&
      typeof node['id'] === 'string' &&
      typeof node['kind'] === 'string' &&
      isRecord(node['position']) &&
      typeof node['position']['x'] === 'number' &&
      typeof node['position']['y'] === 'number',
  );
  const edgesOk = graph['edges'].every(
    (edge) =>
      isRecord(edge) &&
      typeof edge['id'] === 'string' &&
      typeof edge['from'] === 'string' &&
      typeof edge['to'] === 'string',
  );
  return nodesOk && edgesOk;
}

/**
 * Response of a read (`graphDetailSchema`): `{graph, issues}`. Keys the schema does not name are refused.
 * On success the graph object is returned as received, not rebuilt, so the save sends its keys and values.
 */
export const graphDetailCopy: ResponseSchema<GraphDetail> = {
  safeParse(data) {
    if (
      !isRecord(data) ||
      Object.keys(data).some((key) => key !== 'graph' && key !== 'issues')
    ) {
      return { success: false, error: 'the reply is not {graph, issues}' };
    }
    if (!graphFieldsOk(data['graph'])) {
      return { success: false, error: 'the graph is not valid' };
    }
    const checked = validationResultCopy.safeParse({ issues: data['issues'] });
    if (!checked.success) {
      return { success: false, error: 'the issues are not valid' };
    }
    return {
      success: true,
      data: {
        graph: data['graph'] as GraphDetail['graph'],
        issues: checked.data.issues,
      },
    };
  },
};

// The tool origins and output kinds and the port types of the tool registry (its constants.ts).
const TOOL_ORIGINS = ['core', 'nonfiction', 'fiction', 'user'];
const BUILTIN_ORIGINS = ['core', 'nonfiction', 'fiction'];
const OUTPUT_KINDS = ['draft', 'entity', 'claims', 'graph', 'check', null];
const PORT_TYPES = ['text', 'entity', 'style'];

/** One row of the tool list, checked for the fields the canvas reads and the others `toolSummarySchema` requires. */
function toolRowOf(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const counts = value['lintCounts'];
  return (
    typeof value['name'] === 'string' &&
    value['name'] !== '' &&
    typeof value['description'] === 'string' &&
    OUTPUT_KINDS.includes(value['output'] as string | null) &&
    typeof value['enabled'] === 'boolean' &&
    typeof value['valid'] === 'boolean' &&
    TOOL_ORIGINS.includes(value['origin'] as string) &&
    (value['overrides'] === undefined ||
      BUILTIN_ORIGINS.includes(value['overrides'] as string)) &&
    isRecord(counts) &&
    typeof counts['errors'] === 'number' &&
    typeof counts['warnings'] === 'number' &&
    (value['error'] === undefined || isRecord(value['error']))
  );
}

/** Response of GET /api/tool-registry/tools (`toolListSchema`): `{tools}`. Keys the schema does not name are kept. */
export const toolListCopy: ResponseSchema<ToolList> = {
  safeParse(data) {
    const tools = isRecord(data) ? data['tools'] : undefined;
    if (!Array.isArray(tools) || !tools.every(toolRowOf)) {
      return { success: false, error: 'a tool row is not valid' };
    }
    return { success: true, data: { tools: tools as ToolList['tools'] } };
  },
};

/** The ports and form of one tool's views: the fields the canvas reads (`toolViewsSchema`). */
function viewsOk(value: unknown): boolean {
  if (value === null) return true;
  if (!isRecord(value) || !isRecord(value['functionSchema'])) return false;
  const form = value['form'];
  const ports = value['ports'];
  if (!isRecord(form) || !Array.isArray(form['fields'])) return false;
  if (
    !isRecord(ports) ||
    !Array.isArray(ports['inputs']) ||
    !Array.isArray(ports['params'])
  ) {
    return false;
  }
  const output = ports['output'];
  if (
    !isRecord(output) ||
    output['key'] !== 'output' ||
    output['type'] !== 'text' ||
    !OUTPUT_KINDS.includes(output['kind'] as string | null)
  ) {
    return false;
  }
  const inputsOk = ports['inputs'].every(
    (port) =>
      isRecord(port) &&
      typeof port['key'] === 'string' &&
      port['key'] !== '' &&
      PORT_TYPES.includes(port['type'] as string) &&
      typeof port['list'] === 'boolean' &&
      typeof port['required'] === 'boolean' &&
      typeof port['title'] === 'string',
  );
  const fieldsOk = form['fields'].every(
    (field) =>
      isRecord(field) &&
      typeof field['key'] === 'string' &&
      field['key'] !== '' &&
      typeof field['control'] === 'string' &&
      typeof field['port'] === 'boolean' &&
      'default' in field,
  );
  return inputsOk && fieldsOk;
}

/** Response of GET /api/tool-registry/tools/:name (`toolDetailSchema`), read for its views: `{views}` (null for an invalid tool). */
export const toolViewsCopy: ResponseSchema<{ views: ToolViews | null }> = {
  safeParse(data) {
    if (!isRecord(data) || !('views' in data) || !viewsOk(data['views'])) {
      return { success: false, error: 'the views are not valid' };
    }
    return {
      success: true,
      data: { views: data['views'] as ToolViews | null },
    };
  },
};
