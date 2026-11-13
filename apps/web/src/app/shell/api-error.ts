import type { ErrorBody } from '@bbartolome/scriba-contracts/platform';

// Codes the Shell adds for responses that carry no Platform error body.
export const CLIENT_ERROR_CODES = {
  NETWORK: 'CLIENT_NETWORK',
  UNEXPECTED_RESPONSE: 'CLIENT_UNEXPECTED_RESPONSE',
} as const;

// A non-2xx response. `status` is the HTTP status, or 0 when no response arrived.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// A 2xx response whose body does not match the schema the caller passed, or is not JSON.
// The server answered, so this is not an ApiError.
export class ApiSchemaError extends Error {
  readonly path: string;
  readonly issues: unknown;

  constructor(path: string, issues: unknown) {
    super(`The response from ${path} does not match the expected shape.`);
    this.name = 'ApiSchemaError';
    this.path = path;
    this.issues = issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Hand-written guard for a Platform error body. It mirrors errorBodySchema, except that it
// does not check the code prefix or `details`. Test T11 checks the two agree on the fixtures.
export function isPlatformErrorBody(value: unknown): value is ErrorBody {
  if (!isRecord(value)) {
    return false;
  }
  const error = value['error'];
  if (!isRecord(error)) {
    return false;
  }
  return (
    typeof error['code'] === 'string' && typeof error['message'] === 'string'
  );
}
