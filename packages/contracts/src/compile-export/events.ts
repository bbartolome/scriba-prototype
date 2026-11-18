import { z } from 'zod';
import { sseEnvelopeSchema } from '../platform/events.js';
import { projectIdSchema } from '../project-store/project.js';
import { exportFormatSchema } from './constants.js';
import { manuscriptRevisionSchema } from './order.js';
import { snapshotIdSchema, snapshotSummarySchema } from './snapshots.js';

// Data of manuscript-updated: the project and the new manuscript revision.
export const manuscriptUpdatedDataSchema = z.object({
  projectId: projectIdSchema,
  revision: manuscriptRevisionSchema,
});

// Data of export-finished: the project, the format and the file name of the export.
export const exportFinishedDataSchema = z.object({
  projectId: projectIdSchema,
  format: exportFormatSchema,
  fileName: z.string().min(1),
});

// Data of snapshot-created: the project and the new snapshot's summary.
export const snapshotCreatedDataSchema = z.object({
  projectId: projectIdSchema,
  snapshot: snapshotSummarySchema,
});

// Data of snapshot-restored: the project and the id of the restored snapshot.
export const snapshotRestoredDataSchema = z.object({
  projectId: projectIdSchema,
  snapshotId: snapshotIdSchema,
});

const manuscriptUpdatedMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('compile-export'),
  type: z.literal('manuscript-updated'),
  data: manuscriptUpdatedDataSchema,
});

const exportFinishedMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('compile-export'),
  type: z.literal('export-finished'),
  data: exportFinishedDataSchema,
});

const snapshotCreatedMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('compile-export'),
  type: z.literal('snapshot-created'),
  data: snapshotCreatedDataSchema,
});

const snapshotRestoredMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('compile-export'),
  type: z.literal('snapshot-restored'),
  data: snapshotRestoredDataSchema,
});

// The compile-export slice's four members of the SSE envelope.
export const compileExportEventSchema = z.discriminatedUnion('type', [
  manuscriptUpdatedMemberSchema,
  exportFinishedMemberSchema,
  snapshotCreatedMemberSchema,
  snapshotRestoredMemberSchema,
]);

export type ManuscriptUpdatedData = z.infer<typeof manuscriptUpdatedDataSchema>;
export type ExportFinishedData = z.infer<typeof exportFinishedDataSchema>;
export type SnapshotCreatedData = z.infer<typeof snapshotCreatedDataSchema>;
export type SnapshotRestoredData = z.infer<typeof snapshotRestoredDataSchema>;
export type CompileExportEvent = z.infer<typeof compileExportEventSchema>;
