import {
  EVENTS_ROUTE,
  HEALTHZ_ROUTE,
  PUBLISHING_MODULE_SLUGS,
  sseEnvelopeSchema,
} from '@bbartolome/scriba-contracts/platform';
import { describe, expect, it } from 'vitest';
import {
  EVENTS_PATH,
  HEALTHZ_PATH,
  isPlatformEnvelope,
  PUBLISHING_SLUGS,
} from './sse-envelope';

describe('sse-envelope', () => {
  it('the local guard, route paths and slug list agree with the contracts', () => {
    const samples: unknown[] = [
      { module: 'agent-loop', type: 'node-status', data: {} },
      { module: 'not-a-module', type: 'x', data: {} },
      { module: 'agent-loop', type: 'node-status' },
      { module: 'agent-loop', type: 'node-status', data: null },
      { module: 'agent-loop', type: 'Node-Status', data: {} },
      { module: 'agent-loop', type: 'node.status', data: {} },
      'agent-loop',
      ['agent-loop', 'node-status', {}],
    ];

    // The valid sample is accepted by both, so the table cannot pass with two always-false checks.
    expect(sseEnvelopeSchema.safeParse(samples[0]).success).toBe(true);
    expect(isPlatformEnvelope(samples[0])).toBe(true);
    for (const sample of samples) {
      expect(isPlatformEnvelope(sample)).toBe(
        sseEnvelopeSchema.safeParse(sample).success,
      );
    }

    expect(PUBLISHING_SLUGS).toEqual(PUBLISHING_MODULE_SLUGS);
    expect(EVENTS_PATH).toBe(EVENTS_ROUTE);
    expect(HEALTHZ_PATH).toBe(HEALTHZ_ROUTE);
  });
});
