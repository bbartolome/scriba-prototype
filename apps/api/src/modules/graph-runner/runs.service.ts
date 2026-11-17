import { randomUUID } from 'node:crypto';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import {
  type CurrentRun,
  graphFileSchema,
  type InputParams,
  type InputValue,
  type NodeRunState,
  type NodeRunStatus,
  RUN_LOG_FOLDER,
  type RecipeGraph,
  type RecipeNode,
  type RunError,
  type RunLogEntry,
  type RunLogInput,
  type RunReason,
  type RunStartRequest,
  type RunStartResult,
  type RunState,
  type RunStatus,
} from '@bbartolome/scriba-contracts/graph-runner';
import {
  PROJECT_ERROR_CODES,
  type FileEntry,
  type PendingChange,
  type ProjectSwitchedData,
} from '@bbartolome/scriba-contracts/project-store';
import {
  TOOL_ERROR_CODES,
  TOOL_ERROR_STATUS,
  type OutputKind,
  type ResolvedEntity,
  type ToolCallResult,
} from '@bbartolome/scriba-contracts/tool-registry';
import { PLATFORM_ERROR_CODES } from '@bbartolome/scriba-contracts/platform';
import { EventsPublisher, ModuleError } from '../platform/platform.module';
import {
  EntitiesService,
  FilesService,
  PendingService,
  ProjectStoreService,
} from '../project-store/project-store.module';
import {
  CatalogService,
  ExecutorService,
} from '../tool-registry/tool-registry.module';
import { graphError, GraphRunnerService } from './graph-runner.service';
import { generatedTarget, fitsKindFolder } from './output-targets';
import { orderOf, nodeOfPort, scopeOf } from './run-scope';
import { parseRunLog, runLogLineOf, runLogPathOf } from './run-log';
import { latestRunOf, recoveredRunOf } from './run-recovery';

const logger = new Logger('GraphRunner');

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
  RUN_NOT_FOUND: 'No run of the active project has that id.',
  ENTITY_UNRESOLVED:
    'An entity of a tool node is unknown or names more than one entity.',
  OUTPUT_PATH_INVALID:
    "An output path must sit in the folder of its output kind, with that kind's extension.",
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
  // The reason the run was asked to end, set once by requestEnd (GRR-05).
  stopReason?: RunReason;
  // The effective target of each in-scope output node, by node id (GRR-06 P4).
  outputTargets: Map<string, string>;
  // The entity ids each tool node resolved, by node id (GRR-06 P9).
  entityIds: Map<string, string[]>;
  // Set once a log line could not be written: the later lines of the run are not attempted (GRR-07 D11).
  logFailed: boolean;
}

// The runs of one project: at most one active run, the last finished one (P6), and the run rebuilt from its log at
// the API start (GRR-07 S16).
interface ProjectRuns {
  active?: RunRecord;
  last?: RunRecord;
  recovered?: RunState;
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

// The tool node wired into the input port of an output node, if there is one (GRR-06 D2).
function feedOf(
  recipe: RecipeGraph,
  outputId: string,
): RecipeToolNode | undefined {
  const wire = recipe.edges.find((edge) => nodeOfPort(edge.to) === outputId);
  if (wire === undefined) return undefined;
  const node = nodesOf(recipe).get(nodeOfPort(wire.from));
  return node?.kind === 'tool' ? node : undefined;
}

// The error of a node: a module error with its own code and message, or the platform's internal error (P11).
function failureOf(error: unknown): RunError {
  if (error instanceof ModuleError) {
    return { code: error.code, message: error.message };
  }
  return { code: PLATFORM_ERROR_CODES.INTERNAL, message: MESSAGES.INTERNAL };
}

// The text of an error for a log warning. It is never shown to a client.
function errorTextOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// The run engine's service: the start, the current run, the sequential topological run and its events (S1 to S11).
@Injectable()
export class RunsService implements OnApplicationBootstrap {
  private readonly registry = new Map<string, ProjectRuns>();

  constructor(
    private readonly graphs: GraphRunnerService,
    private readonly files: FilesService,
    private readonly entities: EntitiesService,
    private readonly catalog: CatalogService,
    private readonly executor: ExecutorService,
    private readonly events: EventsPublisher,
    private readonly store: ProjectStoreService,
    private readonly pending: PendingService,
  ) {
    // Registered once. The handler never throws: a throw would fail the switch.
    this.store.onProjectSwitched((event) => this.onProjectSwitched(event));
    // The graph validator of the Project store (GRR-06 D6, P2). A parse error throws, which counts as a failure.
    this.pending.registerValidator(
      'graphs/*.json',
      (content) => graphFileSchema.safeParse(JSON.parse(content)).success,
    );
  }

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

