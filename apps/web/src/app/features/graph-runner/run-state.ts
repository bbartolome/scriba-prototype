import type {
  GraphFile,
  InputValue,
  NodeRunState,
  NodeStatusData,
  RunEndedData,
  RunState,
  RunStartRequest,
} from '@bbartolome/scriba-contracts/graph-runner';
import type {
  FormField,
  PortType,
} from '@bbartolome/scriba-contracts/tool-registry';

// The pure rules of a run on the canvas: which nodes a run covers, the fields of its input-values dialog,
// the request it sends, and the folds of the events into the run state. No library and no Angular import,
// so the spec runs them without a page.

/** A recipe node of the file. */
type RecipeNode = GraphFile['nodes'][number];

/** One input node of the dialog: its value's type, its label and the entity kinds its entity picker filters by. */
export interface InputField {
  readonly nodeId: string;
  readonly kind: 'input';
  readonly type: PortType;
  readonly label: string;
  readonly entityKinds: readonly string[];
}

/** One output node of the dialog: the path its output is written to, empty for the generated name. */
export interface OutputField {
  readonly nodeId: string;
  readonly kind: 'output';
  readonly path: string;
}

/** One field of the input-values dialog. */
export type DialogField = InputField | OutputField;

/** The values the dialog holds: one input value per input node and one path per output node, by node id. */
export interface DialogValues {
  readonly inputs: Readonly<Record<string, InputValue>>;
  readonly targets: Readonly<Record<string, string>>;
}

/** The node id of a port id: the text before the first dot (node ids have no dot). */
function nodeIdOf(portId: string): string {
  const dot = portId.indexOf('.');
  return dot < 0 ? portId : portId.slice(0, dot);
}

/**
 * The nodes a run covers. With no target, every node. With a target, the target and the nodes that reach it
 * through the wires, walking backwards (the server's scope rule).
 */
export function scopeOfRecipe(
  graph: GraphFile,
  target?: string,
): ReadonlySet<string> {
  if (target === undefined) {
    return new Set(graph.nodes.map((node) => node.id));
  }
  const scope = new Set<string>([target]);
  const pending = [target];
  while (pending.length > 0) {
    const current = pending.pop() as string;
    for (const wire of graph.edges) {
      if (nodeIdOf(wire.to) !== current) continue;
      const source = nodeIdOf(wire.from);
      if (scope.has(source)) continue;
      scope.add(source);
      pending.push(source);
    }
  }
  return scope;
}

/**
 * The entity kinds of one input node: the kinds of the tool form fields its wires feed (the fields with the port's
 * key and `port: true`), each once; else the input's `entityKind`; else none. A style input has no kinds.
 */
function entityKindsOf(
  graph: GraphFile,
  node: Extract<RecipeNode, { kind: 'input' }>,
  formsOf: ReadonlyMap<string, readonly FormField[]>,
): readonly string[] {
  if (node.params.type === 'style') return [];
  const kinds = new Set<string>();
  for (const wire of graph.edges) {
    if (nodeIdOf(wire.from) !== node.id) continue;
    const target = graph.nodes.find(
      (candidate) => candidate.id === nodeIdOf(wire.to),
    );
    if (target?.kind !== 'tool') continue;
    const portKey = wire.to.slice(target.id.length + 1);
    const field = formsOf
      .get(target.tool)
      ?.find((candidate) => candidate.key === portKey && candidate.port);
    for (const kind of field?.entityKinds ?? []) kinds.add(kind);
  }
  if (kinds.size > 0) return [...kinds];
  const own = node.params.entityKind;
  return own === undefined ? [] : [own];
}

/**
 * The fields of the dialog: the input and output nodes in the scope, in file order. `formsOf` gives the form
 * fields of each ready tool, by tool name.
 */
export function dialogFieldsOf(
  graph: GraphFile,
  scope: ReadonlySet<string>,
  formsOf: ReadonlyMap<string, readonly FormField[]>,
): DialogField[] {
  const fields: DialogField[] = [];
  for (const node of graph.nodes) {
    if (!scope.has(node.id)) continue;
    if (node.kind === 'input') {
      fields.push({
        nodeId: node.id,
        kind: 'input',
        type: node.params.type,
        label: node.params.label,
        entityKinds: entityKindsOf(graph, node, formsOf),
      });
    } else if (node.kind === 'output') {
      fields.push({
        nodeId: node.id,
        kind: 'output',
        path: node.params?.path ?? '',
      });
    }
  }
  return fields;
}

/**
 * The request of a start: the values of the input nodes, the paths of the output nodes that have one (an empty
 * path sends no entry, so the server writes to the generated name), and the target for a run to a node.
 */
export function runRequestOf(
  graphId: string,
  values: DialogValues,
  target?: string,
): RunStartRequest {
  const paths = Object.entries(values.targets).filter(
    ([, path]) => path.trim() !== '',
  );
  return {
    graphId,
    inputs: { ...values.inputs },
    ...(target === undefined ? {} : { target: { nodeId: target } }),
    ...(paths.length === 0
      ? {}
      : {
          targets: Object.fromEntries(
            paths.map(([nodeId, path]) => [nodeId, path.trim()]),
          ),
        }),
  };
}

/** The run of one graph: the run when it is this graph's, else undefined. */
export function runOfGraph(
  run: RunState | null,
  graphId: string,
): RunState | undefined {
  return run !== null && run.graphId === graphId ? run : undefined;
}

/** A node-status event folded into the run: only the node of the same run changes. */
export function foldNodeStatus(run: RunState, data: NodeStatusData): RunState {
  if (data.runId !== run.runId) return run;
  const state: NodeRunState = {
    status: data.status,
    ...(data.result === undefined ? {} : { result: data.result }),
    ...(data.error === undefined ? {} : { error: data.error }),
  };
  return { ...run, nodes: { ...run.nodes, [data.nodeId]: state } };
}

/** A run-ended event folded into the run: its status and its reason, when it has one. */
export function foldRunEnded(run: RunState, data: RunEndedData): RunState {
  if (data.runId !== run.runId) return run;
  return { ...run, status: data.status, reason: data.reason };
}
