import { z } from 'zod';

// Graph-runner error codes. Each code has the GRAPH_ prefix, which errorCodeSchema checks.
// The key is the short name, as TOOL_ERROR_CODES does.
export const GRAPH_ERROR_CODES = {
  NOT_FOUND: 'GRAPH_NOT_FOUND',
  SCHEMA_INVALID: 'GRAPH_SCHEMA_INVALID',
  SCHEMA_VERSION_UNSUPPORTED: 'GRAPH_SCHEMA_VERSION_UNSUPPORTED',
  VALIDATION_FAILED: 'GRAPH_VALIDATION_FAILED',
  VIEW_NOT_RUNNABLE: 'GRAPH_VIEW_NOT_RUNNABLE',
  RUN_ACTIVE: 'GRAPH_RUN_ACTIVE',
  RUN_NOT_FOUND: 'GRAPH_RUN_NOT_FOUND',
  INPUT_MISSING: 'GRAPH_INPUT_MISSING',
  INPUT_INVALID: 'GRAPH_INPUT_INVALID',
  TARGET_INVALID: 'GRAPH_TARGET_INVALID',
} as const;

// The same ten codes as a literal tuple. z.enum needs a literal tuple, and Object.values is not typed as one.
export const GRAPH_ERROR_CODE_VALUES = [
  'GRAPH_NOT_FOUND',
  'GRAPH_SCHEMA_INVALID',
  'GRAPH_SCHEMA_VERSION_UNSUPPORTED',
  'GRAPH_VALIDATION_FAILED',
  'GRAPH_VIEW_NOT_RUNNABLE',
  'GRAPH_RUN_ACTIVE',
  'GRAPH_RUN_NOT_FOUND',
  'GRAPH_INPUT_MISSING',
  'GRAPH_INPUT_INVALID',
  'GRAPH_TARGET_INVALID',
] as const;

// A graph-runner error code, one of the ten above.
export const graphErrorCodeSchema = z.enum(GRAPH_ERROR_CODE_VALUES);

export type GraphErrorCode = z.infer<typeof graphErrorCodeSchema>;

// HTTP status for each graph-runner error code. One status per code; none is 401, which the Shell sends to /setup.
export const GRAPH_ERROR_STATUS = {
  GRAPH_NOT_FOUND: 404,
  GRAPH_RUN_NOT_FOUND: 404,
  GRAPH_SCHEMA_VERSION_UNSUPPORTED: 409,
  GRAPH_VIEW_NOT_RUNNABLE: 409,
  GRAPH_RUN_ACTIVE: 409,
  GRAPH_SCHEMA_INVALID: 422,
  GRAPH_VALIDATION_FAILED: 422,
  GRAPH_INPUT_MISSING: 422,
  GRAPH_INPUT_INVALID: 422,
  GRAPH_TARGET_INVALID: 422,
} as const;
