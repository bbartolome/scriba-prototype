import { z } from 'zod';
import { sseEnvelopeSchema } from '../platform/events.js';
import { entityRefSchema } from '../project-store/entities.js';
import { projectPathSchema } from '../project-store/files.js';
import { agentRunEndReasonSchema, agentToolFamilySchema } from './constants.js';
import { diffPreviewSchema } from './cards.js';
import { groundingResultSchema } from './grounding.js';
import { agentRunIdSchema, agentSeqSchema, toolCallIdSchema } from './ids.js';
import { draftProvenanceSchema } from './provenance.js';

// Every event's data carries the run and the run's event counter.
export const agentEventBaseSchema = z.object({
  runId: agentRunIdSchema,
  seq: agentSeqSchema,
});

// run-started has no fields beyond the base.
export const runStartedDataSchema = agentEventBaseSchema;

export const tokenDeltaDataSchema = agentEventBaseSchema.extend({
  text: z.string(),
});

export const toolCallStartedDataSchema = agentEventBaseSchema.extend({
  callId: toolCallIdSchema,
  name: z.string().min(1),
  family: agentToolFamilySchema,
});

// `arguments` is the parsed value when the JSON parsed, otherwise the raw string.
export const toolCallArgsDataSchema = agentEventBaseSchema.extend({
  callId: toolCallIdSchema,
  arguments: z.unknown(),
  valid: z.boolean(),
});

// `output` has the {kind, content} shape for a narrative tool; other families return other shapes.
export const toolCallResultDataSchema = agentEventBaseSchema.extend({
  callId: toolCallIdSchema,
  summary: z.string(),
  output: z.unknown().optional(),
  diffPreview: diffPreviewSchema.optional(),
  sourcesUsed: z.array(entityRefSchema).optional(),
  provenance: draftProvenanceSchema.optional(),
});

export const toolCallErrorDataSchema = agentEventBaseSchema.extend({
  callId: toolCallIdSchema,
  message: z.string(),
  attempt: z.number().int().min(1),
  withdrawn: z.boolean().optional(),
});

export const groundingStartedDataSchema = agentEventBaseSchema.extend({
  targetPath: projectPathSchema,
});

// The grounding result is the claims artefact plus the event counter.
export const groundingResultDataSchema = groundingResultSchema.extend({
  seq: agentSeqSchema,
});

export const stepCapReachedDataSchema = agentEventBaseSchema.extend({
  step: z.number().int().min(0),
  cap: z.number().int().min(1),
});

export const runEndedDataSchema = agentEventBaseSchema.extend({
  reason: agentRunEndReasonSchema,
  message: z.string().optional(),
  pendingChangeIds: z.array(z.string().min(1)),
});

const runStartedMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('agent-loop'),
  type: z.literal('run-started'),
  data: runStartedDataSchema,
});

const tokenDeltaMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('agent-loop'),
  type: z.literal('token-delta'),
  data: tokenDeltaDataSchema,
});

const toolCallStartedMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('agent-loop'),
  type: z.literal('tool-call-started'),
  data: toolCallStartedDataSchema,
});

const toolCallArgsMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('agent-loop'),
  type: z.literal('tool-call-args'),
  data: toolCallArgsDataSchema,
});

const toolCallResultMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('agent-loop'),
  type: z.literal('tool-call-result'),
  data: toolCallResultDataSchema,
});

const toolCallErrorMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('agent-loop'),
  type: z.literal('tool-call-error'),
  data: toolCallErrorDataSchema,
});

const groundingStartedMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('agent-loop'),
  type: z.literal('grounding-started'),
  data: groundingStartedDataSchema,
});

const groundingResultMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('agent-loop'),
  type: z.literal('grounding-result'),
  data: groundingResultDataSchema,
});

const stepCapReachedMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('agent-loop'),
  type: z.literal('step-cap-reached'),
  data: stepCapReachedDataSchema,
});

const runEndedMemberSchema = sseEnvelopeSchema.extend({
  module: z.literal('agent-loop'),
  type: z.literal('run-ended'),
  data: runEndedDataSchema,
});

// The agent loop's ten members of the SSE envelope.
export const agentLoopEventSchema = z.discriminatedUnion('type', [
  runStartedMemberSchema,
  tokenDeltaMemberSchema,
  toolCallStartedMemberSchema,
  toolCallArgsMemberSchema,
  toolCallResultMemberSchema,
  toolCallErrorMemberSchema,
  groundingStartedMemberSchema,
  groundingResultMemberSchema,
  stepCapReachedMemberSchema,
  runEndedMemberSchema,
]);

export type AgentEventBase = z.infer<typeof agentEventBaseSchema>;
export type RunStartedData = z.infer<typeof runStartedDataSchema>;
export type TokenDeltaData = z.infer<typeof tokenDeltaDataSchema>;
export type ToolCallStartedData = z.infer<typeof toolCallStartedDataSchema>;
export type ToolCallArgsData = z.infer<typeof toolCallArgsDataSchema>;
export type ToolCallResultData = z.infer<typeof toolCallResultDataSchema>;
export type ToolCallErrorData = z.infer<typeof toolCallErrorDataSchema>;
export type GroundingStartedData = z.infer<typeof groundingStartedDataSchema>;
export type GroundingResultData = z.infer<typeof groundingResultDataSchema>;
export type StepCapReachedData = z.infer<typeof stepCapReachedDataSchema>;
export type RunEndedData = z.infer<typeof runEndedDataSchema>;
export type AgentLoopEvent = z.infer<typeof agentLoopEventSchema>;
