import { z } from 'zod';
import {
  contentHashSchema,
  projectPathSchema,
} from '../project-store/files.js';
import {
  GROUNDING_RESULT_SCHEMA_VERSION,
  groundingVerdictSchema,
} from './constants.js';
import { agentRunIdSchema } from './ids.js';

// A passage the verdict cites: a search passage of the Project store without its score.
// Only sources/ is grounding evidence. This slice cannot enforce that; the engine does.
export const groundingPassageSchema = z.object({
  path: projectPathSchema,
  offset: z.number().int().min(0),
  snippet: z.string(),
});

// One checked claim. `passage` is optional here; the engine requires one for supported and weak verdicts.
export const groundingClaimSchema = z.object({
  text: z.string().min(1),
  span: z.object({
    start: z.number().int().min(0),
    end: z.number().int().min(0),
  }),
  verdict: groundingVerdictSchema,
  passage: groundingPassageSchema.optional(),
  reason: z.string(),
});

// The claims artefact of one target file, also the result of a grounding check.
export const groundingResultSchema = z.object({
  schemaVersion: z.literal(GROUNDING_RESULT_SCHEMA_VERSION),
  targetPath: projectPathSchema,
  contentHash: contentHashSchema,
  checkedAt: z.iso.datetime(),
  runId: agentRunIdSchema,
  claims: z.array(groundingClaimSchema),
});

// The counts a pending change carries. It matches the Project store's grounding field.
export const groundingSummarySchema = z.object({
  supported: z.number().int().min(0),
  weak: z.number().int().min(0),
  unsupported: z.number().int().min(0),
  checkedAt: z.iso.datetime(),
});

// Body of POST .../grounding: the file to check.
export const groundingRequestSchema = z.object({
  path: projectPathSchema,
});

export type GroundingPassage = z.infer<typeof groundingPassageSchema>;
export type GroundingClaim = z.infer<typeof groundingClaimSchema>;
export type GroundingResult = z.infer<typeof groundingResultSchema>;
export type GroundingSummary = z.infer<typeof groundingSummarySchema>;
export type GroundingRequest = z.infer<typeof groundingRequestSchema>;
