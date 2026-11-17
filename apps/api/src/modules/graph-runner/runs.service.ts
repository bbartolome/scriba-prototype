import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  type CurrentRun,
  type InputParams,
  type InputValue,
  type NodeRunState,
  type NodeRunStatus,
  type RecipeGraph,
  type RecipeNode,
  type RunError,
  type RunStartRequest,
  type RunStartResult,
  type RunState,
  type RunStatus,
} from '@bbartolome/scriba-contracts/graph-runner';
import { PROJECT_ERROR_CODES } from '@bbartolome/scriba-contracts/project-store';
import {
  TOOL_ERROR_CODES,
  TOOL_ERROR_STATUS,
  type ResolvedEntity,
  type ToolCallResult,
} from '@bbartolome/scriba-contracts/tool-registry';
import { PLATFORM_ERROR_CODES } from '@bbartolome/scriba-contracts/platform';
import { EventsPublisher, ModuleError } from '../platform/platform.module';
import {
  EntitiesService,
  FilesService,
} from '../project-store/project-store.module';
import {
  CatalogService,
  ExecutorService,
} from '../tool-registry/tool-registry.module';
import { graphError, GraphRunnerService } from './graph-runner.service';
import { orderOf, nodeOfPort, scopeOf } from './run-scope';

// Every message of the run routes. Fixed strings only; no input value is echoed.
const MESSAGES = {
  VIEW_NOT_RUNNABLE: 'Only a recipe can be run. This graph is a story.',
  VALIDATION_FAILED:
    'The recipe has blocking validation errors. Fix them before it runs.',
  TARGET_INVALID:
    'A target or an output path does not name a node of the right kind in this recipe.',
  INPUT_MISSING: 'An input node in the run has no value.',
  INPUT_INVALID:
    'An input value does not match its input node, or names a file that cannot be read.',
  RUN_ACTIVE: 'A run is already active in this project.',
  ENTITY_UNRESOLVED:
    'An entity of a tool node is unknown or names more than one entity.',
  INTERNAL: 'The run failed inside Scriba.',
} as const;

// The project-store codes that mean a file cannot be read as an input (P5).
const UNREADABLE_FILE_CODES: readonly string[] = [
  PROJECT_ERROR_CODES.PATH_INVALID,
  PROJECT_ERROR_CODES.PATH_OUTSIDE,
  PROJECT_ERROR_CODES.PATH_RESERVED,
  PROJECT_ERROR_CODES.NOT_FOUND,
  PROJECT_ERROR_CODES.NOT_TEXT,
  PROJECT_ERROR_CODES.FILE_TOO_LARGE,
  PROJECT_ERROR_CODES.SCHEMA_TOO_NEW,
];

type RecipeToolNode = Extract<RecipeNode, { kind: 'tool' }>;

// A file read at run start: its path, its text and its sha256 hash (P5, P6). Private to the run.
interface CapturedFile {
  path: string;
  content: string;
  hash: string;
}

// The private record of one run (P6). The state is the public shape; the rest never leaves the service.
interface RunRecord {
  projectId: string;
  recipe: RecipeGraph;
  order: string[];
  state: RunState;
  // The captured reads, by input node id.
  files: Map<string, CapturedFile>;
  // The tool results, by node id, kept in memory only.
  results: Map<string, ToolCallResult>;
  controller: AbortController;
}

// The runs of one project: at most one active run, and the last finished one (P6).
interface ProjectRuns {
  active?: RunRecord;
  last?: RunRecord;
}

// Whether an input value fits the port type of its input node (P4).
function fits(type: InputParams['type'], value: InputValue): boolean {
  switch (type) {
    case 'text':
      return value.kind === 'text' || value.kind === 'file';
    case 'entity':
      return value.kind === 'entities';
    case 'style':
      return value.kind === 'style';
    default:
      return false;
  }
}

// The node of each id of a recipe.
function nodesOf(recipe: RecipeGraph): Map<string, RecipeNode> {
  return new Map(recipe.nodes.map((node) => [node.id, node]));
}

// The error of a node: a module error with its own code and message, or the platform's internal error (P11).
function failureOf(error: unknown): RunError {
  if (error instanceof ModuleError) {
    return { code: error.code, message: error.message };
  }
  return { code: PLATFORM_ERROR_CODES.INTERNAL, message: MESSAGES.INTERNAL };
}

// The run engine's service: the start, the current run, the sequential topological run and its events (S1 to S11).
@Injectable()
export class RunsService {
  private readonly registry = new Map<string, ProjectRuns>();

  constructor(
    private readonly graphs: GraphRunnerService,
    private readonly files: FilesService,
    private readonly entities: EntitiesService,
    private readonly catalog: CatalogService,
    private readonly executor: ExecutorService,
    private readonly events: EventsPublisher,
  ) {}

