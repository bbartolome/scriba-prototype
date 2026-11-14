import { z } from 'zod';
import { projectPathSchema } from './files.js';

// One saved version of a draft: the content it had before a change replaced it.
export const draftVersionSchema = z.object({
  id: z.string().min(1),
  createdAt: z.iso.datetime(),
  size: z.number().int().min(0),
});

// Response of GET .../versions.
export const draftVersionListSchema = z.object({
  draftPath: projectPathSchema,
  versions: z.array(draftVersionSchema),
});

// Query of GET .../versions/read.
export const draftVersionReadQuerySchema = z.object({
  draftPath: projectPathSchema,
  id: z.string().min(1),
});

// Response of GET .../versions/read.
export const draftVersionReadSchema = z.object({
  draftPath: projectPathSchema,
  id: z.string().min(1),
  content: z.string(),
});

// Request of POST .../versions/restore.
export const draftRestoreSchema = z.object({
  draftPath: projectPathSchema,
  id: z.string().min(1),
});

export type DraftVersion = z.infer<typeof draftVersionSchema>;
export type DraftVersionList = z.infer<typeof draftVersionListSchema>;
export type DraftVersionReadQuery = z.infer<typeof draftVersionReadQuerySchema>;
export type DraftVersionRead = z.infer<typeof draftVersionReadSchema>;
export type DraftRestore = z.infer<typeof draftRestoreSchema>;
