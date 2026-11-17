import {
  INPUT_NODE_OUTPUT_KEY,
  NODE_ID_PATTERN,
  OUTPUT_NODE_INPUT_KEY,
  RECIPE_NODE_KINDS,
  TOOL_NODE_OUTPUT_KEY,
  type GraphIssueCode,
  type RecipeGraph,
  type StoryGraph,
  type ValidationIssue,
} from '@bbartolome/scriba-contracts/graph-runner';

// The pure rules of graph validation (P1, P21, P22). No Nest, no I/O: the facts come in through the parameters.

// The output kinds a recipe output node cannot write (P16). GRR-06 refuses the same kinds at run time.
export const UNWRITABLE_OUTPUT_KINDS: readonly string[] = ['claims', 'check'];

// The port facts of one tool that the rules read. The Tool registry's descriptor has this shape.
export interface ToolPorts {
  inputs: { key: string; type: string; required: boolean }[];
  output: { kind: string };
}

// What the validator learned about one tool node: an unknown tool, or a valid one with its switch and its params issues.
export type ToolFact =
  | { state: 'unknown' }
  | {
      state: 'valid';
      enabled: boolean;
      ports: ToolPorts;
      paramsIssues: { path: string }[];
    };

// The status of one story path: ok (exists, or exists but is not readable as text), missing, unsafe, or in the versions folder.
export type PathStatus = 'ok' | 'missing' | 'unsafe' | 'versions';

export interface RecipeFacts {
  tools: ReadonlyMap<string, ToolFact>;
  // The entity ids among the pinned values that have no readable entity.
  unknownEntityIds: ReadonlySet<string>;
}

export interface StoryFacts {
  paths: ReadonlyMap<string, PathStatus>;
}

// The code, the severity and the fixed message of each rule (P14). No graph value is echoed.
const RULES: Record<
  GraphIssueCode,
  { severity: 'error' | 'warning'; message: string }
> = {
  'illegal-node-kind': {
    severity: 'error',
    message: 'A node has a kind that the recipe view does not allow.',
  },
  'unknown-tool': {
    severity: 'error',
    message:
      'A tool node names a tool that is not in the registry or is invalid.',
  },
  'disabled-tool': {
    severity: 'error',
    message: 'A tool node names a tool that is disabled.',
  },
  'missing-port': {
    severity: 'error',
    message: 'A wire joins a port that does not exist.',
  },
  'port-type-mismatch': {
    severity: 'error',
    message: 'A wire joins ports of different types.',
  },
  'multiple-wires-into-port': {
    severity: 'error',
    message: 'More than one wire goes into this input.',
  },
  'port-wired-and-pinned': {
    severity: 'error',
    message: 'An input is both wired and pinned.',
  },
  'required-port-unfed': {
    severity: 'error',
    message: 'A required input has neither a wire nor a pinned value.',
  },
  'tool-params-invalid': {
    severity: 'error',
    message: 'A setting of the tool is missing or has a wrong value.',
  },
  cycle: {
    severity: 'error',
    message: 'The wires of the recipe form a cycle.',
  },
  'output-unwired': {
    severity: 'error',
    message: 'An output node has no wire into it.',
  },
  'output-not-fed-by-tool': {
    severity: 'error',
    message: 'An output node is fed by a node that is not a tool.',
  },
  'output-kind-unwritable': {
    severity: 'error',
    message: 'An output node is fed by a tool whose output cannot be written.',
  },
  'duplicate-id': {
    severity: 'error',
    message: 'An id is used more than once.',
  },
  'dead-step': {
    severity: 'warning',
    message: 'A step has no path to an output.',
  },
  'input-unwired': {
    severity: 'warning',
    message: 'An input node has no wire out.',
  },
  'pinned-entity-missing': {
    severity: 'warning',
    message: 'A pinned entity does not exist in the project.',
  },
  'path-missing': {
    severity: 'warning',
    message: 'A path does not point to a file in the project.',
  },
  'path-unsafe': {
    severity: 'warning',
    message: 'A path is not allowed in the project.',
  },
  'path-in-versions': {
    severity: 'warning',
    message: 'A path points into the draft versions folder.',
  },
  'unknown-edge-node': {
    severity: 'warning',
    message: 'An edge joins a node that does not exist.',
  },
  'entity-path-outside-entities': {
    severity: 'warning',
    message: 'An entity node has a path outside the entities folder.',
  },
};

