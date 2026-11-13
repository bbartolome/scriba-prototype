import { z } from 'zod';
import { providerConfigSchema } from './config.js';
import { modelChoiceSchema } from './model.js';

// Schema version of the providers section in settings.yaml. The section's default object belongs to the module.
export const PROVIDERS_SECTION_SCHEMA_VERSION = 1 as const;

// The providers section of settings.yaml.
export const providersSectionSchema = z.object({
  schemaVersion: z.literal(PROVIDERS_SECTION_SCHEMA_VERSION),
  list: z.array(providerConfigSchema),
  appDefault: modelChoiceSchema.nullable(),
});

export type ProvidersSection = z.infer<typeof providersSectionSchema>;
