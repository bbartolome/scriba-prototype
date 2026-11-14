import { z } from 'zod';
import { entityRefSchema } from '../project-store/entities.js';
import { projectPathSchema } from '../project-store/files.js';
import { agentCardStatusSchema, agentToolFamilySchema } from './constants.js';
import { toolCallIdSchema } from './ids.js';
import { draftProvenanceSchema } from './provenance.js';

// The before and after text of a write, for the diff preview. `base` is '' for a file that does not exist yet.
export const diffPreviewSchema = z.object({
  path: projectPathSchema,
  base: z.string(),
  proposed: z.string(),
});

// The state of one tool-call card: the sum of the tool-call events of one call.
// `output` is untyped: a narrative tool's value has the {kind, content} shape, while other families return other shapes.
export const agentCardSchema = z.object({
  callId: toolCallIdSchema,
  name: z.string().min(1),
  family: agentToolFamilySchema,
  status: agentCardStatusSchema,
  arguments: z.unknown().optional(),
  valid: z.boolean().optional(),
  summary: z.string().optional(),
  output: z.unknown().optional(),
  diffPreview: diffPreviewSchema.optional(),
  sourcesUsed: z.array(entityRefSchema).optional(),
  provenance: draftProvenanceSchema.optional(),
  error: z
    .object({
      message: z.string(),
      attempt: z.number().int().min(1),
      withdrawn: z.boolean().optional(),
    })
    .optional(),
});

export type DiffPreview = z.infer<typeof diffPreviewSchema>;
export type AgentCard = z.infer<typeof agentCardSchema>;
