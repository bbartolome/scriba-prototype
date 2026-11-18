import type {
  GraphFile,
  ValidationIssue,
} from '@bbartolome/scriba-contracts/graph-runner';
import type {
  FormDescriptor,
  PortDescriptor,
  PortType,
  ToolArguments,
  ToolSummary,
  ToolViews,
} from '@bbartolome/scriba-contracts/tool-registry';

// The rules of the recipe canvas that need no library: tool states, the palette, the port types, the
// connection rules, the settings' values and the blocking issues. No library import, so the spec runs alone.

/** One file node of a graph. */
type FileNode = GraphFile['nodes'][number];

/** The state of a tool node: ready draws its ports and its form; the others draw one line. */
export type ToolState =
  'ready' | 'disabled' | 'invalid' | 'unknown' | 'unavailable';

/** What a detail read gave for one tool: its views, or the failure of the read. */
export type ToolDetailRead = ToolViews | 'not-found' | 'failed';

/** The line a tool node shows for each state other than ready. */
export const TOOL_STATE_LINES: Readonly<
  Record<Exclude<ToolState, 'ready'>, string>
> = {
  disabled: 'Disabled tool',
  invalid: 'Invalid tool',
  unknown: 'Unknown tool',
  unavailable: 'Tool could not be read',
};

/** One port row of a node: its side, its key, its title and type, and the pinned values it shows as chips. */
export interface PortRow {
  readonly side: 'input' | 'output';
  readonly key: string;
  readonly title: string;
  readonly type: PortType;
  readonly list: boolean;
  readonly chips: readonly unknown[];
}

/** The two ends of a connection, as the library gives them: the handle ids of the port. */
export interface WireEnds {
  readonly sourceHandle?: string | null;
  readonly targetHandle?: string | null;
}

/** The effective row of a name: its user row when there is one, else its built-in row. */
export function effectiveRowOf(
  rows: readonly ToolSummary[],
  name: string,
): ToolSummary | undefined {
  const named = rows.filter((row) => row.name === name);
  return named.find((row) => row.origin === 'user') ?? named[0];
}

/**
 * The state of a tool node. `rows` is undefined when the list could not be read. The detail is read only for
 * an enabled, valid row; a row that is not enabled or not valid is never read.
 */
export function toolStateOf(
  rows: readonly ToolSummary[] | undefined,
  name: string,
  detail: ToolDetailRead | undefined,
): ToolState {
  if (rows === undefined) return 'unavailable';
  const row = effectiveRowOf(rows, name);
  if (row === undefined) return 'unknown';
  if (!row.enabled) return 'disabled';
  if (!row.valid) return 'invalid';
  if (detail === 'not-found') return 'unknown';
  if (detail === undefined || detail === 'failed') return 'unavailable';
  return 'ready';
}

/** The palette: each name once, by its effective row, when that row is enabled and valid. */
export function paletteOf(rows: readonly ToolSummary[]): ToolSummary[] {
  const names = [...new Set(rows.map((row) => row.name))];
  return names.flatMap((name) => {
    const row = effectiveRowOf(rows, name);
    return row !== undefined && row.enabled && row.valid ? [row] : [];
  });
}

/** Splits a port id at its first dot: the node id, then the port key. */
export function splitPort(portId: string): { nodeId: string; key: string } {
  const dot = portId.indexOf('.');
  return dot < 0
    ? { nodeId: portId, key: '' }
    : { nodeId: portId.slice(0, dot), key: portId.slice(dot + 1) };
}

/**
 * The type of a port on a side. An input node's `out` is a source of its `params.type`; an output node's `in`
 * is a target of text; a tool's `output` is a source of its output type; a tool's input keys are targets. A
 * tool with no ready descriptor has no ports.
 */
export function portTypeOf(
  file: GraphFile,
  portId: string,
  side: 'source' | 'target',
  ports: ReadonlyMap<string, PortDescriptor>,
): PortType | undefined {
  const { nodeId, key } = splitPort(portId);
  const node = file.nodes.find((candidate) => candidate.id === nodeId);
  if (node === undefined) return undefined;
  switch (node.kind) {
    case 'input':
      return side === 'source' && key === 'out' ? node.params.type : undefined;
    case 'output':
      return side === 'target' && key === 'in' ? 'text' : undefined;
    case 'tool': {
      const descriptor = ports.get(nodeId);
      if (descriptor === undefined) return undefined;
      if (side === 'source') {
        return key === descriptor.output.key
          ? descriptor.output.type
          : undefined;
      }
      return descriptor.inputs.find((port) => port.key === key)?.type;
    }
    default:
      return undefined;
  }
}

