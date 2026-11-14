import { z } from 'zod';

// Agent-loop error codes. Each code has the AGENT_ prefix, which errorCodeSchema checks.
// The key is the short name, as PROJECT_ERROR_CODES does.
export const AGENT_ERROR_CODES = {
  RUN_ACTIVE: 'AGENT_RUN_ACTIVE',
  NO_PROVIDER: 'AGENT_NO_PROVIDER',
  NO_ACTIVE_PROJECT: 'AGENT_NO_ACTIVE_PROJECT',
  RUN_NOT_FOUND: 'AGENT_RUN_NOT_FOUND',
} as const;

// The same four codes as a literal tuple. z.enum needs a literal tuple, and Object.values is not typed as one.
export const AGENT_ERROR_CODE_VALUES = [
  'AGENT_RUN_ACTIVE',
  'AGENT_NO_PROVIDER',
  'AGENT_NO_ACTIVE_PROJECT',
  'AGENT_RUN_NOT_FOUND',
] as const;

export const agentErrorCodeSchema = z.enum(AGENT_ERROR_CODE_VALUES);

export type AgentErrorCode = z.infer<typeof agentErrorCodeSchema>;

// HTTP status for each agent-loop error code. No AGENT code is 401: the Shell sends every HTTP 401 to /setup.
export const AGENT_ERROR_STATUS = {
  AGENT_RUN_ACTIVE: 409,
  AGENT_NO_PROVIDER: 409,
  AGENT_NO_ACTIVE_PROJECT: 409,
  AGENT_RUN_NOT_FOUND: 404,
} as const;
