import { z } from 'zod';
import { lintResultSchema } from './lint.js';

// Tool error codes. Each code has the TOOL_ prefix, which errorCodeSchema checks.
// The key is the short name, as PROVIDER_ERROR_CODES does.
export const TOOL_ERROR_CODES = {
  NOT_FOUND: 'TOOL_NOT_FOUND',
  DISABLED: 'TOOL_DISABLED',
  INVALID: 'TOOL_INVALID',
  ARGS_INVALID: 'TOOL_ARGS_INVALID',
  ENTITY_UNRESOLVED: 'TOOL_ENTITY_UNRESOLVED',
  ENTITY_KIND_MISMATCH: 'TOOL_ENTITY_KIND_MISMATCH',
  SPEC_LINT_FAILED: 'TOOL_SPEC_LINT_FAILED',
  BUILTIN_READONLY: 'TOOL_BUILTIN_READONLY',
  SCHEMA_VERSION_UNSUPPORTED: 'TOOL_SCHEMA_VERSION_UNSUPPORTED',
  MODEL_ERROR: 'TOOL_MODEL_ERROR',
} as const;

// The same ten codes as a literal tuple. z.enum needs a literal tuple, and Object.values is not typed as one.
export const TOOL_ERROR_CODE_VALUES = [
  'TOOL_NOT_FOUND',
  'TOOL_DISABLED',
  'TOOL_INVALID',
  'TOOL_ARGS_INVALID',
  'TOOL_ENTITY_UNRESOLVED',
  'TOOL_ENTITY_KIND_MISMATCH',
  'TOOL_SPEC_LINT_FAILED',
  'TOOL_BUILTIN_READONLY',
  'TOOL_SCHEMA_VERSION_UNSUPPORTED',
  'TOOL_MODEL_ERROR',
] as const;

// A tool error code, one of the ten above.
export const toolErrorCodeSchema = z.enum(TOOL_ERROR_CODE_VALUES);

export type ToolErrorCode = z.infer<typeof toolErrorCodeSchema>;

// HTTP status for each tool error code. One status per code; none is 401, which the Shell sends to /setup.
export const TOOL_ERROR_STATUS = {
  TOOL_NOT_FOUND: 404,
  TOOL_DISABLED: 409,
  TOOL_BUILTIN_READONLY: 409,
  TOOL_SCHEMA_VERSION_UNSUPPORTED: 409,
  TOOL_INVALID: 422,
  TOOL_ARGS_INVALID: 422,
  TOOL_ENTITY_UNRESOLVED: 422,
  TOOL_ENTITY_KIND_MISMATCH: 422,
  TOOL_SPEC_LINT_FAILED: 422,
  TOOL_MODEL_ERROR: 502,
} as const;

// One issue of refused tool arguments. `path` is a JSON Pointer (RFC 6901) into the arguments object:
// '/length' is the argument `length`, '/entityIds/0' the first item of `entityIds`, and '' the whole set.
// A key that contains '/' or '~' is written as '~1' or '~0'. The syntax is a rule of this comment; the
// schema does not check it, because the slice has no refine.
export const toolArgsIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export type ToolArgsIssue = z.infer<typeof toolArgsIssueSchema>;

// The details of TOOL_ARGS_INVALID.
export const toolArgsInvalidDetailsSchema = z.object({
  issues: toolArgsIssueSchema.array(),
});

export type ToolArgsInvalidDetails = z.infer<
  typeof toolArgsInvalidDetailsSchema
>;

// The details of TOOL_SPEC_LINT_FAILED: the lint result that refused the save.
export const toolSpecLintFailedDetailsSchema = z.object({
  lint: lintResultSchema,
});

export type ToolSpecLintFailedDetails = z.infer<
  typeof toolSpecLintFailedDetailsSchema
>;
