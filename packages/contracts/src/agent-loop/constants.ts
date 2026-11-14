import { z } from 'zod';

// Constants and enums of the agent-loop slice. Each enum is a literal tuple, then a z.enum over it.

// The step cap of an agent run when the settings do not name one.
export const AGENT_DEFAULT_STEP_CAP = 12 as const;

// The five tool families. A tool call's `family` says which kind of tool ran.
export const AGENT_TOOL_FAMILIES = [
  'project',
  'narrative',
  'research',
  'compile',
  'grounding',
] as const;

export const agentToolFamilySchema = z.enum(AGENT_TOOL_FAMILIES);

// Why an agent run ended.
export const AGENT_RUN_END_REASONS = [
  'completed',
  'stopped',
  'capped',
  'error',
  'project-switched',
] as const;

export const agentRunEndReasonSchema = z.enum(AGENT_RUN_END_REASONS);

// The eleven names the loop reserves for its built-in tools. A registry tool with one of these names is left out.
export const AGENT_RESERVED_TOOL_NAMES = [
  'list_files',
  'read_file',
  'write_file',
  'edit_file',
  'search_notes',
  'check_grounding',
  'web_search',
  'fetch_page',
  'assemble_manuscript',
  'run_preflight',
  'export_manuscript',
] as const;

export const agentReservedToolNameSchema = z.enum(AGENT_RESERVED_TOOL_NAMES);

// The status of a run in its run state.
export const AGENT_RUN_STATUSES = ['running', 'ended'] as const;

export const agentRunStatusSchema = z.enum(AGENT_RUN_STATUSES);

// The status of a tool-call card.
export const AGENT_CARD_STATUSES = ['running', 'done', 'error'] as const;

export const agentCardStatusSchema = z.enum(AGENT_CARD_STATUSES);

// The kinds of a transcript entry.
export const AGENT_TRANSCRIPT_KINDS = [
  'intent',
  'step',
  'assistant-text',
  'tool-call',
  'tool-result',
  'tool-error',
  'grounding',
  'pending-change',
  'run-end',
] as const;

export const agentTranscriptKindSchema = z.enum(AGENT_TRANSCRIPT_KINDS);

// The verdict of one claim in a grounding check.
export const GROUNDING_VERDICTS = ['supported', 'weak', 'unsupported'] as const;

export const groundingVerdictSchema = z.enum(GROUNDING_VERDICTS);

// Schema versions of the persisted formats. Each format carries its own.
export const GROUNDING_RESULT_SCHEMA_VERSION = 1 as const;
export const AGENT_TRANSCRIPT_SCHEMA_VERSION = 1 as const;

// Path rule of the claims artefact: logs/grounding/<targetPath>.json, for example logs/grounding/drafts/ch01.md.json.
export const GROUNDING_ARTEFACT_PATH_PREFIX = 'logs/grounding/';
export const GROUNDING_ARTEFACT_PATH_SUFFIX = '.json';
export const GROUNDING_ARTEFACT_PATH_TEMPLATE =
  'logs/grounding/<targetPath>.json';
export const GROUNDING_ARTEFACT_PATH_PATTERN = /^logs\/grounding\/.+\.json$/;

// Path rule of a transcript: logs/agent-runs/<yyyymmddThhmmssZ>-<runId>.jsonl.
export const AGENT_TRANSCRIPT_PATH_TEMPLATE =
  'logs/agent-runs/<yyyymmddThhmmssZ>-<runId>.jsonl';
export const AGENT_TRANSCRIPT_PATH_PATTERN =
  /^logs\/agent-runs\/\d{8}T\d{6}Z-[^/]+\.jsonl$/;

export type AgentToolFamily = z.infer<typeof agentToolFamilySchema>;
export type AgentRunEndReason = z.infer<typeof agentRunEndReasonSchema>;
export type AgentReservedToolName = z.infer<typeof agentReservedToolNameSchema>;
export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>;
export type AgentCardStatus = z.infer<typeof agentCardStatusSchema>;
export type AgentTranscriptKind = z.infer<typeof agentTranscriptKindSchema>;
export type GroundingVerdict = z.infer<typeof groundingVerdictSchema>;
