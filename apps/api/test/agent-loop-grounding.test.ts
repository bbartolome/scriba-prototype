import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  EXTRACT_FAILED_MESSAGE,
  EXTRACT_MARKER,
  JUDGE_MARKER,
  NO_PASSAGE_REASON,
} from '../src/modules/agent-loop/grounding-prompts';
import {
  GROUNDING_ARTEFACT_PATH_PATTERN,
  GROUNDING_ARTEFACT_PATH_PREFIX,
  GROUNDING_ARTEFACT_PATH_SUFFIX,
  groundingResultSchema,
} from '@bbartolome/scriba-contracts/agent-loop';
import { COMPOSED_MODULES } from '../src/app.module';
import { agentLoopGroundingKitModule } from './agent-loop-grounding.kit';
import {
  openHarness,
  post,
  requestsOf,
  type ChatBody,
  type Harness,
} from './agent-loop-transcript.kit';
import type { Reply } from './guard-request';
import type { ProjectsLibrary } from './project-store-projects.kit';

// Each test opens its own harness: one mock scenario, one temp library with `book` active, and the composed app
// plus the test-only grounding kit. Nothing here reads a service inside the app.

const RUN_ID = 'run-agl16';
const DRAFT = 'drafts/ch01.md';
const DRAFT_TEXT = 'Harbour traffic doubled in 1900.\n';
const CHECK = '/api/agent-loop-test/grounding';

function prepare(fixture: ProjectsLibrary): void {
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
  writeFileSync(join(book, DRAFT), DRAFT_TEXT);
}

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

function span(start: number, end: number): { start: number; end: number } {
  return { start, end };
}

async function check(
  h: Harness,
  body: Record<string, unknown> = {},
): Promise<Reply> {
  return post(h, CHECK, {
    projectId: 'book',
    runId: RUN_ID,
    targetPath: DRAFT,
    ...body,
  });
}

// The text of the last message of a chat request, as the mock reads it.
function lastContentOf(body: ChatBody): string {
  const last = body.messages[body.messages.length - 1];
  return typeof last?.content === 'string' ? last.content : '';
}

function requestsWith(requests: ChatBody[], marker: string): ChatBody[] {
  return requests.filter((body) => lastContentOf(body).includes(marker));
}

