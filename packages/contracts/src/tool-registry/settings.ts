import { z } from 'zod';

// The schemaVersion of the tools section of settings.yaml.
export const TOOLS_SECTION_SCHEMA_VERSION = 1 as const;

// The tools section: only the tools whose switch the author changed appear in `enabled`.
// Unknown keys pass through, as Platform's section rule does.
export const toolsSectionSchema = z.looseObject({
  schemaVersion: z.literal(TOOLS_SECTION_SCHEMA_VERSION),
  enabled: z.record(z.string().min(1), z.boolean()),
});
export type ToolsSection = z.infer<typeof toolsSectionSchema>;
