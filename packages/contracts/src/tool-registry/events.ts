import { z } from 'zod';
import { sseEnvelopeSchema } from '../platform/index.js';

// The data of the catalog-changed member: the names of the tools whose catalog entry changed.
// A file that cannot be parsed counts by its stem.
export const catalogChangedDataSchema = z.object({
  names: z.string().min(1).array(),
});
export type CatalogChangedData = z.infer<typeof catalogChangedDataSchema>;

// The catalog-changed member of Platform's SSE envelope.
const catalogChangedMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('tool-registry'),
  type: z.literal('catalog-changed'),
  data: catalogChangedDataSchema,
});

// The tool-registry members of the SSE envelope: exactly one.
export const toolRegistryEventSchema = z.discriminatedUnion('type', [
  catalogChangedMemberSchema,
]);
export type ToolRegistryEvent = z.infer<typeof toolRegistryEventSchema>;