/** A pinned value is a key present in the node's params (`Object.hasOwn`). */
export function isPinned(
  params: Readonly<Record<string, unknown>> | undefined,
  key: string,
): boolean {
  return params !== undefined && Object.hasOwn(params, key);
}

/** The pinned values of a port: one chip per item of a list port, else the one value. */
export function pinnedValuesOf(
  params: Readonly<Record<string, unknown>> | undefined,
  key: string,
): readonly unknown[] {
  if (params === undefined || !isPinned(params, key)) return [];
  const value = params[key];
  return Array.isArray(value) ? value : [value];
}

/**
 * Whether a connection may be drawn in a recipe. It is refused when a handle is not a port of its side (or of
 * a ready descriptor), when the two types differ, when the target already has a wire, or when the target key
 * is pinned. A refused connection emits no wire. A story view is not checked here.
 */
export function acceptsWire(
  file: GraphFile,
  ends: WireEnds,
  ports: ReadonlyMap<string, PortDescriptor>,
): boolean {
  if (file.view !== 'recipe') return true;
  const { sourceHandle, targetHandle } = ends;
  if (!sourceHandle || !targetHandle) return false;
  const from = portTypeOf(file, sourceHandle, 'source', ports);
  const to = portTypeOf(file, targetHandle, 'target', ports);
  if (from === undefined || to === undefined || from !== to) return false;
  if (file.edges.some((wire) => wire.to === targetHandle)) return false;
  const target = splitPort(targetHandle);
  const node = file.nodes.find((candidate) => candidate.id === target.nodeId);
  const params = node?.kind === 'tool' ? node.params : undefined;
  return !isPinned(params, target.key);
}

/** One letter that names a port type on its row: T text, E entity, S style. */
export function typeGlyphOf(type: PortType): string {
  const glyphs: Readonly<Record<PortType, string>> = {
    text: 'T',
    entity: 'E',
    style: 'S',
  };
  return glyphs[type];
}

/** The rows of a node: an input node's out, an output node's in, and a ready tool's inputs then its output. */
export function portRowsOf(
  node: FileNode,
  ports: PortDescriptor | undefined,
): readonly PortRow[] {
  switch (node.kind) {
    case 'input':
      return [
        {
          side: 'output',
          key: 'out',
          title: 'Output',
          type: node.params.type,
          list: false,
          chips: [],
        },
      ];
    case 'output':
      return [
        {
          side: 'input',
          key: 'in',
          title: 'Input',
          type: 'text',
          list: false,
          chips: [],
        },
      ];
    case 'tool': {
      if (ports === undefined) return [];
      const params = node.params;
      const inputs = ports.inputs.map((port): PortRow => ({
        side: 'input',
        key: port.key,
        title: port.title,
        type: port.type,
        list: port.list,
        chips: pinnedValuesOf(params, port.key),
      }));
      const output: PortRow = {
        side: 'output',
        key: ports.output.key,
        title: 'Output',
        type: ports.output.type,
        list: false,
        chips: [],
      };
      return [...inputs, output];
    }
    default:
      return [];
  }
}

/**
 * The settings a form value holds for a node: its params (or none), with the default of each non-port field
 * whose key is absent. A value that holds every default makes the form emit nothing when it starts.
 */
export function formValueOf(
  params: Readonly<Record<string, unknown>> | undefined,
  form: FormDescriptor,
): ToolArguments {
  const value: ToolArguments = { ...(params ?? {}) };
  for (const field of form.fields) {
    if (field.port || Object.hasOwn(value, field.key)) continue;
    if (field.default !== null && field.default !== undefined) {
      value[field.key] = field.default;
    }
  }
  return value;
}

/**
 * The params of a node after the form emitted a value. Each non-port field takes the emitted value, or loses
 * its key when the emitted value lacks it. Port keys and unknown keys keep the file's values. A node without
 * params keeps none when the result is empty.
 */
export function paramsAfterEdit(
  params: Readonly<Record<string, unknown>> | undefined,
  emitted: ToolArguments,
  form: FormDescriptor,
): Record<string, unknown> | undefined {
  const next: Record<string, unknown> = { ...(params ?? {}) };
  for (const field of form.fields) {
    if (field.port) continue;
    if (Object.hasOwn(emitted, field.key)) {
      next[field.key] = emitted[field.key];
    } else {
      delete next[field.key];
    }
  }
  return params === undefined && Object.keys(next).length === 0
    ? undefined
    : next;
}

/** The issues that block a run: the error-severity ones, in their order. */
export function blockingIssuesOf(
  issues: readonly ValidationIssue[],
): readonly ValidationIssue[] {
  return issues.filter((issue) => issue.severity === 'error');
}
