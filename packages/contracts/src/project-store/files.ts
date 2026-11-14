import { z } from 'zod';
import { CONTENT_HASH_PATTERN } from './constants.js';

// A project-relative POSIX path. The path rules (no absolute path, no `..`, no backslash, no NUL,
// no symlink escape) belong to the module's single path function, not to this contract.
export const projectPathSchema = z.string();

// A file reference is a project-relative path string. Compile & export and the graph runner import it under this name.
export const fileReferenceSchema = z.string();

// A content hash: sha256: followed by 64 lowercase hex digits.
export const contentHashSchema = z.string().regex(CONTENT_HASH_PATTERN);

// One entry of a directory listing. `mtime` is an ISO 8601 UTC timestamp with Z.
export const fileEntrySchema = z.object({
  path: projectPathSchema,
  kind: z.enum(['file', 'dir']),
  size: z.number().int().min(0),
  mtime: z.iso.datetime(),
});

// Query of GET .../files. `recursive` arrives as a string, so it is parsed with stringbool.
export const fileListQuerySchema = z.object({
  path: projectPathSchema,
  recursive: z.stringbool().optional(),
});

export const fileListSchema = z.object({
  entries: z.array(fileEntrySchema),
});

// Response of GET .../file. `upgraded` marks an in-memory view that a lazy migration upgraded; a normal read has no marker.
export const fileReadSchema = z.object({
  path: projectPathSchema,
  content: z.string(),
  hash: contentHashSchema,
  mtime: z.iso.datetime(),
  upgraded: z.boolean().optional(),
});

// Request of POST .../file/write. `baseHash` is the hash the author last read; the store checks it.
export const fileWriteSchema = z.object({
  path: projectPathSchema,
  content: z.string(),
  baseHash: contentHashSchema.optional(),
});

// Response of a write or an edit: the new hash, for the next save's `baseHash`.
export const fileWriteResultSchema = z.object({
  path: projectPathSchema,
  hash: contentHashSchema,
  mtime: z.iso.datetime(),
});

// Request of POST .../file/edit: replace the text `old` with `new`.
export const fileEditSchema = z.object({
  path: projectPathSchema,
  old: z.string(),
  new: z.string(),
});

// Request of POST .../file/delete.
export const fileDeleteSchema = z.object({
  path: projectPathSchema,
  baseHash: contentHashSchema.optional(),
});

// Request of POST .../file/move.
export const fileMoveSchema = z.object({
  from: projectPathSchema,
  to: projectPathSchema,
});

export type ProjectPath = z.infer<typeof projectPathSchema>;
export type FileReference = z.infer<typeof fileReferenceSchema>;
export type ContentHash = z.infer<typeof contentHashSchema>;
export type FileEntry = z.infer<typeof fileEntrySchema>;
export type FileListQuery = z.infer<typeof fileListQuerySchema>;
export type FileList = z.infer<typeof fileListSchema>;
export type FileRead = z.infer<typeof fileReadSchema>;
export type FileWrite = z.infer<typeof fileWriteSchema>;
export type FileWriteResult = z.infer<typeof fileWriteResultSchema>;
export type FileEdit = z.infer<typeof fileEditSchema>;
export type FileDelete = z.infer<typeof fileDeleteSchema>;
export type FileMove = z.infer<typeof fileMoveSchema>;
