import { z } from 'zod';
import { entityRefSchema } from '../project-store/entities.js';
import { agentRunIdSchema, toolCallIdSchema } from './ids.js';

// Where a draft came from. It lives on the pending change's provenance and in the transcript, not in the draft.
export const draftProvenanceSchema = z.object({
  runId: agentRunIdSchema,
  toolCallId: toolCallIdSchema,
  tool: z.string().min(1),
  entityIds: z.array(entityRefSchema),
  sourcesUsed: z.array(entityRefSchema),
  model: z.string(),
  at: z.iso.datetime(),
});

export type DraftProvenance = z.infer<typeof draftProvenanceSchema>;
