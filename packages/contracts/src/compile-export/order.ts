import { z } from 'zod';
import {
  contentHashSchema,
  projectPathSchema,
} from '../project-store/files.js';
import {
  manuscriptPathSchema,
  orderEntrySchema,
} from '../project-store/order-export.js';
import type {
  ManuscriptPath,
  OrderEntry,
} from '../project-store/order-export.js';
import {
  manuscriptPartSchema,
  manuscriptStatusSchema,
  orderSourceSchema,
} from './constants.js';

export { manuscriptPathSchema, orderEntrySchema };
export type { ManuscriptPath, OrderEntry };

// The manuscript revision: the hash that CEX-02 computes over the order field and the file set.
export const manuscriptRevisionSchema = contentHashSchema;

// One manuscript file in the view, with its effective part, status and words.
export const manuscriptEntrySchema = z.object({
  path: manuscriptPathSchema,
  part: manuscriptPartSchema,
  status: manuscriptStatusSchema,
  words: z.number().int().min(0),
  graphOrdered: z.boolean(),
  inOrderField: z.boolean(),
});

// Word totals: the body alone, and the whole manuscript.
export const manuscriptTotalsSchema = z.object({
  body: z.number().int().min(0),
  manuscript: z.number().int().min(0),
});

// A warning about the order. `kind` is the discriminator.
export const manuscriptWarningSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('graphCycle'),
    files: z.array(projectPathSchema),
  }),
  z.object({ kind: z.literal('invalidGraph'), path: projectPathSchema }),
  z.object({ kind: z.literal('staleEntry'), path: projectPathSchema }),
]);

// The manuscript view, returned by GET the manuscript route.
export const manuscriptViewSchema = z.object({
  entries: z.array(manuscriptEntrySchema),
  totals: manuscriptTotalsSchema,
  orderSource: orderSourceSchema,
  warnings: z.array(manuscriptWarningSchema),
  revision: manuscriptRevisionSchema,
});

// Request of a full reorder: the three lists of paths, one per part.
export const manuscriptReorderRequestSchema = z.object({
  revision: manuscriptRevisionSchema,
  front: z.array(manuscriptPathSchema),
  body: z.array(manuscriptPathSchema),
  back: z.array(manuscriptPathSchema),
});

// Request of a status change of one entry.
export const manuscriptStatusRequestSchema = z.object({
  revision: manuscriptRevisionSchema,
  path: manuscriptPathSchema,
  status: manuscriptStatusSchema,
});

// Request of a part change of one entry.
export const manuscriptPartRequestSchema = z.object({
  revision: manuscriptRevisionSchema,
  path: manuscriptPathSchema,
  part: manuscriptPartSchema,
});

export type ManuscriptRevision = z.infer<typeof manuscriptRevisionSchema>;
export type ManuscriptEntry = z.infer<typeof manuscriptEntrySchema>;
export type ManuscriptTotals = z.infer<typeof manuscriptTotalsSchema>;
export type ManuscriptWarning = z.infer<typeof manuscriptWarningSchema>;
export type ManuscriptView = z.infer<typeof manuscriptViewSchema>;
export type ManuscriptReorderRequest = z.infer<
  typeof manuscriptReorderRequestSchema
>;
export type ManuscriptStatusRequest = z.infer<
  typeof manuscriptStatusRequestSchema
>;
export type ManuscriptPartRequest = z.infer<typeof manuscriptPartRequestSchema>;
