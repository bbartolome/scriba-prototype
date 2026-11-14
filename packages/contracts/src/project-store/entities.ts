import { z } from 'zod';
import { CITATION_PATTERN, ENTITY_ID_PATTERN } from './constants.js';
import { projectPathSchema } from './files.js';

// An entity id, also used in references.
export const entityIdSchema = z.string().regex(ENTITY_ID_PATTERN);

export const entityRefSchema = entityIdSchema;

// The generic entity front matter. Unknown keys pass through, so each entity type keeps its own fields.
export const entityBaseSchema = z.looseObject({
  id: entityIdSchema.optional(),
  type: z.string().min(1),
  links: z.array(entityRefSchema).optional(),
});

// One whole in-body citation token, such as [@ch01] or [@a; @b].
export const citationSchema = z
  .string()
  .regex(new RegExp(`^${CITATION_PATTERN.source}$`));

// Query of GET .../entities/resolve: the `ids` query parameter repeats. A single id arrives as a plain string, so it is wrapped in an array.
export const entityResolveQuerySchema = z.object({
  ids: z.union([
    entityIdSchema.transform((id) => [id]),
    z.array(entityIdSchema),
  ]),
});

// Response of GET .../entities/resolve. Each id is resolved to one entity or reported as an error.
export const entityResolutionSchema = z.object({
  resolved: z.array(
    z.object({
      id: entityIdSchema,
      type: z.string().min(1),
      path: projectPathSchema,
      content: z.string(),
    }),
  ),
  errors: z.array(
    z.object({
      id: entityIdSchema,
      code: z.enum(['unknown', 'duplicate']),
      paths: z.array(projectPathSchema).optional(),
    }),
  ),
});

// Query of GET .../entities: `type` filters the list.
export const entityListQuerySchema = z.object({
  type: z.string().min(1).optional(),
});

// Response of GET .../entities. `invalid` lists the files whose front matter could not be read.
export const entityListSchema = z.object({
  entities: z.array(
    z.object({
      id: entityIdSchema,
      type: z.string().min(1),
      path: projectPathSchema,
      title: z.string().optional(),
    }),
  ),
  invalid: z.array(
    z.object({
      path: projectPathSchema,
      reason: z.string(),
    }),
  ),
});

export type EntityId = z.infer<typeof entityIdSchema>;
export type EntityRef = z.infer<typeof entityRefSchema>;
export type EntityBase = z.infer<typeof entityBaseSchema>;
export type Citation = z.infer<typeof citationSchema>;
export type EntityResolveQuery = z.infer<typeof entityResolveQuerySchema>;
export type EntityResolution = z.infer<typeof entityResolutionSchema>;
export type EntityListQuery = z.infer<typeof entityListQuerySchema>;
export type EntityList = z.infer<typeof entityListSchema>;
