import { OUTPUT_PORT_KEY } from '../tool-registry/index.js';

// Constants of the graph-runner contract slice: shapes and constants only.

// The version of a graph file. The schemas refuse any other value. GRR-02 answers a higher one with
// GRAPH_SCHEMA_VERSION_UNSUPPORTED before it parses the file.
export const GRAPH_SCHEMA_VERSION = 1 as const;

// The two views of one graph file format.
export const GRAPH_VIEWS = ['story', 'recipe'] as const;

// The node kinds of a story graph. Each kind is legal in one view only.
export const STORY_NODE_KINDS = ['entity', 'scene', 'beat'] as const;

// The node kinds of a recipe. Each kind is legal in one view only.
export const RECIPE_NODE_KINDS = ['input', 'tool', 'output'] as const;

// A node id: lower-case letters, digits and hyphens. No dot, because the dot separates a node id from a port key.
export const NODE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

// A graph id is the file stem of graphs/<id>.json, so it follows the node-id pattern.
export const GRAPH_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

// The port key of the one output port of an input node.
export const INPUT_NODE_OUTPUT_KEY = 'out' as const;

// The port key of the one input port of an output node.
export const OUTPUT_NODE_INPUT_KEY = 'in' as const;

// The port key of the one output port of a tool node: the Tool registry's output key.
export const TOOL_NODE_OUTPUT_KEY = OUTPUT_PORT_KEY;

/**
 * The relation vocabulary of a story edge, with the meaning of each. Any other non-empty string is
 * allowed as a relation. Compile & export reads only the `order` edges.
 */
export const RELATION_VOCABULARY = {
  order: 'from precedes to',
  causality: 'from causes to',
  containment: 'from contains to',
} as const;

// The folder of the graph files: graphs/<id>.json.
export const GRAPH_FOLDER = 'graphs' as const;

// The folder of the run logs: logs/recipe-runs/<runId>.jsonl.
export const RUN_LOG_FOLDER = 'logs/recipe-runs' as const;

// The statuses of a run.
export const RUN_STATUSES = ['running', 'done', 'error', 'stopped'] as const;

// Why a run ended before its last node finished.
export const RUN_REASONS = [
  'author',
  'project-switched',
  'interrupted',
] as const;

// The statuses of one node in a run.
export const NODE_RUN_STATUSES = [
  'idle',
  'queued',
  'running',
  'done',
  'error',
  'stopped',
] as const;

// The severities of a validation issue.
export const GRAPH_ISSUE_SEVERITIES = ['error', 'warning'] as const;

/**
 * The error issue codes. Each code is one rule of GRR-03 line 20 (recipe errors, which block a run), in
 * the order of that line:
 * - `illegal-node-kind`: a node kind that the view does not allow.
 * - `unknown-tool`: a tool node names a tool the registry does not have.
 * - `disabled-tool`: a tool node names a tool that is disabled.
 * - `missing-port`: a wire to or from a port that does not exist.
 * - `port-type-mismatch`: a wire whose port types differ.
 * - `multiple-wires-into-port`: more than one wire into one input.
 * - `port-wired-and-pinned`: a port that is both wired and pinned.
 * - `required-port-unfed`: a required port with neither a wire nor a pinned value.
 * - `tool-params-invalid`: a required non-port setting missing from `params` (the registry's params-mode validate).
 * - `cycle`: the recipe has a cycle.
 * - `output-unwired`: an output node with no wire in.
 * - `output-not-fed-by-tool`: an output node fed by anything but a tool node.
 * - `output-kind-unwritable`: an output node fed by a tool whose output kind cannot be written (`claims`, `check`).
 * - `duplicate-id`: a node id or an edge id that repeats.
 */
export const GRAPH_ERROR_ISSUE_CODES = [
  'illegal-node-kind',
  'unknown-tool',
  'disabled-tool',
  'missing-port',
  'port-type-mismatch',
  'multiple-wires-into-port',
  'port-wired-and-pinned',
  'required-port-unfed',
  'tool-params-invalid',
  'cycle',
  'output-unwired',
  'output-not-fed-by-tool',
  'output-kind-unwritable',
  'duplicate-id',
] as const;

/**
 * The warning issue codes. Recipe warnings are the first three, in the order of GRR-03 line 21; the
 * story warnings are the last five, in the order of GRR-03 line 22.
 * - `dead-step`: a node with no path to any output.
 * - `input-unwired`: an input node with no wire out.
 * - `pinned-entity-missing`: a pinned entity whose file no longer exists.
 * - `path-missing`: a story `path` that does not exist.
 * - `path-unsafe`: a story `path` that is unsafe.
 * - `path-in-versions`: a story `path` that points into `drafts/.versions/`.
 * - `unknown-edge-node`: a story edge to a node that does not exist.
 * - `entity-path-outside-entities`: an entity node whose `path` is outside `entities/`.
 */
export const GRAPH_WARNING_ISSUE_CODES = [
  'dead-step',
  'input-unwired',
  'pinned-entity-missing',
  'path-missing',
  'path-unsafe',
  'path-in-versions',
  'unknown-edge-node',
  'entity-path-outside-entities',
] as const;

// Every issue code: the error codes, then the warning codes.
export const GRAPH_ISSUE_CODES = [
  ...GRAPH_ERROR_ISSUE_CODES,
  ...GRAPH_WARNING_ISSUE_CODES,
] as const;
