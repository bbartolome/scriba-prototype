import { z } from 'zod';
import { orderEntrySchema } from '../project-store/order-export.js';
import { SNAPSHOT_SCHEMA_VERSION } from './constants.js';

// A snapshot id, as the snapshot store names it.
export const snapshotIdSchema = z.string().min(1);

// Word counts of a snapshot: the body alone, and the whole manuscript.
export const snapshotWordsSchema = z.object({
  body: z.number().int().min(0),
  total: z.number().int().min(0),
});

// One snapshot in the list. `words` is null, and `unreadable` true, when the manifest cannot be read.
export const snapshotSummarySchema = z.object({
  id: snapshotIdSchema,
  label: z.string(),
  createdAt: z.iso.datetime(),
  fileCount: z.number().int().min(0),
  words: snapshotWordsSchema.nullable(),
  unreadable: z.boolean().optional(),
});

// Response of GET the snapshots route.
export const snapshotListSchema = z.object({
  snapshots: z.array(snapshotSummarySchema),
});

// Body of POST the snapshots route.
export const snapshotCreateRequestSchema = z.object({
  label: z.string().min(1),
});

// Body of POST the restore route.
export const snapshotRestoreRequestSchema = z.object({
  id: snapshotIdSchema,
});

// The snapshot.yaml manifest. Unknown keys survive.
export const snapshotManifestSchema = z.looseObject({
  schemaVersion: z.literal(SNAPSHOT_SCHEMA_VERSION),
  label: z.string(),
  createdAt: z.iso.datetime(),
  appVersion: z.string().min(1),
  order: z.array(orderEntrySchema),
  words: snapshotWordsSchema,
});

export type SnapshotId = z.infer<typeof snapshotIdSchema>;
export type SnapshotWords = z.infer<typeof snapshotWordsSchema>;
export type SnapshotSummary = z.infer<typeof snapshotSummarySchema>;
export type SnapshotList = z.infer<typeof snapshotListSchema>;
export type SnapshotCreateRequest = z.infer<typeof snapshotCreateRequestSchema>;
export type SnapshotRestoreRequest = z.infer<
  typeof snapshotRestoreRequestSchema
>;
export type SnapshotManifest = z.infer<typeof snapshotManifestSchema>;
