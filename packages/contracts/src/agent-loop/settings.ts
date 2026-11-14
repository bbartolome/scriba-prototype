import { z } from 'zod';
import { AGENT_DEFAULT_STEP_CAP } from './constants.js';

// Schema version of the agent section in settings.yaml. The section's default object belongs to this module.
export const AGENT_SECTION_SCHEMA_VERSION = 1 as const;

// The agent section's defaults: research off, step cap 12.
export const AGENT_SETTINGS_DEFAULTS = {
  schemaVersion: AGENT_SECTION_SCHEMA_VERSION,
  stepCap: AGENT_DEFAULT_STEP_CAP,
  research: { enabled: false },
};

// The agent section of settings.yaml. Unknown keys pass through, at this level and inside research.
// searchEndpoint is an http(s) URL; the protocol check accepts a local address such as http://localhost:8888.
export const agentSettingsSchema = z.looseObject({
  schemaVersion: z.literal(AGENT_SECTION_SCHEMA_VERSION),
  stepCap: z.number().int().min(1),
  research: z.looseObject({
    enabled: z.boolean(),
    searchEndpoint: z.url({ protocol: /^https?$/ }).optional(),
  }),
});

// Body of a settings update: any subset of the fields, and no schemaVersion. Unknown keys are stripped.
export const agentSettingsUpdateSchema = z.object({
  stepCap: z.number().int().min(1).optional(),
  research: z
    .object({
      enabled: z.boolean().optional(),
      searchEndpoint: z.url({ protocol: /^https?$/ }).optional(),
    })
    .optional(),
});

export type AgentSettings = z.infer<typeof agentSettingsSchema>;
export type AgentSettingsUpdate = z.infer<typeof agentSettingsUpdateSchema>;
