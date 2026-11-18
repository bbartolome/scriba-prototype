import { z } from 'zod';
import { fileReferenceSchema } from '../project-store/files.js';
import { exportSettingsSchema } from '../project-store/order-export.js';
import type { ExportSettings } from '../project-store/order-export.js';
import { templateFormatSchema } from './constants.js';
import { manuscriptRevisionSchema } from './order.js';

export { exportSettingsSchema };
export type { ExportSettings };

// Response of GET the settings route. `revision` is the settings revision, separate from the manuscript view's revision.
export const exportSettingsViewSchema = z.object({
  revision: manuscriptRevisionSchema,
  settings: exportSettingsSchema,
});

// Body of POST the settings route: the revision the GET returned, and the settings to write.
export const exportSettingsWriteSchema = z.object({
  revision: manuscriptRevisionSchema,
  settings: exportSettingsSchema,
});

// Body of POST the copy-default route. `md` has no template, so it is not a template format.
export const copyDefaultRequestSchema = z.object({
  format: templateFormatSchema,
  path: fileReferenceSchema,
});

export type ExportSettingsView = z.infer<typeof exportSettingsViewSchema>;
export type ExportSettingsWrite = z.infer<typeof exportSettingsWriteSchema>;
export type CopyDefaultRequest = z.infer<typeof copyDefaultRequestSchema>;
