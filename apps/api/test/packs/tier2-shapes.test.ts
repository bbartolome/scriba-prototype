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

// AC 2 of GNP-21: one golden test per tool, as one test that awaits the three golden bodies in turn (C11, the GNP-14
// rule). The three tools ship disabled, so each case turns its own tool on in its temporary library first (the
// `enable` option of golden.kit.ts).
const namedConcept = goldenCase({
  tool: 'named_concept',
  name: 'pattern-examples',
  enable: true,
  expect: { kind: 'entity', sourcesUsed: ['person-a', 'notes-a'] },
  invalidWithout: 'pattern',
  check: (result) => {
    const prompt = renderedPrompt(result);
    expect(prompt).toContain('Practice planned in advance');
    for (const id of ['person-a', 'notes-a']) {
      expect(prompt, id).toContain(id);
    }
  },
});

const comparisonSet = goldenCase({
  tool: 'comparison_set',
  name: 'winners-cases',
  enable: true,
  expect: {
    kind: 'draft',
    sourcesUsed: ['person-a', 'notes-a', 'person-b'],
  },
  invalidWithout: 'cases',
  check: (result) => {
    const prompt = renderedPrompt(result);
    for (const id of ['person-a', 'notes-a', 'person-b']) {
      expect(prompt, id).toContain(id);
    }
    expect(prompt).toContain('hours of planned practice');
    expect(prompt).toContain('game-changer');
  },
});

const objectionHandler = goldenCase({
  tool: 'objection_handler',
  name: 'claim-objections',
  enable: true,
  expect: { kind: 'draft', sourcesUsed: ['notes-a', 'claim-a'] },
  invalidWithout: 'claimIds',
  check: (result) => {
    const prompt = renderedPrompt(result);
    for (const id of ['notes-a', 'claim-a']) {
      expect(prompt, id).toContain(id);
    }
    expect(prompt).toContain('game-changer');
  },
});

it('AC 2: the named_concept, comparison_set and objection_handler goldens match once each tool is enabled in its temporary library, each prompt holds its arguments and entity IDs, each output has its kind and sourcesUsed without the style profile, and invalid arguments return a readable Ajv error', async () => {
  await namedConcept();
  await comparisonSet();
  await objectionHandler();
}, 180000);