  // Starts a run (P2, P7). Every refusal is raised before any run is registered. The engine runs after the answer.
  start(body: RunStartRequest): RunStartResult {
    const graph = this.graphs.readGraph(body.graphId);
    const projectId = this.graphs.activeProjectId();
    if (graph.view !== 'recipe') {
      throw graphError('VIEW_NOT_RUNNABLE', MESSAGES.VIEW_NOT_RUNNABLE);
    }
    if (
      this.graphs.issuesOf(graph).some((issue) => issue.severity === 'error')
    ) {
      throw graphError('VALIDATION_FAILED', MESSAGES.VALIDATION_FAILED);
    }
    const recipe: RecipeGraph = graph;
    const nodes = nodesOf(recipe);

    const target = body.target?.nodeId;
    if (target !== undefined && !nodes.has(target)) {
      throw graphError('TARGET_INVALID', MESSAGES.TARGET_INVALID);
    }
    for (const id of Object.keys(body.targets ?? {})) {
      if (nodes.get(id)?.kind !== 'output') {
        throw graphError('TARGET_INVALID', MESSAGES.TARGET_INVALID);
      }
    }

    const scope = scopeOf(recipe, target);
    const order = orderOf(recipe, scope);

    const inputs: Record<string, InputValue> = {};
    for (const id of order) {
      const node = nodes.get(id);
      if (node?.kind !== 'input') continue;
      const value = body.inputs[id];
      if (value === undefined) {
        throw graphError('INPUT_MISSING', MESSAGES.INPUT_MISSING);
      }
      if (!fits(node.params.type, value)) {
        throw graphError('INPUT_INVALID', MESSAGES.INPUT_INVALID);
      }
      inputs[id] = value;
    }
    for (const id of Object.keys(body.inputs)) {
      if (nodes.get(id)?.kind !== 'input') {
        throw graphError('INPUT_INVALID', MESSAGES.INPUT_INVALID);
      }
    }

    // Every file reference is read once, before any tool runs (S7, P5).
    const reads = new Map<string, CapturedFile>();
    const captured = new Map<string, CapturedFile>();
    for (const [id, value] of Object.entries(inputs)) {
      if (value.kind !== 'file') continue;
      let file = reads.get(value.ref);
      if (file === undefined) {
        file = this.readFile(projectId, value.ref);
        reads.set(value.ref, file);
      }
      captured.set(id, file);
    }

    const active = this.entryOf(projectId).active;
    if (active !== undefined) {
      throw graphError('RUN_ACTIVE', MESSAGES.RUN_ACTIVE);
    }

    const state: RunState = {
      runId: randomUUID(),
      graphId: body.graphId,
      ...(target === undefined ? {} : { target: { nodeId: target } }),
      status: 'running',
      startedAt: new Date().toISOString(),
      inputs,
      targets: body.targets ?? {},
      nodes: this.initialNodes(recipe, scope),
      pendingChangeIds: [],
    };
    const record: RunRecord = {
      projectId,
      recipe,
      order,
      state,
      files: captured,
      results: new Map(),
      controller: new AbortController(),
    };
    this.entryOf(projectId).active = record;

    this.events.publish({
      module: 'graph-runner',
      type: 'run-started',
      data: state,
    });
    for (const id of order) {
      this.setStatus(record, id, 'queued');
    }
    this.engine(record).catch(() => {
      this.finish(record, 'error');
    });
    return { runId: state.runId };
  }

  // The active run of the active project, else its last finished run, else null (P13).
  current(): CurrentRun {
    const runs = this.entryOf(this.graphs.activeProjectId());
    return { run: runs.active?.state ?? runs.last?.state ?? null };
  }

  // The initial node states: in-scope nodes queued, the rest idle (P8).
  private initialNodes(
    recipe: RecipeGraph,
    scope: ReadonlySet<string>,
  ): Record<string, NodeRunState> {
    const nodes: Record<string, NodeRunState> = {};
    for (const node of recipe.nodes) {
      const status: NodeRunStatus = scope.has(node.id) ? 'queued' : 'idle';
      nodes[node.id] = { status };
    }
    return nodes;
  }

  // The registry entry of a project, created on first use.
  private entryOf(projectId: string): ProjectRuns {
    let runs = this.registry.get(projectId);
    if (runs === undefined) {
      runs = {};
      this.registry.set(projectId, runs);
    }
    return runs;
  }

