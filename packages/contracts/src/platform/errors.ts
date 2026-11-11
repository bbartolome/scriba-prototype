import { z } from 'zod';

// Each module's error codes start with its prefix. Platform declares its own codes below.
export const ERROR_CODE_PREFIXES = [
  'PLATFORM',
  'SETUP',
  'AUTH',
  'PROVIDER',
  'PROJECT',
  'TOOL',
  'AGENT',
  'GRAPH',
  'COMPILE',
] as const;

// SCREAMING_SNAKE_CASE with a known prefix, e.g. PLATFORM_NOT_FOUND.
const ERROR_CODE_PATTERN = new RegExp(
  `^(${ERROR_CODE_PREFIXES.join('|')})_[A-Z0-9]+(_[A-Z0-9]+)*$`,
);

export const errorCodeSchema = z.string().regex(ERROR_CODE_PATTERN);

// Base error shape. The HTTP status lives on the response, not in the body.
// `message` is human-readable and never contains secrets. `details` is optional structured data.
export const errorBodySchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ErrorBody = z.infer<typeof errorBodySchema>;

// Platform's error codes.
export const PLATFORM_ERROR_CODES = {
  VALIDATION_FAILED: 'PLATFORM_VALIDATION_FAILED',
  NOT_FOUND: 'PLATFORM_NOT_FOUND',
  PAYLOAD_TOO_LARGE: 'PLATFORM_PAYLOAD_TOO_LARGE',
  INTERNAL: 'PLATFORM_INTERNAL',
} as const;

// HTTP status for each platform error code.
export const PLATFORM_ERROR_STATUS = {
  PLATFORM_VALIDATION_FAILED: 400,
  PLATFORM_NOT_FOUND: 404,
  PLATFORM_PAYLOAD_TOO_LARGE: 413,
  PLATFORM_INTERNAL: 500,
} as const;
