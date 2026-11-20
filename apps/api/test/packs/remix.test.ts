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

// The prompt holds each text of `texts` and the banned phrase of the style profile.
function promptHolds(result: GoldenRunResult, texts: string[]): void {
  const prompt = renderedPrompt(result);
  for (const text of [...texts, 'game-changer']) {
    expect(prompt, text).toContain(text);
  }
}

it(
  'AC 3: the remix golden matches; the prompt holds the passage, its entity IDs, the banned phrase and the target shape; the output is a draft with sourcesUsed notes-a; the call without targetShape returns TOOL_ARGS_INVALID naming it',
  goldenCase({
    tool: 'remix',
    name: 'basic',
    expect: { kind: 'draft', sourcesUsed: ['notes-a'] },
    invalidWithout: 'targetShape',
    check: (result) =>
      promptHolds(result, [
        'notes-a',
        'style-a',
        'Practice that is planned in advance follows a task a teacher has chosen.',
        'Target shape: mystery_question',
      ]),
  }),
  60000,
);
