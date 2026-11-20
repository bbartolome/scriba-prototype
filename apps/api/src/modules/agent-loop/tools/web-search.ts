import { z } from 'zod';
import type { ToolArgumentSchema, ToolDefinition } from './tool-types';

// The web_search tool of the research family (AGL-21). It calls the author's search endpoint, a SearXNG-compatible
// server, with GET <endpoint>?q=<query>&format=json. No key is sent. The endpoint is set in the agent settings, and
// the tool is offered only when it is set. A result is not a source: only sources/ grounds a claim (P8).

export const WEB_SEARCH_SCHEMA: ToolArgumentSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      minLength: 1,
      description: 'The words to search the web for.',
    },
  },
  required: ['query'],
  additionalProperties: false,
};

// The reply of a SearXNG-compatible server. Only the fields the tool reads are named; the rest pass through unread.
const replySchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      content: z.string().optional(),
    }),
  ),
});

const DESCRIPTION =
  "Search the web through the author's search endpoint. Returns the title, URL and snippet of each result. A result is not a source and cannot ground a claim.";

// The definition of web_search for one endpoint. The agent-tools service builds it per run, from the run's settings.
export function webSearchDefinition(endpoint: string): ToolDefinition {
  return {
    name: 'web_search',
    family: 'research',
    description: DESCRIPTION,
    schema: WEB_SEARCH_SCHEMA,
    handler: async (ctx, args) => {
      const { query } = args as { query: string };
      const url = new URL(endpoint);
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      const response = await globalThis.fetch(url, {
        signal: ctx.signal,
        headers: { accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`The search endpoint answered ${response.status}.`);
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error('The search endpoint did not answer with JSON.');
      }
      const parsed = replySchema.safeParse(body);
      if (!parsed.success) {
        throw new Error('The search reply has no results array.');
      }
      const results = parsed.data.results.map((result) => ({
        title: result.title,
        url: result.url,
        snippet: result.content ?? '',
      }));
      return {
        summary: `Found ${results.length} result(s) for "${query}".`,
        output: { query, results },
      };
    },
  };
}
