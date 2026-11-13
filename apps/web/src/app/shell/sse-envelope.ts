import type {
  PublishingModuleSlug,
  SseEnvelope,
} from '@bbartolome/scriba-contracts/platform';

// Hand-written copies of Platform's SSE contract. The Shell ships no runtime zod, so these values
// and the guard below are checked against the contract by sse-envelope.spec.ts (T13).

/** Platform's events route (`EVENTS_ROUTE` in events.ts). */
export const EVENTS_PATH = '/events';

/** Platform's health route (`HEALTHZ_ROUTE` in http.ts). */
export const HEALTHZ_PATH = '/healthz';

/** Modules allowed as an envelope's `module` (`PUBLISHING_MODULE_SLUGS` in slugs.ts). */
export const PUBLISHING_SLUGS = [
  'platform',
  'setup-auth',
  'providers',
  'project-store',
  'tool-registry',
  'agent-loop',
  'graph-runner',
  'compile-export',
] as const satisfies readonly PublishingModuleSlug[];

/** The envelope's `type` pattern (`EVENT_TYPE_PATTERN` in events.ts). */
const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Checks a parsed SSE frame against the base envelope (`sseEnvelopeSchema` in events.ts): a plain
 * object, a `module` in PUBLISHING_SLUGS, a `type` matching the pattern, and a `data` key of any
 * value (`null` included).
 */
export function isPlatformEnvelope(value: unknown): value is SseEnvelope {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const moduleSlug = candidate['module'];
  const type = candidate['type'];
  return (
    typeof moduleSlug === 'string' &&
    (PUBLISHING_SLUGS as readonly string[]).includes(moduleSlug) &&
    typeof type === 'string' &&
    EVENT_TYPE_PATTERN.test(type) &&
    'data' in candidate
  );
}
