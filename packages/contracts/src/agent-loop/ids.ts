import { z } from 'zod';

// Ids the loop issues: non-empty strings.
export const agentRunIdSchema = z.string().min(1);
export const agentConversationIdSchema = z.string().min(1);
export const toolCallIdSchema = z.string().min(1);

// The per-run event counter. The first event of a run is 1; `lastSeq` in a run state may be 0.
export const agentSeqSchema = z.number().int().min(1);

export type AgentRunId = z.infer<typeof agentRunIdSchema>;
export type AgentConversationId = z.infer<typeof agentConversationIdSchema>;
export type ToolCallId = z.infer<typeof toolCallIdSchema>;
export type AgentSeq = z.infer<typeof agentSeqSchema>;
