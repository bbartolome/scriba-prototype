import type {
  CurrentRun,
  GraphIdResult,
  GraphList,
  GraphSummary,
  RunState,
} from '@bbartolome/scriba-contracts/graph-runner';
import type {
  PendingChange,
  PendingList,
} from '@bbartolome/scriba-contracts/project-store';
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

/** The rename command of one graph (`GRAPH_RENAME_ROUTE`), with its id encoded as one segment. */
export function graphRenamePath(id: string): ApiPath {
  return `/api/graph-runner/graphs/${encodeURIComponent(id)}/rename` as ApiPath;
}

/** The delete command of one graph (`GRAPH_DELETE_ROUTE`), with its id encoded as one segment. */
export function graphDeletePath(id: string): ApiPath {
  return `/api/graph-runner/graphs/${encodeURIComponent(id)}/delete` as ApiPath;
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
