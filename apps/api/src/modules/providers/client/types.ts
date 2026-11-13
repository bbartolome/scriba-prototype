import type { OpenAICompatibleConfig } from '@bbartolome/scriba-contracts/providers';

// In-process types of the openai-compatible client. Names are camelCase; the client maps them to the wire names.

export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content?: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolCallId: string; content: string };

// The Tool registry's model function schema, passed through unchanged.
export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export type ToolChoice = 'auto' | 'none' | 'required';

// A resolved target: the provider config, the key when one is given, and the model id.
// Resolving a project id into a target is MPR-05's job.
export interface ProviderTarget {
  config: OpenAICompatibleConfig;
  key?: string;
  model: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  tools?: ToolSchema[];
  toolChoice?: ToolChoice;
  signal?: AbortSignal;
  // Test-only: replaces the 300 000 ms limit that applies when config.timeout is 0.
  // Production code never passes it.
  zeroTimeoutLimitMs?: number;
}

export type FinishReason = 'stop' | 'tool-calls' | 'length' | 'aborted';

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// The arguments are the raw string the provider sent. The client never parses or validates them.
export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export type StreamEvent =
  | { type: 'text-delta'; text: string }
  | ({ type: 'tool-call' } & ToolCall)
  | ({ type: 'usage' } & Usage)
  | { type: 'finish'; reason: FinishReason };

export interface CollectedStream {
  text: string;
  toolCalls: ToolCall[];
  finishReason: FinishReason;
  usage?: Usage;
}
