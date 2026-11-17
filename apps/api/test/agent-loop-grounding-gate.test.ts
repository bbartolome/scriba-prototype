import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  EXTRACT_MARKER,
  JUDGE_MARKER,
} from '../src/modules/agent-loop/grounding-prompts';
import {
  AGENT_GROUNDING_ROUTE,
  GROUNDING_ARTEFACT_PATH_PREFIX,
  GROUNDING_ARTEFACT_PATH_SUFFIX,
  agentStartResponseSchema,
  groundingResultSchema,
  type AgentLoopEvent,
  type GroundingResult,
} from '@bbartolome/scriba-contracts/agent-loop';
import {
  observe,
  openHarness,
  post,
  readUntilEnded,
  requestsOf,
  type ChatBody,
  type Harness,
} from './agent-loop-transcript.kit';
import type { ProjectsLibrary } from './project-store-projects.kit';

// The AGL-20 gate tests, plan `plans/AGL-20.md` sections 4.1 (criterion 1) and 4.2 (criterion 3). They call the
// production route POST /api/agent-loop/grounding on the composed app, with the mock model scripted. The helpers are
// copied from agent-loop-grounding-wiring.test.ts (plan D9); nothing is imported from another test file.

const DRAFT = 'drafts/ch01.md';

// The mock steps. A grounding request carries a marker in its last message, so these steps are listed first.
function extractStep(claims: unknown[]): unknown {
  return {
    match: { endpoint: 'chat', lastMessageContent: EXTRACT_MARKER },
    reply: { kind: 'stream', deltas: [JSON.stringify({ claims })] },
  };
}

function judgeStep(verdicts: unknown[]): unknown {
  return {
    match: { endpoint: 'chat', lastMessageContent: JUDGE_MARKER },
    reply: { kind: 'stream', deltas: [JSON.stringify({ verdicts })] },
  };
}

// The grounding result of the run's grounding-result event, parsed with the contract (the event adds runId and seq).
function resultOf(events: AgentLoopEvent[]): GroundingResult {
  const found = events.find((event) => event.type === 'grounding-result');
  if (found === undefined) throw new Error('No grounding-result event.');
  return groundingResultSchema.parse(found.data);
}

