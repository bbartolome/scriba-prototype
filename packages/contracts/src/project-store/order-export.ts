// The shapes of project.yaml's `order` and `export` keys. Compile & export owns them and publishes them from its subpath (CEX-01); they are defined here so that the Project store slice imports no other slice.
import { z } from 'zod';
import { fileReferenceSchema } from './files.js';

// Status and part of a manuscript file. They live on the order entries, not in front matter.
export const MANUSCRIPT_STATUSES = [
  'outline',
  'draft',
  'revised',
  'final',
] as const;
export const manuscriptStatusSchema = z.enum(MANUSCRIPT_STATUSES);

export const MANUSCRIPT_PARTS = ['front', 'body', 'back'] as const;
export const manuscriptPartSchema = z.enum(MANUSCRIPT_PARTS);

// The manuscript folder: membership is the top-level .md files in it.
export const MANUSCRIPT_FOLDER = 'drafts/';

// A manuscript path: starts with drafts/, has no empty, `.` or `..` segment, and has no backslash, NUL or leading slash.
export const MANUSCRIPT_PATH_PATTERN =
  /^drafts\/(?:(?!\.{1,2}(?:\/|$))[^/\\\0]+\/)*(?!\.{1,2}$)[^/\\\0]+$/;
export const manuscriptPathSchema = z.string().regex(MANUSCRIPT_PATH_PATTERN);

// One entry of project.yaml's `order`. Unknown keys survive, so a newer entry key is not dropped.
export const orderEntrySchema = z.looseObject({
  path: manuscriptPathSchema,
  status: manuscriptStatusSchema.optional(),
  part: manuscriptPartSchema.optional(),
});

// Bibliography mode of the export settings.
export const BIBLIOGRAPHY_MODES = ['off', 'all', 'cited'] as const;
export const bibliographyModeSchema = z.enum(BIBLIOGRAPHY_MODES);

// project.yaml's `export` key. Every key is optional and unknown keys survive. Defaults are applied at read time, never written back.
export const exportSettingsSchema = z.looseObject({
  author: z.string().optional(),
  penName: z.string().optional(),
  contact: z.string().optional(),
  subtitle: z.string().optional(),
  lang: z.string().optional(),
  rights: z.string().optional(),
  dedication: z.string().optional(),
  bibliography: bibliographyModeSchema.optional(),
  docxReferenceDoc: fileReferenceSchema.optional(),
  epubCss: fileReferenceSchema.optional(),
  typstTemplate: fileReferenceSchema.optional(),
});

export type ManuscriptStatus = z.infer<typeof manuscriptStatusSchema>;
export type ManuscriptPart = z.infer<typeof manuscriptPartSchema>;
export type ManuscriptPath = z.infer<typeof manuscriptPathSchema>;
export type OrderEntry = z.infer<typeof orderEntrySchema>;
export type BibliographyMode = z.infer<typeof bibliographyModeSchema>;
export type ExportSettings = z.infer<typeof exportSettingsSchema>;
