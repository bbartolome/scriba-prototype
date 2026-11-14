import { z } from 'zod';
import { sseEnvelopeSchema } from '../platform/events.js';
import { pendingChangeSchema } from './pending.js';
import { projectIdSchema } from './project.js';

// Data of the three pending events: the project and the pending change as it now stands.
export const pendingEventDataSchema = z.object({
  projectId: projectIdSchema,
  pendingChange: pendingChangeSchema,
});

// Data of files-changed: the project-relative paths that changed on disk.
export const filesChangedDataSchema = z.object({
  projectId: projectIdSchema,
  paths: z.array(z.string().min(1)),
});

// Data of project-switched. `from` is null for the first activation, when no project was active before.
export const projectSwitchedDataSchema = z.object({
  from: projectIdSchema.nullable(),
  to: projectIdSchema,
});

const pendingCreatedMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('project-store'),
  type: z.literal('pending-created'),
  data: pendingEventDataSchema,
});

const pendingUpdatedMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('project-store'),
  type: z.literal('pending-updated'),
  data: pendingEventDataSchema,
});

const pendingResolvedMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('project-store'),
  type: z.literal('pending-resolved'),
  data: pendingEventDataSchema,
});

const filesChangedMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('project-store'),
  type: z.literal('files-changed'),
  data: filesChangedDataSchema,
});

const projectSwitchedMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('project-store'),
  type: z.literal('project-switched'),
  data: projectSwitchedDataSchema,
});

// The project store's five members of the SSE envelope.
export const projectStoreEventSchema = z.discriminatedUnion('type', [
  pendingCreatedMemberSchema,
  pendingUpdatedMemberSchema,
  pendingResolvedMemberSchema,
  filesChangedMemberSchema,
  projectSwitchedMemberSchema,
]);

export type ProjectStoreEvent = z.infer<typeof projectStoreEventSchema>;
export type PendingEventData = z.infer<typeof pendingEventDataSchema>;
export type FilesChangedData = z.infer<typeof filesChangedDataSchema>;
export type ProjectSwitchedData = z.infer<typeof projectSwitchedDataSchema>;
