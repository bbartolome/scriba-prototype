import OpenAI from 'openai';
import type { OpenAICompatibleConfig } from '@bbartolome/scriba-contracts/providers';
import {
  classifyFailure,
  providerError,
  type AttemptState,
  type Endpoint,
  type Failure,
} from './errors';
import { mayRetry, retryWaitMs } from './retry';
import type {
  ChatMessage,
  ChatRequest,
  FinishReason,
  ProviderTarget,
  StreamEvent,
  Usage,
} from './types';

type ChunkFragment = NonNullable<
  NonNullable<
    OpenAI.Chat.Completions.ChatCompletionChunk['choices'][number]['delta']['tool_calls']
  >[number]
>;

// The placeholder key of a keyless provider (S13). It is not sk- shaped, so redaction does not read it as a key.
export const KEYLESS_PLACEHOLDER = 'scriba-keyless';

// The limit used when config.timeout is 0 (S15).
const DEFAULT_ZERO_TIMEOUT_MS = 300_000;

// The request headers the SDK sends itself (S25). Every other header is removed before the request leaves.
const SDK_HEADERS = new Set([
  'accept',
  'user-agent',
  'content-type',
  'x-stainless-retry-count',
  'x-stainless-timeout',
  'x-stainless-lang',
  'x-stainless-package-version',
  'x-stainless-os',
  'x-stainless-arch',
  'x-stainless-runtime',
  'x-stainless-runtime-version',
]);

// One attempt's timer and abort wiring. The timer covers the wait for the first byte and every idle gap
// between chunks (S15). It is disarmed while the caller consumes an event, so the caller's pace is not counted.
class AttemptScope {
  sawChunk = false;
  private timedOut = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly controller = new AbortController();
  private readonly onCallerAbort = (): void => {
    this.controller.abort();
  };

