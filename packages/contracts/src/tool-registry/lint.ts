import { z } from 'zod';
import { LINT_SEVERITIES } from './constants.js';
import { toolViewsSchema } from './views.js';

// The severity of a diagnostic: an error refuses the save, a warning does not.
export const lintSeveritySchema = z.enum(LINT_SEVERITIES);
export type LintSeverity = z.infer<typeof lintSeveritySchema>;

// One diagnostic. `line` and `column` are 1-based positions in the YAML source (open point 5).
export const lintDiagnosticSchema = z.object({
  severity: lintSeveritySchema,
  rule: z.string().min(1),
  message: z.string(),
  line: z.number().int().min(1),
  column: z.number().int().min(1),
});
export type LintDiagnostic = z.infer<typeof lintDiagnosticSchema>;

// The lint result: the list of diagnostics.
export const lintResultSchema = lintDiagnosticSchema.array();
export type LintResult = z.infer<typeof lintResultSchema>;

// The number of errors and warnings of a tool.
export const lintCountsSchema = z.object({
  errors: z.number().int().min(0),
  warnings: z.number().int().min(0),
});
export type LintCounts = z.infer<typeof lintCountsSchema>;

// The lint request: the YAML source, and the file stem it is or will be saved under when known.
export const lintRequestSchema = z.object({
  source: z.string(),
  name: z.string().min(1).optional(),
});
export type LintRequest = z.infer<typeof lintRequestSchema>;

// The lint response: the diagnostics, and the three views when there is no error.
export const lintResponseSchema = z.object({
  lint: lintResultSchema,
  views: toolViewsSchema.nullable(),
});
export type LintResponse = z.infer<typeof lintResponseSchema>;
