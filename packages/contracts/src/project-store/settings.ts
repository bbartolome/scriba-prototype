import { z } from 'zod';
import { projectIdSchema } from './project.js';

// Schema version of the projects section in settings.yaml. The section's default object belongs to the module.
export const PROJECTS_SECTION_SCHEMA_VERSION = 1 as const;

// The projects section of settings.yaml. Unknown keys pass through, as every settings section does.
export const projectsSectionSchema = z.looseObject({
  schemaVersion: z.literal(PROJECTS_SECTION_SCHEMA_VERSION),
  active: projectIdSchema.nullable(),
});

export type ProjectsSection = z.infer<typeof projectsSectionSchema>;
