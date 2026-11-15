import { z } from 'zod';
import { fileReferenceSchema } from '../project-store/index.js';
import { portTypeSchema } from '../tool-registry/index.js';
import {
  GRAPH_ID_PATTERN,
  GRAPH_SCHEMA_VERSION,
  GRAPH_VIEWS,
  NODE_ID_PATTERN,
} from './constants.js';

// A graph id: the file stem of graphs/<id>.json.
export const graphIdSchema = z.string().regex(GRAPH_ID_PATTERN);

// A node id: no dot, so that a port id splits cleanly on its first dot.
export const nodeIdSchema = z.string().regex(NODE_ID_PATTERN);

/**
 * A port id is `<nodeId>.<key>`. The node id has no dot, and the id is split on the first dot, so the key
 * may itself contain dots. The fixed keys are `out` (input node output), `in` (output node input) and the
 * Tool registry's `output` (tool node output).
 */
export const portIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*\..+$/);

// The view of a graph file: story or recipe.
export const graphViewSchema = z.enum(GRAPH_VIEWS);

// A position on the canvas.
export const positionSchema = z.strictObject({
  x: z.number(),
  y: z.number(),
});

/**
 * A story node: an entity, a scene or a beat. `path` is project-relative to a current file (never
 * `drafts/.versions/`); entity nodes point into `entities/`, scene and beat nodes into `drafts/`, and
 * several nodes may share a file. No `path` means label-only. This schema does not check these rules;
 * the validator does.
 */
export const storyNodeSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    id: nodeIdSchema,
    kind: z.literal('entity'),
    label: z.string(),
    path: fileReferenceSchema.optional(),
    position: positionSchema,
  }),
  z.strictObject({
    id: nodeIdSchema,
    kind: z.literal('scene'),
    label: z.string(),
    path: fileReferenceSchema.optional(),
    position: positionSchema,
  }),
  z.strictObject({
    id: nodeIdSchema,
    kind: z.literal('beat'),
    label: z.string(),
    path: fileReferenceSchema.optional(),
    position: positionSchema,
  }),
]);

// A story edge joins two nodes. `relation` is free text; the vocabulary is in RELATION_VOCABULARY.
export const storyEdgeSchema = z.strictObject({
  id: z.string().min(1),
  from: nodeIdSchema,
  to: nodeIdSchema,
  relation: z.string().min(1).optional(),
});

// The params of an input node: its port type, its label and, for an entity input, its entity kind.
export const inputParamsSchema = z.strictObject({
  type: portTypeSchema,
  label: z.string(),
  entityKind: z.string().min(1).optional(),
});

// The params of an output node: a label and a path, both optional.
export const outputParamsSchema = z.strictObject({
  label: z.string().optional(),
  path: fileReferenceSchema.optional(),
});

// The params of a tool node: the non-port settings and the pinned port values, keyed as the tool spec names them.
export const toolParamsSchema = z.record(z.string(), z.unknown());

// A recipe node: an input, a tool or an output node. `tool` is required on a tool node and forbidden on the others.
export const recipeNodeSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    id: nodeIdSchema,
    kind: z.literal('input'),
    position: positionSchema,
    params: inputParamsSchema,
  }),
  z.strictObject({
    id: nodeIdSchema,
    kind: z.literal('tool'),
    position: positionSchema,
    tool: z.string().min(1),
    params: toolParamsSchema.optional(),
  }),
  z.strictObject({
    id: nodeIdSchema,
    kind: z.literal('output'),
    position: positionSchema,
    params: outputParamsSchema.optional(),
  }),
]);

// A recipe wire joins two port ids. A wire has no relation.
export const recipeWireSchema = z.strictObject({
  id: z.string().min(1),
  from: portIdSchema,
  to: portIdSchema,
});

// The shape of a story graph, without the uniqueness rule (the detail and validate requests use it).
export const storyGraphShapeSchema = z.strictObject({
  schemaVersion: z.literal(GRAPH_SCHEMA_VERSION),
  view: z.literal('story'),
  name: z.string().min(1),
  nodes: z.array(storyNodeSchema),
  edges: z.array(storyEdgeSchema),
});

// The shape of a recipe, without the uniqueness rule.
export const recipeGraphShapeSchema = z.strictObject({
  schemaVersion: z.literal(GRAPH_SCHEMA_VERSION),
  view: z.literal('recipe'),
  name: z.string().min(1),
  nodes: z.array(recipeNodeSchema),
  edges: z.array(recipeWireSchema),
});

// A repeated id in a list is an issue at `<list>/<index>/id`.
function refineUniqueIds(
  items: { id: string }[],
  list: 'nodes' | 'edges',
  ctx: z.RefinementCtx,
): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.id)) {
      ctx.addIssue({
        code: 'custom',
        message: `Duplicate ${list === 'nodes' ? 'node' : 'edge'} id "${item.id}".`,
        path: [list, index, 'id'],
      });
    }
    seen.add(item.id);
  });
}

// A story graph whose node ids and edge ids are unique (the save rule).
export const storyGraphSchema = storyGraphShapeSchema.superRefine(
  (graph, ctx) => {
    refineUniqueIds(graph.nodes, 'nodes', ctx);
    refineUniqueIds(graph.edges, 'edges', ctx);
  },
);

// A recipe whose node ids and wire ids are unique (the save rule).
export const recipeGraphSchema = recipeGraphShapeSchema.superRefine(
  (graph, ctx) => {
    refineUniqueIds(graph.nodes, 'nodes', ctx);
    refineUniqueIds(graph.edges, 'edges', ctx);
  },
);

/**
 * A graph file, by its shape only (no uniqueness rule). The detail (GET) and the validate request use it, so
 * that a duplicate id is reported as a `duplicate-id` issue (GRR-03) instead of refused.
 */
export const graphFileShapeSchema = z.discriminatedUnion('view', [
  storyGraphShapeSchema,
  recipeGraphShapeSchema,
]);

/**
 * A graph file with unique node and edge ids. Save, the list's validity and every other consumer use it;
 * a file that fails it is `GRAPH_SCHEMA_INVALID`.
 */
export const graphFileSchema = z.discriminatedUnion('view', [
  storyGraphSchema,
  recipeGraphSchema,
]);

export type GraphView = z.infer<typeof graphViewSchema>;
export type Position = z.infer<typeof positionSchema>;
export type StoryNode = z.infer<typeof storyNodeSchema>;
export type StoryEdge = z.infer<typeof storyEdgeSchema>;
export type RecipeNode = z.infer<typeof recipeNodeSchema>;
export type RecipeWire = z.infer<typeof recipeWireSchema>;
export type InputParams = z.infer<typeof inputParamsSchema>;
export type OutputParams = z.infer<typeof outputParamsSchema>;
export type StoryGraph = z.infer<typeof storyGraphSchema>;
export type RecipeGraph = z.infer<typeof recipeGraphSchema>;
export type GraphFile = z.infer<typeof graphFileSchema>;
