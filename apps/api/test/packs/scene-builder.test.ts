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

const lampRoom = goldenCase({
  tool: 'scene_builder',
  name: 'lamp-room',
  expect: {
    kind: 'draft',
    sourcesUsed: ['ivo-renn', 'skerry-light', 'mara-quill'],
  },
  invalidWithout: 'pov',
  check: (result) => {
    const prompt = renderedPrompt(result);
    for (const id of [
      'mara-quill',
      'ivo-renn',
      'skerry-light',
      'plain-spoken',
      '[@id]',
      'TK',
    ]) {
      expect(prompt, id).toContain(id);
    }
  },
});

it('AC 2: the scene_builder golden case matches, its prompt holds each input entity with its ID and the citation and placeholder instructions, its output is a draft with the expected sourcesUsed, and invalid arguments return an Ajv error that names pov', async () => {
  await lampRoom();
}, 120000);
