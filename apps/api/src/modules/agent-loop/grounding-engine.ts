import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import {
  GROUNDING_ARTEFACT_PATH_PREFIX,
  GROUNDING_ARTEFACT_PATH_SUFFIX,
  GROUNDING_RESULT_SCHEMA_VERSION,
  groundingResultSchema,
  type GroundingClaim,
  type GroundingPassage,
  type GroundingResult,
} from '@bbartolome/scriba-contracts/agent-loop';
import {
  type ChatMessage,
  type ResolvedModel,
  ModelResolver,
  streamChat,
} from '../providers/providers.module';
import {
  FilesService,
  SearchService,
} from '../project-store/project-store.module';
import {
  EXTRACT_FAILED_MESSAGE,
  EXTRACT_MARKER,
  EXTRACT_SYSTEM_PROMPT,
  JUDGE_BATCH_SIZE,
  JUDGE_FAILED_MESSAGE,
  JUDGE_MARKER,
  JUDGE_SYSTEM_PROMPT,
  MODEL_ATTEMPTS,
  NO_PASSAGE_REASON,
  RETRIEVAL_LIMIT,
  UNCITED_REASON,
  extractReplySchema,
  judgeReplySchema,
} from './grounding-prompts';
import type { WriteOverlay } from './tools/write-overlay';

export interface GroundingCheckInput {
  projectId: string;
  runId: string;
  targetPath: string;
  overlay?: WriteOverlay;
  signal?: AbortSignal;
}

// A check that cannot give a result. The message is readable and is shown as it is.
export class GroundingFailure extends Error {
  override name = 'GroundingFailure';
}