  // One file read at start (P5). The store's refusals that mean "not an input file" become GRAPH_INPUT_INVALID.
  private readFile(projectId: string, path: string): CapturedFile {
    try {
      const read = this.files.read(projectId, path);
      return { path: read.path, content: read.content, hash: read.hash };
    } catch (error) {
      if (
        error instanceof ModuleError &&
        UNREADABLE_FILE_CODES.includes(error.code)
      ) {
        throw graphError('INPUT_INVALID', MESSAGES.INPUT_INVALID);
      }
      throw error;
    }
  }

  // The engine: the in-scope nodes one at a time, in order (S8). The first node error ends the run (P9).
  private async engine(record: RunRecord): Promise<void> {
    const nodes = nodesOf(record.recipe);
    for (const id of record.order) {
      const node = nodes.get(id);
      if (node === undefined) continue;
      this.setStatus(record, id, 'running');
      try {
        if (node.kind === 'tool') {
          const result = await this.toolStep(record, node);
          record.results.set(id, result);
          this.setStatus(record, id, 'done', { result });
        } else {
          // Input nodes carry their value in the state; an output node creates no change yet (P21).
          this.setStatus(record, id, 'done');
        }
      } catch (error) {
        this.setStatus(record, id, 'error', { error: failureOf(error) });
        for (const later of record.order) {
          if (record.state.nodes[later]?.status === 'queued') {
            this.setStatus(record, later, 'stopped');
          }
        }
        this.finish(record, 'error');
        return;
      }
    }
    this.finish(record, 'done');
  }

  // A tool node's step (P10): the arguments from the wires, the params and the validation; the entities resolved
  // through the Project store; then the executor call.
  private async toolStep(
    record: RunRecord,
    node: RecipeToolNode,
  ): Promise<ToolCallResult> {
    const ports = this.catalog.ports(node.tool);
    const args: Record<string, unknown> = { ...(node.params ?? {}) };
    for (const wire of record.recipe.edges) {
      if (nodeOfPort(wire.to) !== node.id) continue;
      const key = wire.to.slice(wire.to.indexOf('.') + 1);
      const port = ports.inputs.find((input) => input.key === key);
      if (port === undefined) continue;
      const value = this.valueOf(record, wire.from, port.list);
      if (value !== undefined) args[key] = value;
    }
    const checked = this.catalog.validate(node.tool, {
      arguments: args,
      mode: 'full',
    });
    const ids = [...new Set(checked.entityRefs.map((ref) => ref.id))];
    const resolution = this.entities.resolve(record.projectId, ids);
    if (resolution.errors.length > 0) {
      throw new ModuleError(
        TOOL_ERROR_CODES.ENTITY_UNRESOLVED,
        TOOL_ERROR_STATUS.TOOL_ENTITY_UNRESOLVED,
        MESSAGES.ENTITY_UNRESOLVED,
      );
    }
    const entities: ResolvedEntity[] = resolution.resolved.map((entity) => ({
      ref: entity.id,
      type: entity.type,
      path: entity.path,
      content: entity.content,
    }));
    return this.executor.execute(
      node.tool,
      { arguments: checked.arguments, entities },
      record.controller.signal,
    );
  }

  // The value a wire carries from its upstream port (P9): an input's value, or a tool's output text.
  private valueOf(
    record: RunRecord,
    from: string,
    list: boolean,
  ): string | string[] | undefined {
    const id = nodeOfPort(from);
    const node = nodesOf(record.recipe).get(id);
    if (node?.kind === 'tool') {
      return record.results.get(id)?.output.content;
    }
    if (node?.kind !== 'input') return undefined;
    const value = record.state.inputs[id];
    if (value === undefined) return undefined;
    switch (value.kind) {
      case 'text':
        return value.text;
      case 'file':
        return record.files.get(id)?.content;
      case 'entities':
        return list ? value.refs : value.refs[0];
      case 'style':
        return value.ref;
    }
  }

  // The one place a node status changes (P12). Publishes one node-status event.
  private setStatus(
    record: RunRecord,
    nodeId: string,
    status: NodeRunStatus,
    extra: Pick<NodeRunState, 'result' | 'error'> = {},
  ): void {
    record.state.nodes[nodeId] = { status, ...extra };
    this.events.publish({
      module: 'graph-runner',
      type: 'node-status',
      data: { runId: record.state.runId, nodeId, status, ...extra },
    });
  }

  // Ends a run once (P12): the record moves from active to last before run-ended is published.
  private finish(record: RunRecord, status: RunStatus): void {
    if (record.state.endedAt !== undefined) return;
    record.state.status = status;
    record.state.endedAt = new Date().toISOString();
    const runs = this.entryOf(record.projectId);
    delete runs.active;
    runs.last = record;
    this.events.publish({
      module: 'graph-runner',
      type: 'run-ended',
      data: { runId: record.state.runId, status },
    });
  }
}
