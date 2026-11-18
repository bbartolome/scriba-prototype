import { z } from 'zod';

// Compile-export error codes. Each code has the COMPILE_ prefix, which errorCodeSchema checks.
// The key is the short name, as PROJECT_ERROR_CODES does.
export const COMPILE_ERROR_CODES = {
  ORDER_CONFLICT: 'COMPILE_ORDER_CONFLICT',
  INVALID_REORDER: 'COMPILE_INVALID_REORDER',
  GRAPH_ORDERED_MOVE: 'COMPILE_GRAPH_ORDERED_MOVE',
  EXPORT_BUSY: 'COMPILE_EXPORT_BUSY',
  PANDOC_FAILED: 'COMPILE_PANDOC_FAILED',
  PANDOC_TIMEOUT: 'COMPILE_PANDOC_TIMEOUT',
  TEMPLATE_INVALID: 'COMPILE_TEMPLATE_INVALID',
  EMPTY_MANUSCRIPT: 'COMPILE_EMPTY_MANUSCRIPT',
  SNAPSHOT_NOT_FOUND: 'COMPILE_SNAPSHOT_NOT_FOUND',
  SNAPSHOT_UNREADABLE: 'COMPILE_SNAPSHOT_UNREADABLE',
} as const;

// The same ten codes as a literal tuple. z.enum needs a literal tuple, and Object.values is not typed as one.
export const COMPILE_ERROR_CODE_VALUES = [
  'COMPILE_ORDER_CONFLICT',
  'COMPILE_INVALID_REORDER',
  'COMPILE_GRAPH_ORDERED_MOVE',
  'COMPILE_EXPORT_BUSY',
  'COMPILE_PANDOC_FAILED',
  'COMPILE_PANDOC_TIMEOUT',
  'COMPILE_TEMPLATE_INVALID',
  'COMPILE_EMPTY_MANUSCRIPT',
  'COMPILE_SNAPSHOT_NOT_FOUND',
  'COMPILE_SNAPSHOT_UNREADABLE',
] as const;

export const compileErrorCodeSchema = z.enum(COMPILE_ERROR_CODE_VALUES);

export type CompileErrorCode = z.infer<typeof compileErrorCodeSchema>;

// HTTP status for each compile-export error code. A state conflict is 409, a refused request 422, not found 404.
// A timeout is 504 and a failed child process 500, which the project-store map has no precedent for.
export const COMPILE_ERROR_STATUS = {
  COMPILE_ORDER_CONFLICT: 409,
  COMPILE_INVALID_REORDER: 422,
  COMPILE_GRAPH_ORDERED_MOVE: 422,
  COMPILE_EXPORT_BUSY: 409,
  COMPILE_PANDOC_FAILED: 500,
  COMPILE_PANDOC_TIMEOUT: 504,
  COMPILE_TEMPLATE_INVALID: 422,
  COMPILE_EMPTY_MANUSCRIPT: 422,
  COMPILE_SNAPSHOT_NOT_FOUND: 404,
  COMPILE_SNAPSHOT_UNREADABLE: 409,
} as const;