function sha256Hex(bytes: string | Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

// The artefact of the draft, at the path the contract's prefix and suffix give.
function artefactPath(fixture: ProjectsLibrary): string {
  return join(
    fixture.library,
    'book',
    `${GROUNDING_ARTEFACT_PATH_PREFIX}${DRAFT}${GROUNDING_ARTEFACT_PATH_SUFFIX}`,
  );
}

it('G1 a verdict citing an unretrieved passage is downgraded', async () => {
  const h = await openHarness({
    scenario: 'agl16-downgrade',
    prepare,
    modules: [...COMPOSED_MODULES, agentLoopGroundingKitModule()],
    steps: [
      extractStep([
        { text: 'Harbour traffic doubled in 1900.', span: span(0, 31) },
        { text: 'Harbour traffic was measured.', span: span(0, 28) },
      ]),
      judgeStep([
        {
          claim: 0,
          verdict: 'supported',
          passage: { path: 'sources/other.md', offset: 0 },
          reason: 'Cited passage.',
        },
        {
          claim: 1,
          verdict: 'supported',
          passage: { path: 'sources/notes.md', offset: 0 },
          reason: 'Cited passage.',
        },
      ]),
    ],
  });
  try {
    const reply = await check(h);
    expect(reply.status).toBe(200);
    const result = groundingResultSchema.parse(JSON.parse(reply.body));
    const [first, second] = result.claims;
    expect(first).toMatchObject({
      text: 'Harbour traffic doubled in 1900.',
      verdict: 'unsupported',
    });
    expect(first).not.toHaveProperty('passage');
    expect(second).toMatchObject({
      text: 'Harbour traffic was measured.',
      verdict: 'supported',
      passage: { path: 'sources/notes.md', offset: 0 },
    });
  } finally {
    await h.close();
  }
});

it('G2 a claim with no retrieved passage is unsupported and no judge call covers it', async () => {
  const h = await openHarness({
    scenario: 'agl16-no-passage',
    prepare,
    modules: [...COMPOSED_MODULES, agentLoopGroundingKitModule()],
    steps: [
      extractStep([
        { text: 'Harbour traffic doubled in 1900.', span: span(0, 31) },
        { text: 'Zarquon quasars rose 97 percent.', span: span(0, 32) },
      ]),
      judgeStep([
        {
          claim: 0,
          verdict: 'supported',
          passage: { path: 'sources/notes.md', offset: 0 },
          reason: 'Cited passage.',
        },
      ]),
    ],
  });
  try {
    const reply = await check(h);
    expect(reply.status).toBe(200);
    const result = groundingResultSchema.parse(JSON.parse(reply.body));
    expect(result.claims[1]).toMatchObject({
      text: 'Zarquon quasars rose 97 percent.',
      verdict: 'unsupported',
      reason: NO_PASSAGE_REASON,
    });
    const judgeRequests = requestsWith(await requestsOf(h), JUDGE_MARKER);
    expect(judgeRequests).toHaveLength(1);
    const judgeText = lastContentOf(judgeRequests[0] as ChatBody);
    expect(judgeText).toContain('Harbour');
    expect(judgeText).not.toContain('Zarquon');
  } finally {
    await h.close();
  }
});

it('G3 the claims artefact matches the contract, the path rule and the content hash', async () => {
  const h = await openHarness({
    scenario: 'agl16-artefact',
    prepare,
    modules: [...COMPOSED_MODULES, agentLoopGroundingKitModule()],
    steps: [
      extractStep([
        { text: 'Harbour traffic doubled in 1900.', span: span(0, 31) },
      ]),
      judgeStep([
        {
          claim: 0,
          verdict: 'supported',
          passage: { path: 'sources/notes.md', offset: 0 },
          reason: 'Cited passage.',
        },
      ]),
    ],
  });
  try {
    const reply = await check(h);
    expect(reply.status).toBe(200);
    const file = artefactPath(h.fixture);
    expect(existsSync(file)).toBe(true);
    const text = readFileSync(file, 'utf8');
    const parsed = groundingResultSchema.parse(JSON.parse(text));
    expect(parsed.targetPath).toBe(DRAFT);
    expect(parsed.runId).toBe(RUN_ID);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.contentHash).toBe(
      `sha256:${sha256Hex(readFileSync(join(h.fixture.library, 'book', DRAFT)))}`,
    );
    expect(JSON.parse(text)).toEqual(JSON.parse(reply.body));
    expect(
      GROUNDING_ARTEFACT_PATH_PATTERN.test(`logs/grounding/${DRAFT}.json`),
    ).toBe(true);

    // The second check is over the overlay text, which overwrites the same file.
    const overlayText =
      'Harbour traffic doubled in 1900. Changed in the run.\n';
    const second = await check(h, { overlay: { [DRAFT]: overlayText } });
    expect(second.status).toBe(200);
    const overwritten = groundingResultSchema.parse(
      JSON.parse(readFileSync(file, 'utf8')),
    );
    expect(overwritten.contentHash).toBe(`sha256:${sha256Hex(overlayText)}`);
  } finally {
    await h.close();
  }
});

it('G4 malformed extract JSON is retried twice, then the check fails readably', async () => {
  const h = await openHarness({
    scenario: 'agl16-malformed',
    prepare,
    modules: [...COMPOSED_MODULES, agentLoopGroundingKitModule()],
    steps: [
      {
        match: { endpoint: 'chat', lastMessageContent: EXTRACT_MARKER },
        reply: { kind: 'stream', deltas: ['not a claim list'] },
      },
    ],
  });
  try {
    const reply = await check(h);
    expect(reply.status).toBe(200);
    expect(JSON.parse(reply.body)).toEqual({ failure: EXTRACT_FAILED_MESSAGE });
    const requests = await requestsOf(h);
    expect(requestsWith(requests, EXTRACT_MARKER)).toHaveLength(3);
    expect(requestsWith(requests, JUDGE_MARKER)).toHaveLength(0);
    expect(
      existsSync(join(h.fixture.library, 'book', 'logs', 'grounding')),
    ).toBe(false);
  } finally {
    await h.close();
  }
});
