import { z } from 'zod';
import { sseEnvelopeSchema } from '../platform/index.js';
import { nodeIdSchema } from './graph.js';
import {
  nodeResultSchema,
  nodeRunStatusSchema,
  runErrorSchema,
  runReasonSchema,
  runStateSchema,
  runStatusSchema,
} from './runs.js';

// The data of a node-status member: the node, its new status, and its result or error when it has one.
export const nodeStatusDataSchema = z.object({
  runId: z.string().min(1),
  nodeId: nodeIdSchema,
  status: nodeRunStatusSchema,
  result: nodeResultSchema.optional(),
  error: runErrorSchema.optional(),
});
export type NodeStatusData = z.infer<typeof nodeStatusDataSchema>;

// The data of a run-ended member: the run, its final status, and the reason when it ended early.
export const runEndedDataSchema = z.object({
  runId: z.string().min(1),
  status: runStatusSchema,
  reason: runReasonSchema.optional(),
});
export type RunEndedData = z.infer<typeof runEndedDataSchema>;

// The graph-runner members of Platform's SSE envelope. Each narrows `module` and `type`, and `data`.
const runStartedMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('graph-runner'),
  type: z.literal('run-started'),
  data: runStateSchema,
});

const nodeStatusMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('graph-runner'),
  type: z.literal('node-status'),
  data: nodeStatusDataSchema,
});

const runEndedMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('graph-runner'),
  type: z.literal('run-ended'),
  data: runEndedDataSchema,
});

// The graph-runner members of the SSE envelope: exactly three.
export const graphRunnerEventSchema = z.discriminatedUnion('type', [
  runStartedMemberSchema,
  nodeStatusMemberSchema,
  runEndedMemberSchema,
]);
export type GraphRunnerEvent = z.infer<typeof graphRunnerEventSchema>;
