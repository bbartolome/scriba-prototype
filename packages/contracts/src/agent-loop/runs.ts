import { z } from 'zod';
import { agentCardSchema } from './cards.js';
import { agentRunEndReasonSchema, agentRunStatusSchema } from './constants.js';
import { groundingResultSchema } from './grounding.js';
import { agentConversationIdSchema, agentRunIdSchema } from './ids.js';

// Body of POST .../runs. A conversationId continues that conversation.
export const agentStartRequestSchema = z.object({
  intent: z.string().min(1),
  conversationId: agentConversationIdSchema.optional(),
});

// Response of the start request.
export const agentStartResponseSchema = z.object({
  runId: agentRunIdSchema,
  conversationId: agentConversationIdSchema,
});

// Body of POST .../runs/stop.
export const agentStopRequestSchema = z.object({
  runId: agentRunIdSchema,
});

// The state of a run that a device can read after it slept. `reason` is present when the run has ended.
export const agentRunStateSchema = z.object({
  runId: agentRunIdSchema,
  conversationId: agentConversationIdSchema,
  status: agentRunStatusSchema,
  step: z.number().int().min(0),
  cap: z.number().int().min(1),
  assistantText: z.string(),
  cards: z.array(agentCardSchema),
  groundingResults: z.array(groundingResultSchema),
  pendingChangeIds: z.array(z.string().min(1)),
  lastSeq: z.number().int().min(0),
  reason: agentRunEndReasonSchema.optional(),
});

// One finished run in a conversation.
export const conversationTurnSchema = z.object({
  runId: agentRunIdSchema,
  intent: z.string().min(1),
  assistantText: z.string(),
  cards: z.array(agentCardSchema),
  endedAt: z.iso.datetime(),
  reason: agentRunEndReasonSchema,
});

// Response of GET .../conversations/:conversationId: the finished turns only.
export const conversationHistorySchema = z.object({
  conversationId: agentConversationIdSchema,
  turns: z.array(conversationTurnSchema),
});

// One entry of the conversation list. `intent` is the first intent, as a label.
export const conversationSummarySchema = z.object({
  conversationId: agentConversationIdSchema,
  intent: z.string().min(1),
  updatedAt: z.iso.datetime(),
  turnCount: z.number().int().min(1),
});

// Response of GET .../conversations.
export const conversationListSchema = z.object({
  conversations: z.array(conversationSummarySchema),
});

export type AgentStartRequest = z.infer<typeof agentStartRequestSchema>;
export type AgentStartResponse = z.infer<typeof agentStartResponseSchema>;
export type AgentStopRequest = z.infer<typeof agentStopRequestSchema>;
export type AgentRunState = z.infer<typeof agentRunStateSchema>;
export type ConversationTurn = z.infer<typeof conversationTurnSchema>;
export type ConversationHistory = z.infer<typeof conversationHistorySchema>;
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;
export type ConversationList = z.infer<typeof conversationListSchema>;
