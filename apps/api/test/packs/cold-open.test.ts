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

it(
  'AC 2: the cold_open golden matches, its prompt holds every entity with its ID and the citation and placeholder rules, and sourcesUsed leaves out the style profile',
  goldenCase({
    tool: 'cold_open',
    name: 'person-moment',
    expect: {
      kind: 'draft',
      sourcesUsed: ['notes-a', 'notes-b', 'researcher-a'],
    },
    invalidWithout: 'coreIdea',
    check: (result) => {
      const prompt = renderedPrompt(result);
      for (const id of ['researcher-a', 'notes-a', 'notes-b', 'style-a']) {
        expect(prompt, id).toContain(id);
      }
      expect(prompt).toContain('[@');
      expect(prompt).toContain('TK (');
      expect(prompt).toContain('Length: 800 words');
      expect(prompt).toContain('game-changer');
    },
  }),
  60000,
);