// Parses a model reply with the schema. A reply that is not JSON, or does not match, gives undefined.
function parseReply<T>(reply: string, schema: z.ZodType<T>): T | undefined {
  try {
    const parsed = schema.safeParse(JSON.parse(reply.trim()));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

// A claim of the extract reply, and the sources/ passages retrieved for it.
interface JudgeClaim {
  index: number;
  text: string;
  passages: GroundingPassage[];
}

type JudgeVerdict = z.infer<typeof judgeReplySchema>['verdicts'][number];

// The grounding check of one target file: extract the claims, retrieve sources/ passages per claim, judge the claims,
// build the result and write the claims artefact. It is not part of the run loop: no step is counted, no event is
// emitted and no transcript line is written.
@Injectable()
export class GroundingEngine {
  constructor(
    private readonly resolver: ModelResolver,
    private readonly search: SearchService,
    private readonly files: FilesService,
  ) {}

  async check(input: GroundingCheckInput): Promise<GroundingResult> {
    const text =
      input.overlay?.contentOf(input.targetPath) ??
      this.files.read(input.projectId, input.targetPath).content;
    const target = await this.resolver.resolve({ projectId: input.projectId });
    const extracted = await this.extract(target, text, input.signal);
    // Retrieval: the sources/ passages of each claim. A claim with none is never sent to the judge.
    const passages: GroundingPassage[][] = extracted.map((claim) =>
      this.search
        .search(input.projectId, {
          query: claim.text,
          scope: ['sources'],
          limit: RETRIEVAL_LIMIT,
        })
        .map((passage) => ({
          path: passage.path,
          offset: passage.offset,
          snippet: passage.snippet,
        })),
    );
    const judged = new Map<number, JudgeVerdict>();
    const toJudge = extracted
      .map((_, index) => index)
      .filter((index) => (passages[index] ?? []).length > 0);
    for (let start = 0; start < toJudge.length; start += JUDGE_BATCH_SIZE) {
      const batch = toJudge.slice(start, start + JUDGE_BATCH_SIZE);
      const verdicts = await this.judge(
        target,
        batch.map((index) => ({
          index,
          text: extracted[index]?.text ?? '',
          passages: passages[index] ?? [],
        })),
        input.signal,
      );
      for (const [index, verdict] of verdicts) judged.set(index, verdict);
    }
    const claims: GroundingClaim[] = extracted.map((claim, index) =>
      this.verdictOf(claim, passages[index] ?? [], judged.get(index)),
    );
    const result = groundingResultSchema.parse({
      schemaVersion: GROUNDING_RESULT_SCHEMA_VERSION,
      targetPath: input.targetPath,
      contentHash: `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`,
      checkedAt: new Date().toISOString(),
      runId: input.runId,
      claims,
    });
    // The claims artefact: the latest result for this draft, overwritten by each check.
    this.files.write(input.projectId, {
      path: `${GROUNDING_ARTEFACT_PATH_PREFIX}${input.targetPath}${GROUNDING_ARTEFACT_PATH_SUFFIX}`,
      content: `${JSON.stringify(result, null, 2)}\n`,
    });
    return result;
  }

  // One extract call, up to MODEL_ATTEMPTS times while the reply is not a valid claim list.
  private async extract(
    target: ResolvedModel,
    text: string,
    signal: AbortSignal | undefined,
  ): Promise<z.infer<typeof extractReplySchema>['claims']> {
    const messages: ChatMessage[] = [
      { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
      { role: 'user', content: `${EXTRACT_MARKER}\n\n${text}` },
    ];
    for (let attempt = 0; attempt < MODEL_ATTEMPTS; attempt++) {
      const reply = await this.replyText(target, messages, signal);
      const parsed = parseReply(reply, extractReplySchema);
      if (parsed !== undefined) return parsed.claims;
    }
    throw new GroundingFailure(EXTRACT_FAILED_MESSAGE);
  }

  // The text deltas of one model call. Tool-call events are ignored.
  private async replyText(
    target: ResolvedModel,
    messages: ChatMessage[],
    signal: AbortSignal | undefined,
  ): Promise<string> {
    let text = '';
    for await (const event of streamChat(target, { messages, signal })) {
      if (event.type === 'text-delta') text += event.text;
    }
    return text;
  }

  // One judge call for a batch, up to MODEL_ATTEMPTS times. A reply must give exactly one verdict for each claim of
  // the batch, with no other claim number; otherwise it is a failed attempt.
  private async judge(
    target: ResolvedModel,
    batch: JudgeClaim[],
    signal: AbortSignal | undefined,
  ): Promise<Map<number, JudgeVerdict>> {
    let content = `${JUDGE_MARKER}\n\n`;
    for (const claim of batch) {
      content += `Claim ${claim.index}: ${claim.text}\n`;
      for (const passage of claim.passages) {
        content += `Passage ${passage.path} at ${passage.offset}: ${passage.snippet}\n`;
      }
      content += '\n';
    }
    const messages: ChatMessage[] = [
      { role: 'system', content: JUDGE_SYSTEM_PROMPT },
      { role: 'user', content },
    ];
    const expected = new Set(batch.map((claim) => claim.index));
    for (let attempt = 0; attempt < MODEL_ATTEMPTS; attempt++) {
      const reply = await this.replyText(target, messages, signal);
      const parsed = parseReply(reply, judgeReplySchema);
      if (parsed === undefined) continue;
      const byClaim = new Map<number, JudgeVerdict>();
      let covers = parsed.verdicts.length === expected.size;
      for (const verdict of parsed.verdicts) {
        if (!expected.has(verdict.claim) || byClaim.has(verdict.claim)) {
          covers = false;
        }
        byClaim.set(verdict.claim, verdict);
      }
      if (covers) return byClaim;
    }
    throw new GroundingFailure(JUDGE_FAILED_MESSAGE);
  }

  // The verdict of one claim after the rules of the engine: a claim with no passage is unsupported; a supported or
  // weak verdict is kept only with a passage retrieved for this claim, and the passage is the retrieved one.
  private verdictOf(
    claim: z.infer<typeof extractReplySchema>['claims'][number],
    passages: GroundingPassage[],
    judged: JudgeVerdict | undefined,
  ): GroundingClaim {
    const base = { text: claim.text, span: claim.span };
    if (passages.length === 0 || judged === undefined) {
      return { ...base, verdict: 'unsupported', reason: NO_PASSAGE_REASON };
    }
    if (judged.verdict === 'unsupported') {
      return { ...base, verdict: 'unsupported', reason: judged.reason };
    }
    const cited = judged.passage;
    const retrieved =
      cited === undefined || cited === null
        ? undefined
        : passages.find(
            (passage) =>
              passage.path === cited.path && passage.offset === cited.offset,
          );
    if (retrieved === undefined) {
      return { ...base, verdict: 'unsupported', reason: UNCITED_REASON };
    }
    return {
      ...base,
      verdict: judged.verdict,
      reason: judged.reason,
      passage: retrieved,
    };
  }
}
