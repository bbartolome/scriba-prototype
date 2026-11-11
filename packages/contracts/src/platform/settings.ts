import { z } from 'zod';

// settings.yaml file envelope. Platform owns the envelope. Each section's contents belong to its module.
export const SETTINGS_SCHEMA_VERSION = 1 as const;

// Fixed section keys. A new section needs a new key here.
export const SETTINGS_SECTION_KEYS = [
  'projects',
  'providers',
  'tools',
  'agent',
  'setupAuth',
] as const;

// Each section carries its own integer schemaVersion. Unknown keys inside a section pass through,
// because the owning module validates its own contents.
const settingsSectionSchema = z.looseObject({
  schemaVersion: z.number().int(),
});

// Top level: exactly these keys, no others.
export const settingsEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  projects: settingsSectionSchema,
  providers: settingsSectionSchema,
  tools: settingsSectionSchema,
  agent: settingsSectionSchema,
  setupAuth: settingsSectionSchema,
});

export type SettingsEnvelope = z.infer<typeof settingsEnvelopeSchema>;