// An issue of a code, with the ids it is about (only the ids that are set).
function issue(
  code: GraphIssueCode,
  ids: { nodeId?: string; edgeId?: string; portId?: string },
  message?: string,
): ValidationIssue {
  const rule = RULES[code];
  return {
    code,
    severity: rule.severity,
    ...ids,
    message: message ?? rule.message,
  };
}

// The message of a params issue: it names the setting key of the issue path when there is one (P14).
function settingMessage(path: string): string {
  const key = path.replace(/^\//, '').replace(/~1/g, '/').replace(/~0/g, '~');
  if (key === '') return RULES['tool-params-invalid'].message;
  return `The setting "${key}" is missing or has a wrong value.`;
}

// The first occurrence of each id, in list order (P7).
export function firstById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

// One duplicate-id issue for each later occurrence of an id (P7).
function duplicateIssues(
  items: readonly { id: string }[],
  key: 'nodeId' | 'edgeId',
): ValidationIssue[] {
  const seen = new Set<string>();
  const issues: ValidationIssue[] = [];
  for (const item of items) {
    if (seen.has(item.id)) {
      issues.push(issue('duplicate-id', { [key]: item.id }));
    }
    seen.add(item.id);
  }
  return issues;
}

// The node id of a port id, which is `<nodeId>.<key>` split on the first dot (P5).
function nodeIdOf(portId: string): string {
  return portId.slice(0, portId.indexOf('.'));
}

// The key of a port id (P5).
function keyOf(portId: string): string {
  return portId.slice(portId.indexOf('.') + 1);
}

// The string values of a pinned value: a string, or an array of strings (P11).
function stringsOf(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value as string[];
  }
  return [];
}

// The entity ids named by the pinned values of the entity and style ports of the valid tools (P11).
export function pinnedEntityIds(
  graph: RecipeGraph,
  tools: ReadonlyMap<string, ToolFact>,
): string[] {
  const ids = new Set<string>();
  for (const node of firstById(graph.nodes)) {
    const fact = tools.get(node.id);
    if (node.kind !== 'tool' || fact?.state !== 'valid') continue;
    for (const port of fact.ports.inputs) {
      if (port.type !== 'entity' && port.type !== 'style') continue;
      if (!Object.hasOwn(node.params ?? {}, port.key)) continue;
      for (const id of stringsOf((node.params ?? {})[port.key])) ids.add(id);
    }
  }
  return [...ids];
}

// The result of resolving one end of a wire (P4, P21).
interface End {
  // The port exists (or the tool is unknown, so its keys are not checked).
  exists: boolean;
  // The tool of the end is unknown: its type and its keys are not checked.
  unknownTool: boolean;
  // The port type, when the end has one.
  type?: string;
}

