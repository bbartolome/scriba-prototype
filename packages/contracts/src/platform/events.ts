import { z } from 'zod';
import { PUBLISHING_MODULE_SLUGS } from './slugs.js';

// Stream constants.
export const EVENTS_ROUTE = '/events' as const;
export const ECHO_ROUTE = '/api/platform/echo' as const;
export const SSE_RETRY_MS = 3000;
export const SSE_HEARTBEAT_MS = 15000;

// Event `type`: short kebab-case, no dots, e.g. `pending-created`, `node-status`.
const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

// Base SSE envelope. Each module extends it with its own members; `data` is required by each
// member schema, not by the base.
export const sseEnvelopeSchema = z.object({
  module: z.enum(PUBLISHING_MODULE_SLUGS),
  type: z.string().regex(EVENT_TYPE_PATTERN),
  data: z.unknown(),
});

export type SseEnvelope = z.infer<typeof sseEnvelopeSchema>;

// platform/hello: sent first on every connection.
export const helloDataSchema = z.object({
  streamId: z.string().min(1),
  version: z.string().min(1),
  serverTime: z.iso.datetime(),
});

// platform/echo: diagnostic event.
export const echoDataSchema = z.object({
  seq: z.number().int().min(1),
  sentAt: z.iso.datetime(),
});

// Request body of POST /api/platform/echo.
export const echoRequestSchema = z.object({
  count: z.number().int().min(1),
  intervalMs: z.number().int().min(0),
});

const helloMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('platform'),
  type: z.literal('hello'),
  data: helloDataSchema,
});

const echoMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('platform'),
  type: z.literal('echo'),
  data: echoDataSchema,
});

// Platform's own members of the SSE envelope.
export const platformEventSchema = z.discriminatedUnion('type', [
  helloMemberSchema,
  echoMemberSchema,
]);

export type PlatformEvent = z.infer<typeof platformEventSchema>;
export type HelloData = z.infer<typeof helloDataSchema>;
export type EchoData = z.infer<typeof echoDataSchema>;
export type EchoRequest = z.infer<typeof echoRequestSchema>;
