import { z } from 'zod';

// Provider error codes. Each code has the PROVIDER_ prefix, which errorCodeSchema checks.
// The key is the short name, as SETUP_AUTH_ERROR_CODES does.
export const PROVIDER_ERROR_CODES = {
  UNREACHABLE: 'PROVIDER_UNREACHABLE',
  UNAUTHORIZED: 'PROVIDER_UNAUTHORIZED',
  MODEL_NOT_FOUND: 'PROVIDER_MODEL_NOT_FOUND',
  TIMEOUT: 'PROVIDER_TIMEOUT',
  RATE_LIMITED: 'PROVIDER_RATE_LIMITED',
  BAD_RESPONSE: 'PROVIDER_BAD_RESPONSE',
  ABORTED: 'PROVIDER_ABORTED',
  NOT_CONFIGURED: 'PROVIDER_NOT_CONFIGURED',
  DEFAULT_IN_USE: 'PROVIDER_DEFAULT_IN_USE',
  NOT_FOUND: 'PROVIDER_NOT_FOUND',
} as const;

// The same ten codes as a literal tuple. z.enum needs a literal tuple, and Object.values is not typed as one.
export const PROVIDER_ERROR_CODE_VALUES = [
  'PROVIDER_UNREACHABLE',
  'PROVIDER_UNAUTHORIZED',
  'PROVIDER_MODEL_NOT_FOUND',
  'PROVIDER_TIMEOUT',
  'PROVIDER_RATE_LIMITED',
  'PROVIDER_BAD_RESPONSE',
  'PROVIDER_ABORTED',
  'PROVIDER_NOT_CONFIGURED',
  'PROVIDER_DEFAULT_IN_USE',
  'PROVIDER_NOT_FOUND',
] as const;

export const providerErrorCodeSchema = z.enum(PROVIDER_ERROR_CODE_VALUES);

export type ProviderErrorCode = z.infer<typeof providerErrorCodeSchema>;