// The validation of a recipe (P4 to P10, P15, P16, P21). Returns the issues in the order of P15.
export function recipeIssues(
  graph: RecipeGraph,
  facts: RecipeFacts,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [
    ...duplicateIssues(graph.nodes, 'nodeId'),
    ...duplicateIssues(graph.edges, 'edgeId'),
  ];
  const nodes = firstById(graph.nodes);
  const edges = firstById(graph.edges);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const outputNodeIds = nodes
    .filter((node) => node.kind === 'output')
    .map((node) => node.id);

  // Tool nodes: the unknown and disabled tools, then the params issues of the valid ones.
  for (const node of nodes) {
    if (node.kind !== 'tool') continue;
    const fact = facts.tools.get(node.id);
    if (fact?.state !== 'valid') {
      issues.push(issue('unknown-tool', { nodeId: node.id }));
      continue;
    }
    if (!fact.enabled) issues.push(issue('disabled-tool', { nodeId: node.id }));
    for (const param of fact.paramsIssues) {
      issues.push(
        issue(
          'tool-params-invalid',
          { nodeId: node.id },
          settingMessage(param.path),
        ),
      );
    }
  }

  // The ends of each wire (P5, P6, P21).
  const endOf = (portId: string, side: 'from' | 'to'): End => {
    const node = nodeById.get(nodeIdOf(portId));
    const key = keyOf(portId);
    if (node === undefined) return { exists: false, unknownTool: false };
    if (node.kind === 'input') {
      if (side === 'from' && key === INPUT_NODE_OUTPUT_KEY) {
        return { exists: true, unknownTool: false, type: node.params.type };
      }
      return { exists: false, unknownTool: false };
    }
    if (node.kind === 'output') {
      if (side === 'to' && key === OUTPUT_NODE_INPUT_KEY) {
        return { exists: true, unknownTool: false, type: 'text' };
      }
      return { exists: false, unknownTool: false };
    }
    const fact = facts.tools.get(node.id);
    if (fact?.state !== 'valid') return { exists: true, unknownTool: true };
    if (side === 'from') {
      return key === TOOL_NODE_OUTPUT_KEY
        ? { exists: true, unknownTool: false, type: 'text' }
        : { exists: false, unknownTool: false };
    }
    const input = fact.ports.inputs.find((port) => port.key === key);
    return input === undefined
      ? { exists: false, unknownTool: false }
      : { exists: true, unknownTool: false, type: input.type };
  };

  const linked = edges.map((edge) => ({
    edge,
    from: endOf(edge.from, 'from'),
    to: endOf(edge.to, 'to'),
  }));
  for (const { edge, from, to } of linked) {
    if (!from.exists) {
      issues.push(
        issue('missing-port', { edgeId: edge.id, portId: edge.from }),
      );
    }
    if (!to.exists) {
      issues.push(issue('missing-port', { edgeId: edge.id, portId: edge.to }));
    }
  }
  const usable = linked.filter(({ from, to }) => from.exists && to.exists);

  for (const { edge, from, to } of usable) {
    if (from.unknownTool || to.unknownTool) continue;
    if (from.type !== to.type) {
      issues.push(
        issue('port-type-mismatch', { edgeId: edge.id, portId: edge.to }),
      );
    }
  }

  // One wire into each input: the later usable wire is reported (P21).
  const intoPort = new Set<string>();
  for (const { edge } of usable) {
    if (intoPort.has(edge.to)) {
      issues.push(
        issue('multiple-wires-into-port', { edgeId: edge.id, portId: edge.to }),
      );
    }
    intoPort.add(edge.to);
  }

  // Per tool node: the wired-and-pinned ports, then the required ports that are unfed.
  for (const node of nodes) {
    const fact = facts.tools.get(node.id);
    if (node.kind !== 'tool' || fact?.state !== 'valid') continue;
    for (const port of fact.ports.inputs) {
      const portId = `${node.id}.${port.key}`;
      const wired = intoPort.has(portId);
      const pinned = Object.hasOwn(node.params ?? {}, port.key);
      if (wired && pinned) {
        issues.push(
          issue('port-wired-and-pinned', { nodeId: node.id, portId }),
        );
      }
      if (port.required && !wired && !pinned) {
        issues.push(issue('required-port-unfed', { nodeId: node.id, portId }));
      }
    }
  }

  // Reachability over the usable wires (P21).
  const successors = new Map<string, string[]>();
  for (const { edge } of usable) {
    const from = nodeIdOf(edge.from);
    successors.set(from, [...(successors.get(from) ?? []), nodeIdOf(edge.to)]);
  }
  const reachable = (start: string): Set<string> => {
    const seen = new Set<string>();
    const queue = [...(successors.get(start) ?? [])];
    while (queue.length > 0) {
      const next = queue.shift() as string;
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(...(successors.get(next) ?? []));
    }
    return seen;
  };

  const cyclic = nodes.find((node) => reachable(node.id).has(node.id));
  if (cyclic !== undefined) {
    issues.push(issue('cycle', { nodeId: cyclic.id }));
  }

  // Output nodes: unwired, fed by a non-tool, or fed by a tool whose output cannot be written.
  for (const node of nodes) {
    if (node.kind !== 'output') continue;
    const incoming = usable.filter(({ edge }) => nodeIdOf(edge.to) === node.id);
    if (incoming.length === 0) {
      issues.push(issue('output-unwired', { nodeId: node.id }));
    }
    for (const { edge } of incoming) {
      const feeder = nodeById.get(nodeIdOf(edge.from));
      if (feeder?.kind !== 'tool') {
        issues.push(
          issue('output-not-fed-by-tool', { nodeId: node.id, edgeId: edge.id }),
        );
        continue;
      }
      const fact = facts.tools.get(feeder.id);
      if (
        fact?.state === 'valid' &&
        UNWRITABLE_OUTPUT_KINDS.includes(fact.ports.output.kind)
      ) {
        issues.push(
          issue('output-kind-unwritable', { nodeId: node.id, edgeId: edge.id }),
        );
      }
    }
  }

  // Input nodes with no wire out of them. Every wire counts here, usable or not (P21).
  for (const node of nodes) {
    if (node.kind !== 'input') continue;
    const wiredOut = linked.some(({ edge }) => nodeIdOf(edge.from) === node.id);
    if (!wiredOut) issues.push(issue('input-unwired', { nodeId: node.id }));
  }

  // Dead steps: a tool node, or an input node with a usable wire out, with no path to an output (P9).
  for (const node of nodes) {
    const candidate =
      node.kind === 'tool' ||
      (node.kind === 'input' &&
        usable.some(({ edge }) => nodeIdOf(edge.from) === node.id));
    if (!candidate) continue;
    const reach = reachable(node.id);
    if (!outputNodeIds.some((id) => reach.has(id))) {
      issues.push(issue('dead-step', { nodeId: node.id }));
    }
  }

  // Pinned entities that do not exist (P11), per valid tool node.
  for (const node of nodes) {
    const fact = facts.tools.get(node.id);
    if (node.kind !== 'tool' || fact?.state !== 'valid') continue;
    for (const port of fact.ports.inputs) {
      if (port.type !== 'entity' && port.type !== 'style') continue;
      if (!Object.hasOwn(node.params ?? {}, port.key)) continue;
      const ids = stringsOf((node.params ?? {})[port.key]);
      if (ids.some((id) => facts.unknownEntityIds.has(id))) {
        issues.push(
          issue('pinned-entity-missing', {
            nodeId: node.id,
            portId: `${node.id}.${port.key}`,
          }),
        );
      }
    }
  }

  return issues;
}

