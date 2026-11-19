import { expect, it } from 'vitest';
import { goldenCase, type GoldenRunResult } from './golden.kit';

// The rendered prompt: the content of the user message in the request the mock recorded.
function renderedPrompt(result: GoldenRunResult): string {
  const user = result.request.messages.find(
    (message): message is { role: 'user'; content: string } =>
      typeof message === 'object' &&
      message !== null &&
      'role' in message &&
      message.role === 'user' &&
      'content' in message &&
      typeof message.content === 'string',
  );
  if (user === undefined) {
    throw new Error(
      'the recorded request has no user message with a string content',
    );
  }
  return user.content;
}

const character = goldenCase({
  tool: 'character_builder',
  name: 'keeper-seed',
  expect: {
    kind: 'entity',
    sourcesUsed: ['tomas-reyes', 'skerry-light'],
  },
  invalidWithout: 'seed',
  check: (result) => {
    const prompt = renderedPrompt(result);
    for (const id of ['tomas-reyes', 'skerry-light']) {
      expect(prompt, id).toContain(id);
    }
  },
});

const world = goldenCase({
  tool: 'world_builder',
  name: 'skerry-rules',
  expect: {
    kind: 'entity',
    sourcesUsed: ['skerry-light', 'spring-tide-only'],
  },
  invalidWithout: 'ruleIds',
  check: (result) => {
    const prompt = renderedPrompt(result);
    for (const id of ['skerry-light', 'spring-tide-only', 'Contradictions']) {
      expect(prompt, id).toContain(id);
    }
  },
});

it('AC 2: the character_builder and world_builder golden cases match, their prompts hold each entity with its ID, each output is an entity with the expected sourcesUsed, and the world_builder prompt holds the Contradictions instruction', async () => {
  await character();
  await world();
}, 120000);
