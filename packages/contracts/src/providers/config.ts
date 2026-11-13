import { z } from 'zod';

// Stored config of an openai-compatible provider. `id` is a slug, stable after creation.
// `keyRef` is an opaque reference into the secrets file, absent for keyless providers.
// `contextSize` is metadata and is not sent per request. The other sampling fields are.
export const openaiCompatibleSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  kind: z.literal('openai-compatible'),
  baseURL: z.url(),
  model: z.string(),
  temperature: z.number(),
  contextSize: z.number().int().positive(),
  maxTokens: z.number().int().positive(),
  timeout: z.number().int().min(0),
  retries: z.number().int().min(0),
  keyRef: z.string().min(1).optional(),
});

// Config sent by the UI. It has no id and no keyRef, and every field is required. Defaults come from PROVIDER_DEFAULTS.
export const openaiCompatibleInputSchema = openaiCompatibleSchema.omit({
  id: true,
  keyRef: true,
});

// Read view: the stored config, plus whether a key is set and its last four characters.
export const openaiCompatibleReadSchema = openaiCompatibleSchema.extend({
  keySet: z.boolean(),
  keyHint: z.string().min(1).max(4).optional(),
});

// Discriminated on kind. v1 has one member.
export const providerConfigSchema = z.discriminatedUnion('kind', [
  openaiCompatibleSchema,
]);

export const providerConfigInputSchema = z.discriminatedUnion('kind', [
  openaiCompatibleInputSchema,
]);

export const providerReadSchema = z.discriminatedUnion('kind', [
  openaiCompatibleReadSchema,
]);

// Response of GET /api/providers.
export const providerListSchema = z.object({
  providers: z.array(providerReadSchema),
});

// Body of POST /api/providers. `presetId` picks the id base. It is not stored.
export const providerCreateSchema = openaiCompatibleInputSchema.extend({
  presetId: z.string().min(1).optional(),
});

// Body of POST /api/providers/:id/update: any subset of the input fields.
export const providerUpdateSchema = openaiCompatibleInputSchema.partial();

export type OpenAICompatibleConfig = z.infer<typeof openaiCompatibleSchema>;
export type OpenAICompatibleInput = z.infer<typeof openaiCompatibleInputSchema>;
export type OpenAICompatibleRead = z.infer<typeof openaiCompatibleReadSchema>;
export type ProviderConfig = z.infer<typeof providerConfigSchema>;
export type ProviderConfigInput = z.infer<typeof providerConfigInputSchema>;
export type ProviderRead = z.infer<typeof providerReadSchema>;
export type ProviderList = z.infer<typeof providerListSchema>;
export type ProviderCreate = z.infer<typeof providerCreateSchema>;
export type ProviderUpdate = z.infer<typeof providerUpdateSchema>;
