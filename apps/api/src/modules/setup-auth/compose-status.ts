import type { ComposeVersionStatus } from '@bbartolome/scriba-contracts/setup-auth';

// `actual` is SCRIBA_COMPOSE_VERSION, or undefined when it is unset. `expected` is the compose version of this image.
export function composeVersionStatus(
  actual: number | undefined,
  expected: number,
): ComposeVersionStatus {
  if (actual === undefined) return { state: 'unknown', expected };
  return { state: actual === expected ? 'ok' : 'mismatch', expected, actual };
}