  constructor(
    private readonly caller: AbortSignal | undefined,
    readonly limitMs: number,
    private readonly endpoint: Endpoint,
  ) {
    if (caller?.aborted === true) {
      this.controller.abort();
    }
    caller?.addEventListener('abort', this.onCallerAbort, { once: true });
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  arm(): void {
    this.disarm();
    this.timer = setTimeout(() => {
      this.timedOut = true;
      this.controller.abort();
    }, this.limitMs);
  }

  disarm(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  state(): AttemptState {
    return {
      callerAborted: this.caller?.aborted === true,
      timedOut: this.timedOut,
      endpoint: this.endpoint,
    };
  }

  // Ends the attempt. Aborting closes the socket when the caller stopped reading early.
  close(): void {
    this.disarm();
    this.caller?.removeEventListener('abort', this.onCallerAbort);
    this.controller.abort();
  }
}

// Carries a classified failure out of an attempt, so the retry loop can decide.
class AttemptFailure extends Error {
  readonly failure: Failure;

  constructor(failure: Failure) {
    super(failure.error.code);
    this.failure = failure;
  }
}

// Streams one chat completion. Text deltas are yielded as they arrive; tool calls, usage and the finish
// event follow when the stream ends (S4). Retries are allowed only before the first chunk (S5).
export async function* streamChat(
  target: ProviderTarget,
  request: ChatRequest,
): AsyncGenerator<StreamEvent> {
  assertConfigured(target, true);
  if (request.signal?.aborted === true) {
    throw providerError('PROVIDER_ABORTED');
  }
  const limitMs = limitFor(target.config, request.zeroTimeoutLimitMs);
  const client = clientFor(target, limitMs);
  const body = chatBody(target, request);
  for (let attempt = 1; ; attempt++) {
    const scope = new AttemptScope(request.signal, limitMs, 'chat');
    try {
      yield* runStreamAttempt(client, body, scope);
      return;
    } catch (error) {
      if (!(error instanceof AttemptFailure)) {
        throw error;
      }
      if (
        !mayRetry(error.failure, attempt, target.config.retries, scope.sawChunk)
      ) {
        throw error.failure.error;
      }
      await sleep(
        retryWaitMs(attempt, error.failure.retryAfterMs),
        request.signal,
      );
    } finally {
      scope.close();
    }
  }
}

// Lists the provider's model ids in the order it sent them (S18). The model of the target is ignored (S14).
export async function listModels(
  target: ProviderTarget,
  signal?: AbortSignal,
): Promise<string[]> {
  assertConfigured(target, false);
  if (signal?.aborted === true) {
    throw providerError('PROVIDER_ABORTED');
  }
  const limitMs = limitFor(target.config);
  const client = clientFor(target, limitMs);
  for (let attempt = 1; ; attempt++) {
    const scope = new AttemptScope(signal, limitMs, 'models');
    try {
      return await listOnce(client, scope);
    } catch (error) {
      if (!(error instanceof AttemptFailure)) {
        throw error;
      }
      // No stream exists for the model list, so the retry boundary is never closed here (sawChunk stays false).
      if (!mayRetry(error.failure, attempt, target.config.retries, false)) {
        throw error.failure.error;
      }
      await sleep(retryWaitMs(attempt, error.failure.retryAfterMs), signal);
    } finally {
      scope.close();
    }
  }
}

function assertConfigured(target: ProviderTarget, needsModel: boolean): void {
  if (needsModel && target.model === '') {
    throw providerError('PROVIDER_NOT_CONFIGURED');
  }
  if (target.config.keyRef !== undefined && target.key === undefined) {
    throw providerError('PROVIDER_NOT_CONFIGURED');
  }
}

// The config's timeout, or the default limit when it is 0 (S15).
function limitFor(
  config: OpenAICompatibleConfig,
  zeroLimitMs = DEFAULT_ZERO_TIMEOUT_MS,
): number {
  return config.timeout > 0 ? config.timeout : zeroLimitMs;
}

function clientFor(target: ProviderTarget, limitMs: number): OpenAI {
  return new OpenAI({
    baseURL: target.config.baseURL,
    apiKey: target.key ?? KEYLESS_PLACEHOLDER,
    // S25: explicit values stop the SDK from reading its environment variables.
    adminAPIKey: null,
    organization: null,
    project: null,
    webhookSecret: null,
    logLevel: 'off',
    fetch: ownHeadersFetch(`Bearer ${target.key ?? KEYLESS_PLACEHOLDER}`),
    maxRetries: 0,
    timeout: limitMs,
  });
}

// Keeps only the headers the SDK sends itself and sets authorization to the client's own value.
// Environment headers (OPENAI_CUSTOM_HEADERS) cannot reach the request this way (S25).
function ownHeadersFetch(
  authorization: string,
): (input: string | URL | Request, init?: RequestInit) => Promise<Response> {
  return (input, init) => {
    const headers = new Headers();
    new Headers(init?.headers).forEach((value, name) => {
      if (SDK_HEADERS.has(name)) {
        headers.set(name, value);
      }
    });
    headers.set('authorization', authorization);
    return globalThis.fetch(input, { ...init, headers });
  };
}

function chatBody(
  target: ProviderTarget,
  request: ChatRequest,
): OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming {
  return {
    model: target.model,
    messages: request.messages.map(toWireMessage),
    temperature: target.config.temperature,
    max_tokens: target.config.maxTokens,
    stream: true,
    ...(request.tools !== undefined ? { tools: request.tools } : {}),
    ...(request.toolChoice !== undefined
      ? { tool_choice: request.toolChoice }
      : {}),
  };
}

function toWireMessage(
  message: ChatMessage,
): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  switch (message.role) {
    case 'system':
      return { role: 'system', content: message.content };
    case 'user':
      return { role: 'user', content: message.content };
    case 'assistant': {
      const calls = message.toolCalls ?? [];
      if (calls.length === 0) {
        return { role: 'assistant', content: message.content ?? '' };
      }
      return {
        role: 'assistant',
        content: message.content ? message.content : null,
        tool_calls: calls.map((call) => ({
          id: call.id,
          type: 'function' as const,
          function: { name: call.name, arguments: call.arguments },
        })),
      };
    }
    case 'tool':
      return {
        role: 'tool',
        tool_call_id: message.toolCallId,
        content: message.content,
      };
  }
}

// One streamed attempt. Throws AttemptFailure when it fails, and yields the events when it succeeds.
async function* runStreamAttempt(
  client: OpenAI,
  body: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
  scope: AttemptScope,
): AsyncGenerator<StreamEvent> {
  const assembler = new ChunkAssembler();
  try {
    scope.arm();
    const stream = await client.chat.completions.create(body, {
      signal: scope.signal,
      timeout: scope.limitMs,
      maxRetries: 0,
    });
    for await (const chunk of stream) {
      scope.sawChunk = true;
      scope.disarm();
      for (const event of assembler.push(chunk)) {
        yield event;
      }
      scope.arm();
    }
  } catch (raw) {
    throw new AttemptFailure(classifyFailure(raw, scope.state()));
  }
  // The SDK returns silently on an abort or a timeout, so those are checked before the stream counts as ended (S9, S11).
  scope.disarm();
  const state = scope.state();
  if (state.callerAborted || state.timedOut || !scope.sawChunk) {
    throw new AttemptFailure(classifyFailure(undefined, state));
  }
  yield* assembler.finish();
}

// One model-list attempt. Throws AttemptFailure when it fails.
async function listOnce(
  client: OpenAI,
  scope: AttemptScope,
): Promise<string[]> {
  try {
    scope.arm();
    const page = await client.models.list({
      signal: scope.signal,
      timeout: scope.limitMs,
      maxRetries: 0,
    });
    scope.disarm();
    const state = scope.state();
    if (state.callerAborted || state.timedOut || !Array.isArray(page.data)) {
      throw new AttemptFailure(classifyFailure(undefined, state));
    }
    return page.data.map((model) => model.id);
  } catch (raw) {
    if (raw instanceof AttemptFailure) {
      throw raw;
    }
    throw new AttemptFailure(classifyFailure(raw, scope.state()));
  }
}

interface PartialCall {
  id?: string;
  name?: string;
  arguments: string;
}

// Assembles the stream: text deltas out at once, tool-call fragments by index (never parsed), and the
// tail (tool calls in index order, usage, finish) at the end.
class ChunkAssembler {
  private readonly calls = new Map<number, PartialCall>();
  private usage: Usage | undefined;
  private finishReason: FinishReason | undefined;

