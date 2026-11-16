import { it, expect } from 'vitest';
import { z } from 'zod';
import { graphFileSchema } from '@bbartolome/scriba-contracts/graph-runner';
import { goldenCase, runGoldenCase, type GoldenRunResult } from './golden.kit';

const STORY_EXPECT = {
  kind: 'graph' as const,
  sourcesUsed: ['keeper', 'assistant'],
};
const RECIPE_EXPECT = { kind: 'graph' as const, sourcesUsed: ['keeper'] };

const CATALOGUE_HEADING = 'Tools for a recipe:';
const CATALOGUE_LINE =
  '- propose_graph: Sketch a story graph or a recipe from a plain-language intent. Output: graph. Inputs: intent (text, single, required); entityIds (entity, list, optional).';

const requestSchema = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
});

// The user message of the recorded request: the prompt the tool rendered.
function userMessageOf(result: GoldenRunResult): string {
  const request = requestSchema.parse(result.request);
  const user = request.messages.find((message) => message.role === 'user');
  if (user === undefined) {
    throw new Error('the recorded request has no user message');
  }
  return user.content;
}

it('AC 1: propose_graph validates, and a call without view returns an Ajv error naming view', async () => {
  const result = await runGoldenCase({
    tool: 'propose_graph',
    name: 'story',
    expect: STORY_EXPECT,
    invalidWithout: 'view',
    update: false,
  });
  expect(result.kind).toBe('graph');
  expect(result.invalid.status).toBe(422);
  expect(result.invalid.code).toBe('TOOL_ARGS_INVALID');
  expect(result.invalid.message).toContain('view');
  expect(result.modelCalls).toBe(1);
}, 60000);

it('AC 2: the story and recipe goldens match, each output parses as a graph file, and the recipe golden holds the tool catalogue', async () => {
  await goldenCase({
    tool: 'propose_graph',
    name: 'story',
    expect: STORY_EXPECT,
    invalidWithout: 'view',
    check: (result) => {
      const graph = graphFileSchema.parse(
        JSON.parse(result.content) as unknown,
      );
      expect(graph.view).toBe('story');
      expect(userMessageOf(result)).not.toContain(CATALOGUE_HEADING);
    },
  })();

  await goldenCase({
    tool: 'propose_graph',
    name: 'recipe',
    expect: RECIPE_EXPECT,
    invalidWithout: 'view',
    check: (result) => {
      const graph = graphFileSchema.parse(
        JSON.parse(result.content) as unknown,
      );
      expect(graph.view).toBe('recipe');
      const prompt = userMessageOf(result);
      expect(prompt).toContain(CATALOGUE_HEADING);
      expect(prompt).toContain(CATALOGUE_LINE);
    },
  })();
}, 120000);