    const now = new Date();
    const scope = scopeOf(recipe, target);
    const order = orderOf(recipe, scope);
    // The effective output targets are fixed here, before any input is read (GRR-06 P4).
    const outputTargets = this.outputTargetsOf(
      body.graphId,
      recipe,
      scope,
      body.targets ?? {},
      now,
    );

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
      startedAt: now.toISOString(),
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
      outputTargets,
      entityIds: new Map(),
      logFailed: false,
    };
    this.entryOf(projectId).active = record;

    this.log(record, {
      type: 'run-started',
      at: new Date().toISOString(),
      runId: state.runId,
      graphId: state.graphId,
      ...(target === undefined ? {} : { target: { nodeId: target } }),
      inputs: this.logInputsOf(inputs, captured),
    });
    this.events.publish({
      module: 'graph-runner',
      type: 'run-started',
      data: state,
    });
    for (const id of order) {
      this.setStatus(record, id, 'queued');
    }
    this.engine(record).catch((error: unknown) => {
      const failure = failureOf(error);
      this.log(record, {
        type: 'error',
        at: new Date().toISOString(),
        runId: state.runId,
        code: failure.code,
        message: failure.message,
      });
      this.finish(record, 'error');
    });
    return { runId: state.runId };
  }

  // The active run of the active project, else its last finished run, else the run rebuilt at the start, else null
  // (P13, GRR-07 S16).
  current(): CurrentRun {
    const runs = this.entryOf(this.graphs.activeProjectId());
    return {
      run: runs.active?.state ?? runs.last?.state ?? runs.recovered ?? null,
    };
  }

  // Asks a run of the active project to stop (GRR-05). A run that is neither the active nor the last run is unknown.
  // The run rebuilt at the start has ended, so asking it to stop does nothing (GRR-07 S16).
  stop(runId: string): void {
    const runs = this.entryOf(this.graphs.activeProjectId());
    const record = [runs.active, runs.last].find(
      (candidate) => candidate?.state.runId === runId,
    );
    if (record === undefined) {
      if (runs.recovered?.runId === runId) return;
      throw graphError('RUN_NOT_FOUND', MESSAGES.RUN_NOT_FOUND);
    }
    this.requestEnd(record, 'author');
  }

  // The restart recovery (GRR-07 S10 to S15): the most recent run of the active project is rebuilt from its log.
  // A run with no end line is reported as stopped with reason interrupted, and its end is written. Never throws.
  onApplicationBootstrap(): void {
    try {
      const projectId = this.store.activeId();
      if (projectId === null) return;
      const runs: { path: string; entries: RunLogEntry[] }[] = [];
      let listing: FileEntry[];
      try {
        listing = this.files.list(projectId, { path: RUN_LOG_FOLDER }).entries;
      } catch (error) {
        // No logs folder yet: no run has been logged.
        if (
          error instanceof ModuleError &&
          error.code === PROJECT_ERROR_CODES.NOT_FOUND
        ) {
          return;
        }
        throw error;
      }
      for (const entry of listing) {
        if (entry.kind !== 'file' || !entry.path.endsWith('.jsonl')) continue;
        const read = this.files.read(projectId, entry.path);
        runs.push({ path: entry.path, entries: parseRunLog(read.content) });
      }
      const latest = latestRunOf(runs);
      if (latest === undefined) return;
      const recovered = recoveredRunOf(latest, new Date().toISOString());
      if (recovered === undefined) return;
      const { state, repairs } = recovered;
      this.entryOf(projectId).recovered = state;
      const path = runLogPathOf(state.runId);
      for (const repair of repairs) {
        this.files.appendLog(projectId, path, runLogLineOf(repair));
      }
    } catch (error) {
      logger.warn(
        `The run log of the active project could not be recovered: ${errorTextOf(error)}`,
      );
    }
  }

  // Asks a run to end with a reason: the first reason wins, and nothing happens once the run has ended. The model
  // call in progress is aborted.
  private requestEnd(record: RunRecord, reason: RunReason): void {
    if (record.state.endedAt !== undefined || record.stopReason !== undefined) {
      return;
    }
    record.stopReason = reason;
    record.controller.abort();
  }

  // A switch stops the active run of the project being left. The handler never throws.
  private onProjectSwitched(event: ProjectSwitchedData): void {
    try {
      if (event.from === null) return;
      const active = this.registry.get(event.from)?.active;
      if (active !== undefined) this.requestEnd(active, 'project-switched');
    } catch {
      // Nothing here may throw: a throw would fail the switch.
    }
  }

  // The effective target of each in-scope output node (GRR-06 P4): the request target, else params.path, else the
  // generated name. A target outside its kind's folder, or a kind with no folder, is refused before any work (P3).
  private outputTargetsOf(
    graphId: string,
    recipe: RecipeGraph,
    scope: ReadonlySet<string>,
    requested: Readonly<Partial<Record<string, string>>>,
    now: Date,
  ): Map<string, string> {
    const targets = new Map<string, string>();
    for (const node of recipe.nodes) {
      if (node.kind !== 'output' || !scope.has(node.id)) continue;
      const kind = this.kindOfOutput(recipe, node.id);
      const generated =
        kind === undefined ? undefined : generatedTarget(kind, graphId, now);
      const target = requested[node.id] ?? node.params?.path ?? generated;
      if (
        kind === undefined ||
        target === undefined ||
        !fitsKindFolder(kind, target)
      ) {
        throw graphError('TARGET_INVALID', MESSAGES.OUTPUT_PATH_INVALID);
      }
      targets.set(node.id, target);
    }
    return targets;
  }

  // The output kind of an output node: the kind of the tool wired into its input port (GRR-06 D2).
  private kindOfOutput(
    recipe: RecipeGraph,
    outputId: string,
  ): OutputKind | undefined {
    const feed = feedOf(recipe, outputId);
    if (feed === undefined) return undefined;
    return this.catalog.ports(feed.tool).output.kind;
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
          if (record.stopReason !== undefined) {
            this.endStopped(record);
            return;
          }
          record.results.set(id, result);
          this.setStatus(record, id, 'done', { result });
        } else if (node.kind === 'output') {
          // No await between the stop check and the propose (GRR-05 D2, GRR-06 D7).
          if (record.stopReason !== undefined) {
            this.endStopped(record);
            return;
          }
          const change = this.proposeOutput(record, id);
          record.state.pendingChangeIds.push(change.id);
          this.log(record, {
            type: 'pending-change',
            at: new Date().toISOString(),
            runId: record.state.runId,
            nodeId: id,
            pendingChangeId: change.id,
            path: change.targetPath,
          });
          this.setStatus(record, id, 'done', {
            result: { pendingChangeId: change.id, path: change.targetPath },
          });
        } else {
          // Input nodes carry their value in the state.
          this.setStatus(record, id, 'done');
        }
      } catch (error) {
        // An abort caused by a stop is not a node error (GRR-05).
        if (record.stopReason !== undefined) {
          this.endStopped(record);
          return;
        }
        const failure = failureOf(error);
        this.log(record, {
          type: 'error',
          at: new Date().toISOString(),
          runId: record.state.runId,
          nodeId: id,
          code: failure.code,
          message: failure.message,
        });
        this.setStatus(record, id, 'error', { error: failure });
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
    record.entityIds.set(node.id, ids);
    const entities: ResolvedEntity[] = resolution.resolved.map((entity) => ({
      ref: entity.id,
      type: entity.type,
      path: entity.path,
      content: entity.content,
    }));
    const result = await this.executor.execute(
      node.tool,
      { arguments: checked.arguments, entities },
      record.controller.signal,
    );
    this.log(record, {
      type: 'tool-call',
      at: new Date().toISOString(),
      runId: record.state.runId,
      nodeId: node.id,
      arguments: checked.arguments,
      output: result.output,
      sourcesUsed: result.sourcesUsed,
    });
    return result;
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

  // Proposes the text of the feeding tool as the change of an output node (GRR-06 P5 to P11). The base is the
  // run-start content of a captured file at the same path (D4); with no captured file, propose reads the disk.
  private proposeOutput(record: RunRecord, outputId: string): PendingChange {
    const path = record.outputTargets.get(outputId);
    const feed = feedOf(record.recipe, outputId);
    const content =
      feed === undefined
        ? undefined
        : record.results.get(feed.id)?.output.content;
    if (path === undefined || content === undefined) {
      throw new Error('An output node has no target or no feeding result.');
    }
    const captured = [...record.files.values()].find(
      (file) => file.path === path,
    );
    return this.pending.propose({
      projectId: record.projectId,
      path,
      content,
      ...(captured === undefined
        ? {}
        : { base: { content: captured.content } }),
      origin: {
        kind: 'recipe-run',
        runId: record.state.runId,
        graphId: record.state.graphId,
        nodeId: outputId,
      },
      provenance: this.provenanceOf(record, outputId),
    });
  }

  // The provenance of an output's change (GRR-06 P9): the entity ids and the sources of every tool node upstream of
  // the output, as unions without duplicates.
  private provenanceOf(
    record: RunRecord,
    outputId: string,
  ): Record<string, unknown> {
    const upstream = scopeOf(record.recipe, outputId);
    const nodes = nodesOf(record.recipe);
    const entityIds = new Set<string>();
    const sourcesUsed = new Set<string>();
    for (const id of record.order) {
      if (!upstream.has(id) || nodes.get(id)?.kind !== 'tool') continue;
      for (const ref of record.entityIds.get(id) ?? []) entityIds.add(ref);
      for (const ref of record.results.get(id)?.sourcesUsed ?? []) {
        sourcesUsed.add(ref);
      }
    }
    return {
      graphId: record.state.graphId,
      nodeId: outputId,
      entityIds: [...entityIds],
      sourcesUsed: [...sourcesUsed],
    };
  }

  // Writes one line of the run log (GRR-07 S2, D11). Every call is synchronous. A failed write is logged once, and the
  // later lines of the run are not attempted. Never throws.
  private log(record: RunRecord, entry: RunLogEntry): void {
    if (record.logFailed) return;
    try {
      this.files.appendLog(
        record.projectId,
        runLogPathOf(record.state.runId),
        runLogLineOf(entry),
      );
    } catch (error) {
      record.logFailed = true;
      logger.warn(
        `Run ${record.state.runId}: a run log line could not be written: ${errorTextOf(error)}`,
      );
    }
  }

  // The inputs of the run log: a file input carries the hash of its run-start read (GRR-07 S4).
  private logInputsOf(
    inputs: Record<string, InputValue>,
    captured: ReadonlyMap<string, CapturedFile>,
  ): Record<string, RunLogInput> {
    const logged: Record<string, RunLogInput> = {};
    for (const [id, value] of Object.entries(inputs)) {
      if (value.kind !== 'file') {
        logged[id] = value;
        continue;
      }
      const file = captured.get(id);
      if (file !== undefined) {
        logged[id] = { kind: 'file', ref: value.ref, hash: file.hash };
      }
    }
    return logged;
  }

  // The one place a node status changes (P12). Writes one node-status line, then publishes one node-status event.
  private setStatus(
    record: RunRecord,
    nodeId: string,
    status: NodeRunStatus,
    extra: Pick<NodeRunState, 'result' | 'error'> = {},
  ): void {
    record.state.nodes[nodeId] = { status, ...extra };
    this.log(record, {
      type: 'node-status',
      at: new Date().toISOString(),
      runId: record.state.runId,
      nodeId,
      status,
      ...(extra.error === undefined ? {} : { error: extra.error }),
    });
    this.events.publish({
      module: 'graph-runner',
      type: 'node-status',
      data: { runId: record.state.runId, nodeId, status, ...extra },
    });
  }

  // Ends a stopped run (GRR-05): every running or queued node becomes stopped, then the run ends with the stop reason.
  private endStopped(record: RunRecord): void {
    for (const id of record.order) {
      const status = record.state.nodes[id]?.status;
      if (status === 'queued' || status === 'running') {
        this.setStatus(record, id, 'stopped');
      }
    }
    this.finish(record, 'stopped', record.stopReason);
  }

  // Ends a run once (P12): the record moves from active to last before run-ended is published. The reason, when
  // given, is set first, so that every later statement reads it.
  private finish(
    record: RunRecord,
    status: RunStatus,
    reason?: RunReason,
  ): void {
    if (record.state.endedAt !== undefined) return;
    if (reason !== undefined) record.state.reason = reason;
    record.state.status = status;
    record.state.endedAt = new Date().toISOString();
    const runs = this.entryOf(record.projectId);
    delete runs.active;
    runs.last = record;
    this.log(record, {
      type: 'run-ended',
      at: new Date().toISOString(),
      runId: record.state.runId,
      status,
      ...(reason === undefined ? {} : { reason }),
    });
    this.events.publish({
      module: 'graph-runner',
      type: 'run-ended',
      data: {
        runId: record.state.runId,
        status,
        ...(reason === undefined ? {} : { reason }),
      },
    });
  }
}
