import { z } from 'zod';
import { errorCodeSchema } from '../platform/index.js';
import {
  entityRefSchema,
  fileReferenceSchema,
} from '../project-store/index.js';
import { toolCallResultSchema } from '../tool-registry/index.js';
import { NODE_RUN_STATUSES, RUN_REASONS, RUN_STATUSES } from './constants.js';
import { graphIdSchema, nodeIdSchema } from './graph.js';

// The status of a run: exactly four.
export const runStatusSchema = z.enum(RUN_STATUSES);
export type RunStatus = z.infer<typeof runStatusSchema>;

// Why a run ended early.
export const runReasonSchema = z.enum(RUN_REASONS);
export type RunReason = z.infer<typeof runReasonSchema>;

// The status of one node in a run: exactly six.
export const nodeRunStatusSchema = z.enum(NODE_RUN_STATUSES);
export type NodeRunStatus = z.infer<typeof nodeRunStatusSchema>;

// The value of one input node. A file is a reference; its content is never in a run state.
export const inputValueSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('text'), text: z.string() }),
  z.strictObject({ kind: z.literal('file'), ref: fileReferenceSchema }),
  z.strictObject({
    kind: z.literal('entities'),
    refs: entityRefSchema.array(),
  }),
  z.strictObject({ kind: z.literal('style'), ref: entityRefSchema }),
]);
export type InputValue = z.infer<typeof inputValueSchema>;

// The node a run stops at: its result is the one the author asked for.
export const runTargetSchema = z.object({
  nodeId: nodeIdSchema,
});
export type RunTarget = z.infer<typeof runTargetSchema>;

// The request to start a run: the graph, the values of its input nodes, and optionally a target node or
// the output paths of its output nodes.
export const runStartRequestSchema = z.object({
  graphId: graphIdSchema,
  inputs: z.record(nodeIdSchema, inputValueSchema),
  target: runTargetSchema.optional(),
  targets: z.record(nodeIdSchema, fileReferenceSchema).optional(),
});
export type RunStartRequest = z.infer<typeof runStartRequestSchema>;

// The response of a start: the id of the new run.
export const runStartResultSchema = z.strictObject({
  runId: z.string().min(1),
});
export type RunStartResult = z.infer<typeof runStartResultSchema>;

// The request to stop a run.
export const runStopRequestSchema = z.strictObject({
  runId: z.string().min(1),
});
export type RunStopRequest = z.infer<typeof runStopRequestSchema>;

// The error of a node: a platform-wide error code and a message.
export const runErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
});
export type RunError = z.infer<typeof runErrorSchema>;

// The result of an output node: the pending change it created and the path it targets.
export const outputNodeResultSchema = z.object({
  pendingChangeId: z.string().min(1),
  path: fileReferenceSchema,
});
export type OutputNodeResult = z.infer<typeof outputNodeResultSchema>;

// The result of a node: a tool result or an output result.
export const nodeResultSchema = z.union([
  toolCallResultSchema,
  outputNodeResultSchema,
]);
export type NodeResult = z.infer<typeof nodeResultSchema>;

// The state of one node in a run.
export const nodeRunStateSchema = z.object({
  status: nodeRunStatusSchema,
  result: nodeResultSchema.optional(),
  error: runErrorSchema.optional(),
});
export type NodeRunState = z.infer<typeof nodeRunStateSchema>;

// The state of a run: its inputs and targets (values and references, never file contents), its nodes and
// the pending changes it created.
export const runStateSchema = z.object({
  runId: z.string().min(1),
  graphId: graphIdSchema,
  target: runTargetSchema.optional(),
  status: runStatusSchema,
  reason: runReasonSchema.optional(),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime().optional(),
  inputs: z.record(nodeIdSchema, inputValueSchema),
  targets: z.record(nodeIdSchema, fileReferenceSchema),
  nodes: z.record(nodeIdSchema, nodeRunStateSchema),
  pendingChangeIds: z.string().min(1).array(),
});
export type RunState = z.infer<typeof runStateSchema>;

// The response of the current-run read: the active run or the most recent finished one, or null before any run.
export const currentRunSchema = z.object({
  run: runStateSchema.nullable(),
});
export type CurrentRun = z.infer<typeof currentRunSchema>;
