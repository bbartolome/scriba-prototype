import { z } from 'zod';
import { contentHashSchema, projectPathSchema } from './files.js';
import { projectIdSchema } from './project.js';

// Who proposed a pending change: an agent run (optionally one tool call) or a recipe run's node.
export const pendingOriginSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('agent-run'),
    runId: z.string().min(1),
    toolCallId: z.string().optional(),
  }),
  z.object({
    kind: z.literal('recipe-run'),
    runId: z.string().min(1),
    graphId: z.string().min(1),
    nodeId: z.string().min(1),
  }),
]);

// The grounding summary: integer counts of the claims checked, and when they were checked.
export const pendingGroundingSchema = z.object({
  supported: z.number().int().min(0),
  weak: z.number().int().min(0),
  unsupported: z.number().int().min(0),
  checkedAt: z.iso.datetime(),
});

// Why a pending change can no longer apply cleanly.
export const pendingConflictSchema = z.object({
  reason: z.enum(['base-changed', 'target-missing', 'target-exists']),
  detectedAt: z.iso.datetime(),
});

export const pendingStatusSchema = z.enum(['pending', 'accepted', 'rejected']);

// A proposed change to one file. `proposed` is the full new text; `diff` is the unified diff of the captured base against it.
export const pendingChangeSchema = z.object({
  id: z.string().min(1),
  projectId: projectIdSchema,
  targetPath: projectPathSchema,
  kind: z.enum(['create', 'modify']),
  diff: z.string(),
  capturedBase: z
    .object({
      hash: contentHashSchema,
      content: z.string(),
    })
    .nullable(),
  proposed: z.string(),
  origin: pendingOriginSchema,
  provenance: z.looseObject({}).optional(),
  grounding: pendingGroundingSchema.optional(),
  status: pendingStatusSchema,
  conflict: pendingConflictSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

// Query of GET .../pending. `run` limits the list to the changes one run proposed.
export const pendingListQuerySchema = z.object({
  run: z.string().min(1).optional(),
});

// Response of GET .../pending: the open changes.
export const pendingListSchema = z.object({
  changes: z.array(pendingChangeSchema),
});

// Body of accept and accept-anyway. `content` is an edited text the author chose instead of `proposed`.
export const pendingDecisionSchema = z.object({
  content: z.string().optional(),
});

// The in-process input that agents and recipes pass to propose. It is not an HTTP route.
export const proposeInputSchema = z.object({
  projectId: projectIdSchema,
  path: projectPathSchema,
  content: z.string(),
  base: z.object({ content: z.string() }).optional(),
  origin: pendingOriginSchema,
  provenance: z.looseObject({}).optional(),
  grounding: pendingGroundingSchema.optional(),
});

export type PendingOrigin = z.infer<typeof pendingOriginSchema>;
export type PendingGrounding = z.infer<typeof pendingGroundingSchema>;
export type PendingConflict = z.infer<typeof pendingConflictSchema>;
export type PendingChange = z.infer<typeof pendingChangeSchema>;
export type PendingStatus = z.infer<typeof pendingStatusSchema>;
export type PendingListQuery = z.infer<typeof pendingListQuerySchema>;
export type PendingList = z.infer<typeof pendingListSchema>;
export type PendingDecision = z.infer<typeof pendingDecisionSchema>;
export type ProposeInput = z.infer<typeof proposeInputSchema>;
