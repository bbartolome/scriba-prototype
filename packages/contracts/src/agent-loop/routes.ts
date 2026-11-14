// Route constants of the agent-loop API. Every path is under /api/agent-loop/.
// Reads are GET and never mutate; commands are POST.
export const AGENT_RUNS_ROUTE = '/api/agent-loop/runs' as const;
export const AGENT_RUN_STOP_ROUTE = '/api/agent-loop/runs/stop' as const;
export const AGENT_RUN_CURRENT_ROUTE = '/api/agent-loop/runs/current' as const;
export const AGENT_CONVERSATIONS_ROUTE =
  '/api/agent-loop/conversations' as const;
export const AGENT_CONVERSATION_ROUTE =
  '/api/agent-loop/conversations/:conversationId' as const;
export const AGENT_GROUNDING_ROUTE = '/api/agent-loop/grounding' as const;
export const AGENT_SETTINGS_ROUTE = '/api/agent-loop/settings' as const;
