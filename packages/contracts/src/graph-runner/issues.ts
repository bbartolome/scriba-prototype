import { z } from 'zod';
import { GRAPH_ISSUE_CODES, GRAPH_ISSUE_SEVERITIES } from './constants.js';

// The severity of a validation issue: error blocks a run, warning does not.
export const graphIssueSeveritySchema = z.enum(GRAPH_ISSUE_SEVERITIES);
export type GraphIssueSeverity = z.infer<typeof graphIssueSeveritySchema>;

// One of the issue codes of constants.ts.
export const graphIssueCodeSchema = z.enum(GRAPH_ISSUE_CODES);
export type GraphIssueCode = z.infer<typeof graphIssueCodeSchema>;

// One validation issue. `nodeId`, `edgeId` and `portId` name what the issue is about, when it is about one.
export const validationIssueSchema = z.object({
  code: graphIssueCodeSchema,
  severity: graphIssueSeveritySchema,
  nodeId: z.string().min(1).optional(),
  edgeId: z.string().min(1).optional(),
  portId: z.string().min(1).optional(),
  message: z.string(),
});
export type ValidationIssue = z.infer<typeof validationIssueSchema>;

// The result of a validation: the issues found, possibly none.
export const validationResultSchema = z.strictObject({
  issues: validationIssueSchema.array(),
});
export type ValidationResult = z.infer<typeof validationResultSchema>;
