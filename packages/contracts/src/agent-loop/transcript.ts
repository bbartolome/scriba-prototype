import { z } from 'zod';
import {
  AGENT_TRANSCRIPT_SCHEMA_VERSION,
  agentTranscriptKindSchema,
} from './constants.js';
import {
  agentConversationIdSchema,
  agentRunIdSchema,
  agentSeqSchema,
} from './ids.js';

// One line of a transcript file. `data` is untyped: each payload mirrors the stream event of the same name without runId and seq.
export const transcriptEntrySchema = z.object({
  schemaVersion: z.literal(AGENT_TRANSCRIPT_SCHEMA_VERSION),
  at: z.iso.datetime(),
  runId: agentRunIdSchema,
  conversationId: agentConversationIdSchema,
  seq: agentSeqSchema,
  kind: agentTranscriptKindSchema,
  data: z.unknown(),
});

export type TranscriptEntry = z.infer<typeof transcriptEntrySchema>;
