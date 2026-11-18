import { z } from 'zod';
import { projectPathSchema } from '../project-store/files.js';
import {
  checkStatusSchema,
  findingSeveritySchema,
  preflightCheckIdSchema,
} from './constants.js';
import { manuscriptRevisionSchema } from './order.js';

// Body of POST the preflight route. It carries no fields.
export const preflightRequestSchema = z.object({});

// One finding. `path` is a project path, because an orphan scene or a stale entry can name a path outside drafts/.
// `line` is one-based. `ref` is opaque to the contract: a check may put its own data there.
export const preflightFindingSchema = z.object({
  check: preflightCheckIdSchema,
  severity: findingSeveritySchema,
  path: projectPathSchema,
  line: z.number().int().min(1).optional(),
  offset: z.number().int().min(0).optional(),
  length: z.number().int().min(0).optional(),
  message: z.string(),
  ref: z.record(z.string(), z.unknown()).optional(),
});

// The result of one check.
export const preflightCheckSchema = z.object({
  id: preflightCheckIdSchema,
  status: checkStatusSchema,
  findings: z.array(preflightFindingSchema),
});

// The result of a preflight run.
export const preflightResultSchema = z.object({
  ranAt: z.iso.datetime(),
  revision: manuscriptRevisionSchema,
  checks: z.array(preflightCheckSchema),
});

// The counts of a preflight run, carried by the export result.
export const preflightSummarySchema = z.object({
  ranAt: z.iso.datetime(),
  revision: manuscriptRevisionSchema,
  errors: z.number().int().min(0),
  warnings: z.number().int().min(0),
  infos: z.number().int().min(0),
});

export type PreflightRequest = z.infer<typeof preflightRequestSchema>;
export type PreflightFinding = z.infer<typeof preflightFindingSchema>;
export type PreflightCheck = z.infer<typeof preflightCheckSchema>;
export type PreflightResult = z.infer<typeof preflightResultSchema>;
export type PreflightSummary = z.infer<typeof preflightSummarySchema>;