function artefactOf(h: Harness, targetPath: string): GroundingResult {
  const path = join(
    h.fixture.library,
    'book',
    `${GROUNDING_ARTEFACT_PATH_PREFIX}${targetPath}${GROUNDING_ARTEFACT_PATH_SUFFIX}`,
  );
  return groundingResultSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

// The text of the last message of a chat request, when it is a string.
function lastTextOf(body: ChatBody): string {
  const last = body.messages[body.messages.length - 1];
  return typeof last?.content === 'string' ? last.content : '';
}

// C1 (criterion 1, unit line 17): the claim shares no word with any file in sources/, so no passage is retrieved and
// the claim is unsupported without a model call.
const C1_SOURCE = 'Harbour traffic doubled in 1900.\n';
const C1_DRAFT =
  'Harbour traffic doubled in 1900. Zarquon quasars rose 97 percent.\n';
const C1_CLAIMS = [
  { text: 'Harbour traffic doubled in 1900.', span: { start: 0, end: 32 } },
  { text: 'Zarquon quasars rose 97 percent.', span: { start: 33, end: 65 } },
];
const C1_VERDICTS = [
  {
    claim: 0,
    verdict: 'supported',
    passage: { path: 'sources/notes.md', offset: 0 },
    reason: 'The notes say so.',
  },
];

function prepareC1(fixture: ProjectsLibrary): void {
  const book = join(fixture.library, 'book');
  mkdirSync(join(book, 'sources'), { recursive: true });
  mkdirSync(join(book, 'drafts'), { recursive: true });
  writeFileSync(join(book, 'sources', 'notes.md'), C1_SOURCE);
  writeFileSync(join(book, DRAFT), C1_DRAFT);
}

it('C1 an invented statistic in a draft is flagged as unsupported by the check route, and no model call covers it', async () => {
  const h = await openHarness({
    scenario: 'agl20-c1',
    prepare: prepareC1,
    steps: [extractStep(C1_CLAIMS), judgeStep(C1_VERDICTS)],
  });
  try {
    const stream = await observe(h);
    const reply = await post(h, AGENT_GROUNDING_ROUTE, { path: DRAFT });
    expect(reply.status).toBe(200);
    agentStartResponseSchema.parse(JSON.parse(reply.body));
    const events = await readUntilEnded(stream);
    const result = resultOf(events);

    // (a) The supported claim keeps its passage; the invented statistic is unsupported and has no passage.
    expect(result.claims[0]).toMatchObject({
      text: 'Harbour traffic doubled in 1900.',
      verdict: 'supported',
      passage: { path: 'sources/notes.md', offset: 0 },
    });
    expect(result.claims[1]?.text).toBe('Zarquon quasars rose 97 percent.');
    expect(result.claims[1]?.verdict).toBe('unsupported');
    expect(result.claims[1]).not.toHaveProperty('passage');

    // (b) The artefact equals the parsed event result.
    expect(artefactOf(h, DRAFT)).toEqual(result);

    // (c) Exactly one judge request, with claim 0 only: the invented statistic never reaches the model.
    const judgeRequests = (await requestsOf(h)).filter((body) =>
      lastTextOf(body).includes('Task: judge claims.'),
    );
    expect(judgeRequests).toHaveLength(1);
    const judgeText = lastTextOf(judgeRequests[0] as ChatBody);
    expect(judgeText).toContain('Claim 0: Harbour');
    expect(judgeText).not.toContain('Zarquon');
  } finally {
    await h.close();
  }
});

// C3 (criterion 3, unit line 19): the judge cites a passage that the engine did not retrieve for that claim.
const C3_DRAFT = 'Harbour traffic doubled in 1900.\n';
const C3_CLAIMS = [
  { text: 'Harbour traffic doubled in 1900.', span: { start: 0, end: 32 } },
  { text: 'Harbour traffic doubled', span: { start: 0, end: 23 } },
];
const C3_VERDICTS = [
  {
    claim: 0,
    verdict: 'supported',
    passage: { path: 'sources/other.md', offset: 0 },
    reason: 'Cites a passage that was not retrieved for this claim.',
  },
  {
    claim: 1,
    verdict: 'supported',
    passage: { path: 'sources/notes.md', offset: 0 },
    reason: 'The notes say so.',
  },
];

function prepareC3(fixture: ProjectsLibrary): void {
  const book = join(fixture.library, 'book');
  mkdirSync(join(book, 'sources'), { recursive: true });
  mkdirSync(join(book, 'drafts'), { recursive: true });
  writeFileSync(
    join(book, 'sources', 'notes.md'),
    'Harbour traffic doubled in 1900.\n',
  );
  writeFileSync(
    join(book, 'sources', 'other.md'),
    'Unrelated oats and barley.\n',
  );
  writeFileSync(join(book, DRAFT), C3_DRAFT);
}

it('C3 a verdict citing a passage that was not retrieved is downgraded to unsupported by the check route, and a verdict on a retrieved passage stays', async () => {
  const h = await openHarness({
    scenario: 'agl20-c3',
    prepare: prepareC3,
    steps: [extractStep(C3_CLAIMS), judgeStep(C3_VERDICTS)],
  });
  try {
    const stream = await observe(h);
    const reply = await post(h, AGENT_GROUNDING_ROUTE, { path: DRAFT });
    expect(reply.status).toBe(200);
    agentStartResponseSchema.parse(JSON.parse(reply.body));
    const events = await readUntilEnded(stream);
    const result = resultOf(events);

    // (a) Claim 0 cites other.md, which was not retrieved for it: downgraded, with no passage.
    expect(result.claims[0]?.verdict).toBe('unsupported');
    expect(result.claims[0]).not.toHaveProperty('passage');

    // (b) Claim 1 cites notes.md, which was retrieved for it: the verdict stays.
    expect(result.claims[1]).toMatchObject({
      verdict: 'supported',
      passage: { path: 'sources/notes.md', offset: 0 },
    });

    // (c) The artefact equals the parsed event result.
    expect(artefactOf(h, DRAFT)).toEqual(result);

    // (d) Exactly one judge request.
    const judgeRequests = (await requestsOf(h)).filter((body) =>
      lastTextOf(body).includes('Task: judge claims.'),
    );
    expect(judgeRequests).toHaveLength(1);
  } finally {
    await h.close();
  }
});
