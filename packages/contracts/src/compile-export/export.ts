import { z } from 'zod';
import { exportFormatSchema } from './constants.js';
import { preflightSummarySchema } from './preflight.js';

// Body of POST the export route.
export const exportRequestSchema = z.object({
  format: exportFormatSchema,
});

// The result of an export run.
export const exportResultSchema = z.object({
  format: exportFormatSchema,
  fileName: z.string().min(1),
  bytes: z.number().int().min(0),
  downloadUrl: z.string().min(1),
  preflight: preflightSummarySchema,
  warnings: z.array(z.string()),
});

export type ExportRequest = z.infer<typeof exportRequestSchema>;
export type ExportResult = z.infer<typeof exportResultSchema>;
