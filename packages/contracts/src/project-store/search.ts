import { z } from 'zod';
import { projectPathSchema } from './files.js';

// Request of POST .../search. `scope` limits the search to sources, entities or both.
export const searchRequestSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).optional(),
  scope: z.array(z.enum(['sources', 'entities'])).optional(),
});

// One ranked passage. A higher score is a better match.
export const searchPassageSchema = z.object({
  path: projectPathSchema,
  offset: z.number().int().min(0),
  snippet: z.string(),
  score: z.number(),
});

// Response of POST .../search: the passages, best first.
export const searchResultSchema = z.array(searchPassageSchema);

export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type SearchPassage = z.infer<typeof searchPassageSchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;
