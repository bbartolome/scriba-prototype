import { expect, it } from 'vitest';
import { goldenCase, type GoldenRunResult } from './golden.kit';

// The rendered prompt: the content of the user message in the request the mock recorded.
// (Copied unchanged from cold-open.test.ts.)
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

it(
  'AC 2: the numbers_to_people golden matches, its prompt holds every entity with its ID and the citation and placeholder rules, sourcesUsed leaves out the style profile, and invalid arguments return a readable Ajv error',
  goldenCase({
    tool: 'numbers_to_people',
    name: 'statistic-person',
    expect: {
      kind: 'draft',
      sourcesUsed: ['notes-a', 'claim-a', 'person-a'],
    },
    invalidWithout: 'statistic',
    check: (result) => {
      const prompt = renderedPrompt(result);
      for (const id of ['person-a', 'notes-a', 'claim-a', 'style-a']) {
        expect(prompt, id).toContain(id);
      }
      expect(prompt).toContain('[@');
      expect(prompt).toContain('TK (');
      expect(prompt).toContain(
        'Statistic: Seven of the twelve people in the study practised with a teacher setting the task.',
      );
      expect(prompt).toContain('Length: 800 words');
      expect(prompt).toContain('game-changer');
    },
  }),
  60000,
);
