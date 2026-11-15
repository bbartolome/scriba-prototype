import { z } from 'zod';
import { errorCodeSchema } from '../platform/index.js';
import {
  contentHashSchema,
  entityRefSchema,
  fileReferenceSchema,
} from '../project-store/index.js';
import {
  toolArgumentsSchema,
  toolOutputSchema,
} from '../tool-registry/index.js';
import { graphIdSchema, nodeIdSchema } from './graph.js';
import {
  nodeRunStatusSchema,
  runErrorSchema,
  runReasonSchema,
  runStatusSchema,
  runTargetSchema,
} from './runs.js';

// An input value as the run log records it. A file input carries its hash next to its reference.
export const runLogInputSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('text'), text: z.string() }),
  z.strictObject({
    kind: z.literal('file'),
    ref: fileReferenceSchema,
    hash: contentHashSchema,
  }),
  z.strictObject({
    kind: z.literal('entities'),
    refs: entityRefSchema.array(),
  }),
  z.strictObject({ kind: z.literal('style'), ref: entityRefSchema }),
]);
export type RunLogInput = z.infer<typeof runLogInputSchema>;

// One line of logs/recipe-runs/<runId>.jsonl. `type` names the entry; `at` and `runId` are on every entry.
export const runLogEntrySchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('run-started'),
    at: z.iso.datetime(),
    runId: z.string().min(1),
    graphId: graphIdSchema,
    target: runTargetSchema.optional(),
    inputs: z.record(nodeIdSchema, runLogInputSchema),
  }),
  z.strictObject({
    type: z.literal('node-status'),
    at: z.iso.datetime(),
    runId: z.string().min(1),
    nodeId: nodeIdSchema,
    status: nodeRunStatusSchema,
    error: runErrorSchema.optional(),
  }),
  z.strictObject({
    type: z.literal('tool-call'),
    at: z.iso.datetime(),
    runId: z.string().min(1),
    nodeId: nodeIdSchema,
    arguments: toolArgumentsSchema,
    output: toolOutputSchema,
    sourcesUsed: entityRefSchema.array(),
  }),
  z.strictObject({
    type: z.literal('error'),
    at: z.iso.datetime(),
    runId: z.string().min(1),
    nodeId: nodeIdSchema.optional(),
    code: errorCodeSchema,
    message: z.string(),
  }),
  z.strictObject({
    type: z.literal('pending-change'),
    at: z.iso.datetime(),
    runId: z.string().min(1),
    nodeId: nodeIdSchema,
    pendingChangeId: z.string().min(1),
    path: fileReferenceSchema,
  }),
  z.strictObject({
    type: z.literal('run-ended'),
    at: z.iso.datetime(),
    runId: z.string().min(1),
    status: runStatusSchema,
    reason: runReasonSchema.optional(),
  }),
]);
export type RunLogEntry = z.infer<typeof runLogEntrySchema>;
