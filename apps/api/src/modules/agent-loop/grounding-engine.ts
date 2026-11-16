import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import {
  GROUNDING_ARTEFACT_PATH_PREFIX,
  GROUNDING_ARTEFACT_PATH_SUFFIX,
  GROUNDING_RESULT_SCHEMA_VERSION,
  groundingResultSchema,
  type GroundingClaim,
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
  MODEL_ATTEMPTS,
  NO_PASSAGE_REASON,
  extractReplySchema,
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
    const claims: GroundingClaim[] = extracted.map((claim) => ({
      text: claim.text,
      span: claim.span,
      verdict: 'unsupported',
      reason: NO_PASSAGE_REASON,
    }));
    const result = groundingResultSchema.parse({
      schemaVersion: GROUNDING_RESULT_SCHEMA_VERSION,
      targetPath: input.targetPath,
      contentHash: `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`,
      checkedAt: new Date().toISOString(),
      runId: input.runId,
      claims,
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
}
