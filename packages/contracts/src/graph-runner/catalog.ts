import { z } from 'zod';
import {
  graphFileShapeSchema,
  graphIdSchema,
  graphViewSchema,
} from './graph.js';
import { validationIssueSchema } from './issues.js';

// One row of the graph list. A file that cannot be read or fails the schema is still listed, with
// `valid` false, `view` null, `nodeCount` null and `name` set to the file stem.
export const graphSummarySchema = z.object({
  id: graphIdSchema,
  name: z.string(),
  view: graphViewSchema.nullable(),
  nodeCount: z.number().int().min(0).nullable(),
  mtime: z.iso.datetime(),
  valid: z.boolean(),
});
export type GraphSummary = z.infer<typeof graphSummarySchema>;

// The response of the graph list.
export const graphListSchema = z.strictObject({
  graphs: graphSummarySchema.array(),
});
export type GraphList = z.infer<typeof graphListSchema>;

// The response of a graph read: the graph and its validation issues.
export const graphDetailSchema = z.strictObject({
  graph: graphFileShapeSchema,
  issues: validationIssueSchema.array(),
});
export type GraphDetail = z.infer<typeof graphDetailSchema>;

// The request to create a graph: its name and its view.
export const graphCreateSchema = z.strictObject({
  name: z.string().min(1),
  view: graphViewSchema,
});
export type GraphCreate = z.infer<typeof graphCreateSchema>;

// The request to rename a graph: its name, or its id (the file stem). Exactly one of the two.
export const graphRenameSchema = z.union([
  z.strictObject({ name: z.string().min(1) }),
  z.strictObject({ newId: graphIdSchema }),
]);
export type GraphRename = z.infer<typeof graphRenameSchema>;

// The response of a create or a rename: the id of the graph.
export const graphIdResultSchema = z.strictObject({
  id: graphIdSchema,
});
export type GraphIdResult = z.infer<typeof graphIdResultSchema>;