  push(chunk: OpenAI.Chat.Completions.ChatCompletionChunk): StreamEvent[] {
    if (chunk.usage) {
      this.usage = {
        promptTokens: chunk.usage.prompt_tokens,
        completionTokens: chunk.usage.completion_tokens,
        totalTokens: chunk.usage.total_tokens,
      };
    }
    const choice:
      OpenAI.Chat.Completions.ChatCompletionChunk.Choice | undefined =
      chunk.choices[0];
    if (choice === undefined) {
      return [];
    }
    const events: StreamEvent[] = [];
    const content = choice.delta?.content;
    if (typeof content === 'string' && content !== '') {
      events.push({ type: 'text-delta', text: content });
    }
    for (const fragment of choice.delta?.tool_calls ?? []) {
      this.addFragment(fragment);
    }
    if (choice.finish_reason) {
      this.finishReason = mapFinishReason(choice.finish_reason);
    }
    return events;
  }

  finish(): StreamEvent[] {
    const events: StreamEvent[] = [];
    const indexes = [...this.calls.keys()].sort((a, b) => a - b);
    for (const index of indexes) {
      const call = this.calls.get(index);
      if (!call?.name) {
        throw providerError('PROVIDER_BAD_RESPONSE');
      }
      events.push({
        type: 'tool-call',
        id: call.id ?? `call_mock_${index}`,
        name: call.name,
        arguments: call.arguments,
      });
    }
    if (this.usage) {
      events.push({ type: 'usage', ...this.usage });
    }
    events.push({ type: 'finish', reason: this.finishReason ?? 'stop' });
    return events;
  }

  private addFragment(fragment: ChunkFragment): void {
    // A fragment whose type is present and is not "function" is ignored (S10).
    const type: unknown = fragment.type;
    if (type !== undefined && type !== 'function') {
      return;
    }
    const index = typeof fragment.index === 'number' ? fragment.index : 0;
    const call = this.calls.get(index) ?? { arguments: '' };
    if (fragment.id) {
      call.id = fragment.id;
    }
    if (fragment.function?.name) {
      call.name = fragment.function.name;
    }
    if (fragment.function?.arguments) {
      call.arguments += fragment.function.arguments;
    }
    this.calls.set(index, call);
  }
}

// S9: "stop" and anything unknown map to stop; tool_calls and function_call to tool-calls.
function mapFinishReason(reason: string): FinishReason {
  if (reason === 'tool_calls' || reason === 'function_call') {
    return 'tool-calls';
  }
  if (reason === 'length') {
    return 'length';
  }
  return 'stop';
}

// Waits for the given time. A caller's abort ends the wait with PROVIDER_ABORTED. The wait does not count against timeout.
function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(providerError('PROVIDER_ABORTED'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(providerError('PROVIDER_ABORTED'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
