import { z } from 'zod';
import {
  DEFAULT_GENRE_PACK,
  PROJECT_FOLDER_NAME_PATTERN,
} from './constants.js';
import { entityRefSchema } from './entities.js';

// A project id is the folder name under the library. It is not a slug: discovery lists every
// subfolder, including importable folders with no project.yaml.
export const projectIdSchema = z.string().min(1);

// The per-project model override. The bounds match the providers' ModelChoice; this slice does not import providers.
export const projectModelSchema = z.object({
  providerId: z.string().min(1),
  model: z.string(),
});

// project.yaml. Unknown keys pass through, so newer optional fields survive an older app.
// `export` and the entries of `order` stay passthrough until Compile & export narrows them.
export const projectYamlSchema = z.looseObject({
  schemaVersion: z.number().int().min(1),
  title: z.string().min(1),
  genrePack: z.string().min(1),
  styleProfile: entityRefSchema.optional(),
  export: z.looseObject({}).optional(),
  model: projectModelSchema.optional(),
  order: z.array(z.looseObject({})).optional(),
});

export const projectStatusSchema = z.enum([
  'ok',
  'invalid',
  'too-new',
  'importable',
]);

// One entry of the project list. `error` is a one-line message; the full schema issues travel in the
// PROJECT_INVALID error details.
export const projectSummarySchema = z.object({
  id: projectIdSchema,
  title: z.string().optional(),
  genrePack: z.string().optional(),
  active: z.boolean(),
  status: projectStatusSchema,
  error: z.string().optional(),
});

export const projectListSchema = z.object({
  projects: z.array(projectSummarySchema),
});

// Request of POST .../projects/new. The folder name is derived from the title when it is omitted.
export const newProjectRequestSchema = z.object({
  folderName: z.string().regex(PROJECT_FOLDER_NAME_PATTERN).optional(),
  title: z.string().min(1),
  genrePack: z.string().min(1).default(DEFAULT_GENRE_PACK),
});

// Request of POST .../projects/import.
export const importRequestSchema = z.object({
  projectId: projectIdSchema,
});

// Request of POST .../projects/start-from-sample.
export const startFromSampleRequestSchema = z.object({
  sampleId: z.string().min(1),
  folderName: z.string().regex(PROJECT_FOLDER_NAME_PATTERN),
  title: z.string().min(1),
});

// Request of POST /api/project-store/active.
export const activateRequestSchema = z.object({
  projectId: projectIdSchema,
});

// Response of GET /api/project-store/active. `active` is null when no project is active.
export const activeProjectSchema = z.object({
  active: projectIdSchema.nullable(),
});

// One sample project shipped under examples/.
export const sampleSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string(),
});

export const sampleListSchema = z.array(sampleSchema);

export type ProjectId = z.infer<typeof projectIdSchema>;
export type ProjectModel = z.infer<typeof projectModelSchema>;
export type ProjectYaml = z.infer<typeof projectYamlSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
export type ProjectList = z.infer<typeof projectListSchema>;
export type NewProjectRequest = z.infer<typeof newProjectRequestSchema>;
export type ImportRequest = z.infer<typeof importRequestSchema>;
export type StartFromSampleRequest = z.infer<
  typeof startFromSampleRequestSchema
>;
export type ActivateRequest = z.infer<typeof activateRequestSchema>;
export type ActiveProject = z.infer<typeof activeProjectSchema>;
export type Sample = z.infer<typeof sampleSchema>;
export type SampleList = z.infer<typeof sampleListSchema>;
