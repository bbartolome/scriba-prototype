import { z } from 'zod';
import {
  agentRunEndReasonSchema,
  agentToolFamilySchema,
  diffPreviewSchema,
  draftProvenanceSchema,
  toolCallIdSchema,
  type AgentTranscriptKind,
} from '@bbartolome/scriba-contracts/agent-loop';
import { entityRefSchema } from '@bbartolome/scriba-contracts/project-store';

// The longest string a transcript line keeps (D8). A longer one is cut to this many characters, with the marker.
export const TRANSCRIPT_TEXT_LIMIT = 8192;

// The longest tool message the context trimming keeps as it is (D11). Module-internal, like the limit above.
export const SHORTENED_TEXT_LIMIT = 200;

// Cuts a text to its first `limit` characters and names the original length. A text within the limit is left as it is.
export function cutText(
  text: string,
  limit: number,
  label: 'truncated' | 'shortened',
): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)} … [${label}: original length ${text.length} characters]`;
}

// The payload of each transcript kind (D2). Each mirrors the stream event of the same name without runId and seq, plus
// the fields the transcript adds (step, rawArguments, modelText). The contract types `data` as unknown; these are the
// writer's and the reader's schemas. The grounding kind is not written here (AGL-16).
const step = z.number().int().min(1);

const intentPayloadSchema = z.object({
  intent: z.string(),
  // The registry tools left out of the run, because their names clash with a reserved name (AGL-09 OP2).
  excludedTools: z.array(z.string()).optional(),
});

const stepPayloadSchema = z.object({
  step,
  cap: z.number().int().min(1),
});

const assistantTextPayloadSchema = z.object({
  step,
  text: z.string(),
});

const toolCallPayloadSchema = z.object({
  step,
  callId: toolCallIdSchema,
  name: z.string().min(1),
  family: agentToolFamilySchema.optional(),
  arguments: z.unknown(),
  rawArguments: z.string(),
  valid: z.boolean(),
});

const toolResultPayloadSchema = z.object({
  step,
  callId: toolCallIdSchema,
  summary: z.string(),
  output: z.unknown(),
  modelText: z.string(),
  diffPreview: diffPreviewSchema.optional(),
  sourcesUsed: z.array(entityRefSchema).optional(),
  provenance: draftProvenanceSchema.optional(),
});

const toolErrorPayloadSchema = z.object({
  step,
  callId: toolCallIdSchema,
  message: z.string(),
  attempt: z.number().int().min(1),
  withdrawn: z.boolean().optional(),
});

const runEndPayloadSchema = z.object({
  reason: agentRunEndReasonSchema,
  pendingChangeIds: z.array(z.string().min(1)),
  message: z.string().optional(),
});

// One written change (AGL-12 P10): the id when it was filed, or the refusal when the Project store did not file it.
const pendingChangePayloadSchema = z.object({
  path: z.string().min(1),
  pendingChangeId: z.string().min(1).optional(),
  refusal: z.string().min(1).optional(),
});

// The payload schema of each kind this module writes and reads.
export const transcriptPayloadSchemas: Partial<
  Record<AgentTranscriptKind, z.ZodType>
> = {
  intent: intentPayloadSchema,
  step: stepPayloadSchema,
  'assistant-text': assistantTextPayloadSchema,
  'tool-call': toolCallPayloadSchema,
  'tool-result': toolResultPayloadSchema,
  'tool-error': toolErrorPayloadSchema,
  'run-end': runEndPayloadSchema,
  'pending-change': pendingChangePayloadSchema,
};
