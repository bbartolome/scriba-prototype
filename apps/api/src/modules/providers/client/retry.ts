import type { Failure } from './errors';

const BACKOFF_BASE_MS = 500;
const BACKOFF_CAP_MS = 8000;

// The wait before retry n (n = 1, 2, ...): min(500 x 2^(n-1), 8000) ms, with no jitter.
export function backoffMs(retry: number): number {
  return Math.min(BACKOFF_BASE_MS * 2 ** (retry - 1), BACKOFF_CAP_MS);
}

// The wait before a retry: the backoff, raised to the Retry-After value when that is longer.
export function retryWaitMs(retry: number, retryAfter: number): number {
  return Math.max(backoffMs(retry), retryAfter);
}

// Retry-After in seconds or as an HTTP date, in ms. 0 when the header is absent or unreadable.
// It has no cap (open point 6).
export function retryAfterMs(headers: unknown, now = Date.now()): number {
  const value = readHeader(headers, 'retry-after');
  if (value === undefined) {
    return 0;
  }
  const seconds = Number(value);
  if (value.trim() !== '' && Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : 0;
}

function readHeader(headers: unknown, name: string): string | undefined {
  if (typeof headers !== 'object' || headers === null) {
    return undefined;
  }
  const get = (headers as { get?: unknown }).get;
  if (typeof get === 'function') {
    const value: unknown = get.call(headers, name);
    return typeof value === 'string' ? value : undefined;
  }
  const value = (headers as Record<string, unknown>)[name];
  return typeof value === 'string' ? value : undefined;
}

// The retry boundary (S5, S6): only before the first SDK chunk, and only while the attempt
// number (1 for the first) is at most `retries`, so `retries` counts the retries after the first attempt.
export function mayRetry(
  failure: Failure,
  attempt: number,
  retries: number,
  sawChunk: boolean,
): boolean {
  return failure.retryable && !sawChunk && attempt <= retries;
}