// The validation of a story graph (P12, P13). Warnings only (unit line 22). A later duplicate id is ignored (O2).
export function storyIssues(
  graph: StoryGraph,
  facts: StoryFacts,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const node of firstById(graph.nodes)) {
    if (node.path === undefined) continue;
    const status = facts.paths.get(node.id) ?? 'ok';
    if (status === 'missing') {
      issues.push(issue('path-missing', { nodeId: node.id }));
    } else if (status === 'unsafe') {
      issues.push(issue('path-unsafe', { nodeId: node.id }));
    } else if (status === 'versions') {
      issues.push(issue('path-in-versions', { nodeId: node.id }));
    }
    if (node.kind === 'entity' && !node.path.startsWith('entities/')) {
      issues.push(issue('entity-path-outside-entities', { nodeId: node.id }));
    }
  }
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  for (const edge of firstById(graph.edges)) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      issues.push(issue('unknown-edge-node', { edgeId: edge.id }));
    }
  }
  return issues;
}

// The pre-pass of the validate route (P22). A recipe node whose kind the view does not allow is left out of a copy of
// the body and reported as illegal-node-kind. The body itself is not changed. Other nodes stay in the copy.
export function splitIllegalKinds(body: unknown): {
  rest: unknown;
  issues: ValidationIssue[];
} {
  if (
    typeof body !== 'object' ||
    body === null ||
    (body as { view?: unknown }).view !== 'recipe' ||
    !Array.isArray((body as { nodes?: unknown }).nodes)
  ) {
    return { rest: body, issues: [] };
  }
  const { nodes } = body as { nodes: unknown[] };
  const issues: ValidationIssue[] = [];
  const kept: unknown[] = [];
  for (const item of nodes) {
    const illegal =
      typeof item === 'object' &&
      item !== null &&
      typeof (item as { id?: unknown }).id === 'string' &&
      NODE_ID_PATTERN.test((item as { id: string }).id) &&
      typeof (item as { kind?: unknown }).kind === 'string' &&
      !(RECIPE_NODE_KINDS as readonly string[]).includes(
        (item as { kind: string }).kind,
      );
    if (illegal) {
      issues.push(
        issue('illegal-node-kind', { nodeId: (item as { id: string }).id }),
      );
    } else {
      kept.push(item);
    }
  }
  if (issues.length === 0) return { rest: body, issues };
  return { rest: { ...body, nodes: kept }, issues };
}
