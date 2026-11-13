import { z } from 'zod';
import { setupStepsSchema } from './status.js';

// Schema version of the setupAuth section in settings.yaml. The section's default object belongs to the module.
export const SETUP_AUTH_SECTION_SCHEMA_VERSION = 1 as const;

// Optional wizard and settings-page values. The POST body of preferences uses the same schema.
// Theme is device-local and is not here.
export const preferencesSchema = z.object({
  authorName: z.string().optional(),
  defaultGenrePack: z.string().optional(),
});

export const allowlistSchema = z.object({
  enabled: z.boolean(),
  logins: z.array(z.string()),
});

// Body of an allowlist update: any subset of the two fields.
export const allowlistUpdateSchema = allowlistSchema.partial();

// The setupAuth section of settings.yaml.
export const setupAuthSectionSchema = z.object({
  schemaVersion: z.literal(SETUP_AUTH_SECTION_SCHEMA_VERSION),
  steps: setupStepsSchema,
  complete: z.boolean(),
  preferences: preferencesSchema,
  allowlist: allowlistSchema,
});

export type Preferences = z.infer<typeof preferencesSchema>;
export type Allowlist = z.infer<typeof allowlistSchema>;
export type SetupAuthSection = z.infer<typeof setupAuthSectionSchema>;
