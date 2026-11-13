import { z } from 'zod';

// A model choice: a provider and a model id. An empty model means the provider's own default.
// The app default request and the per-project override use this shape.
export const modelChoiceSchema = z.object({
  providerId: z.string().min(1),
  model: z.string(),
});

export const EFFECTIVE_MODEL_SOURCES = ['project', 'app', 'auto'] as const;

export const effectiveModelSourceSchema = z.enum(EFFECTIVE_MODEL_SOURCES);

// Response of GET /api/providers/effective-model.
export const effectiveModelSchema = z.object({
  choice: modelChoiceSchema,
  source: effectiveModelSourceSchema,
  contextSize: z.number().int().positive(),
  warning: z.string().optional(),
});

// Query of GET /api/providers/effective-model. Without projectId the app default applies.
export const effectiveModelQuerySchema = z.object({
  projectId: z.string().min(1).optional(),
});

// Response of GET /api/providers/:id/models. Sorting is the server's job.
export const modelListSchema = z.object({
  models: z.array(z.string()),
});

// Response of GET /api/providers/app-default. `appDefault` is null when no default is set.
export const appDefaultSchema = z.object({
  appDefault: modelChoiceSchema.nullable(),
});

export type ModelChoice = z.infer<typeof modelChoiceSchema>;
export type EffectiveModelSource = z.infer<typeof effectiveModelSourceSchema>;
export type EffectiveModel = z.infer<typeof effectiveModelSchema>;
export type EffectiveModelQuery = z.infer<typeof effectiveModelQuerySchema>;
export type ModelList = z.infer<typeof modelListSchema>;
export type AppDefault = z.infer<typeof appDefaultSchema>;
