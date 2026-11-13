import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
} from 'openai';
import {
  PROVIDER_ERROR_STATUS,
  type ProviderErrorCode,
} from '@bbartolome/scriba-contracts/providers';
import { ModuleError } from '../../platform/platform.module';
import { retryAfterMs } from './retry';

// The codes the client throws. The Navigator's status table is PROVIDER_ERROR_STATUS.
export type ClientErrorCode = Exclude<
  ProviderErrorCode,
  'PROVIDER_DEFAULT_IN_USE' | 'PROVIDER_NOT_FOUND'
>;

// One fixed English message per code. No upstream text, no key, no details.
const MESSAGES: Record<ClientErrorCode, string> = {
  PROVIDER_UNREACHABLE: 'The model provider could not be reached.',
  PROVIDER_UNAUTHORIZED: 'The model provider rejected the API key.',
  PROVIDER_MODEL_NOT_FOUND: 'The model provider does not know the model.',
  PROVIDER_TIMEOUT: 'The model provider did not respond in time.',
  PROVIDER_RATE_LIMITED: 'The model provider is rate limiting requests.',
  PROVIDER_BAD_RESPONSE: 'The model provider sent an unusable response.',
  PROVIDER_ABORTED: 'The model request was aborted.',
  PROVIDER_NOT_CONFIGURED:
    'The model provider is not configured for a request.',
};

export function providerError(code: ClientErrorCode): ModuleError {
  return new ModuleError(code, PROVIDER_ERROR_STATUS[code], MESSAGES[code]);
}

export type Endpoint = 'chat' | 'models';

// One failed attempt: the coded error, whether the client may retry it, and the Retry-After wait.
export interface Failure {
  error: ModuleError;
  retryable: boolean;
  retryAfterMs: number;
}

// What the attempt knows when it fails. The caller's abort and the client's own timer come first (S11).
export interface AttemptState {
  callerAborted: boolean;
  timedOut: boolean;
  endpoint: Endpoint;
}

const UNDICI_TIMEOUT_CODES = [
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
];

function failure(
  code: ClientErrorCode,
  retryable: boolean,
  retryAfter = 0,
): Failure {
  return { error: providerError(code), retryable, retryAfterMs: retryAfter };
}

// The `code` of the error and of its cause (undici puts its transport code on the cause).
function transportCodes(raw: unknown): string[] {
  const codes: string[] = [];
  let current: unknown = raw;
  for (let depth = 0; depth < 2 && typeof current === 'object'; depth++) {
    if (current === null) {
      break;
    }
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string') {
      codes.push(code);
    }
    current = (current as { cause?: unknown }).cause;
  }
  return codes;
}

// The provider's error body, whichever wrapping the SDK used (S8, D7).
function isModelNotFound(error: APIError): boolean {
  const body = error.error as
    { error?: unknown; code?: unknown; message?: unknown } | undefined;
  const inner = (body?.error ?? body) as
    { code?: unknown; message?: unknown } | undefined;
  if (inner?.code === 'model_not_found') {
    return true;
  }
  const message = typeof inner?.message === 'string' ? inner.message : '';
  return /model/i.test(message) && /not (found|exist)/i.test(message);
}

// The status mapping of S8.
function statusFailure(error: APIError, endpoint: Endpoint): Failure {
  const status = error.status ?? 0;
  const retryAfter = retryAfterMs(error.headers);
  if (status === 401 || status === 403) {
    return failure('PROVIDER_UNAUTHORIZED', false);
  }
  if (status === 404) {
    return endpoint === 'chat'
      ? failure('PROVIDER_MODEL_NOT_FOUND', false)
      : failure('PROVIDER_BAD_RESPONSE', false);
  }
  if (status === 400 && endpoint === 'chat' && isModelNotFound(error)) {
    return failure('PROVIDER_MODEL_NOT_FOUND', false);
  }
  if (status === 429) {
    return failure('PROVIDER_RATE_LIMITED', true, retryAfter);
  }
  if (status === 408) {
    return failure('PROVIDER_TIMEOUT', true, retryAfter);
  }
  if (status === 409 || (status >= 500 && status <= 599)) {
    return failure('PROVIDER_BAD_RESPONSE', true, retryAfter);
  }
  return failure('PROVIDER_BAD_RESPONSE', false);
}

// Maps one failure to its coded error, in the precedence of S11. `raw` is undefined when the
// attempt ended without an SDK error (no chunk, or the client's own timer or the caller's abort).
export function classifyFailure(raw: unknown, state: AttemptState): Failure {
  if (state.callerAborted) {
    return failure('PROVIDER_ABORTED', false);
  }
  if (state.timedOut) {
    return failure('PROVIDER_TIMEOUT', true);
  }
  if (raw === undefined) {
    return failure('PROVIDER_BAD_RESPONSE', false);
  }
  const codes = transportCodes(raw);
  if (
    raw instanceof APIConnectionTimeoutError ||
    codes.some((code) => UNDICI_TIMEOUT_CODES.includes(code))
  ) {
    return failure('PROVIDER_TIMEOUT', true);
  }
  if (
    raw instanceof APIConnectionError ||
    codes.some((code) => code.startsWith('UND_ERR_'))
  ) {
    return failure('PROVIDER_UNREACHABLE', true);
  }
  if (raw instanceof APIError && typeof raw.status === 'number') {
    return statusFailure(raw, state.endpoint);
  }
  return failure('PROVIDER_BAD_RESPONSE', false);
}
