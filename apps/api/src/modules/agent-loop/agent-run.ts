import { randomUUID } from 'node:crypto';
import type {
  AgentRunEndReason,
  AgentRunState,
  AgentToolFamily,
} from '@bbartolome/scriba-contracts/agent-loop';
import { ModuleError, type EventsPublisher } from '../platform/platform.module';
import {
  streamChat,
  type ChatMessage,
  type ChatRequest,
  type ModelResolver,
  type ResolvedModel,
  type ToolCall,
} from '../providers/providers.module';
import { AGENT_SYSTEM_PROMPT } from './agent-prompt';
import { replayTurns, trimHistory } from './conversation-history';
import type { AgentTranscriptsService } from './transcript-reader';
import type { TranscriptWriter } from './transcript-writer';
import type { ToolRun } from './tools/tool-run';

// The message of a run that failed for a reason other than a module's own error (D3).
const FAILED_MESSAGE = 'The agent run failed.';

// The result of resolve when the run's abort wins the race (D7).
const ABORTED = Symbol('aborted');

export interface AgentRunInit {
  runId: string;
  conversationId: string;
  projectId: string;
  intent: string;
  cap: number;
  enabledFamilies: AgentToolFamily[];
  tools: ToolRun;
  // The run's transcript, from the same call sites as the stream (D4, D5).
  transcript: TranscriptWriter;
}

// What a run takes from the module: the resolver, the event publisher, the project summary, the release of its slot,
// and the transcripts the history is rebuilt from. A run holds no Nest code.
export interface AgentRunDeps {
  resolver: ModelResolver;
  events: EventsPublisher;
  summarize: (projectId: string) => string;
  released: (run: AgentRun) => void;
  transcripts: AgentTranscriptsService;
}

// One model call's reply: the text it streamed and the tool calls it asked for.
interface ModelReply {
  text: string;
  calls: ToolCall[];
}

// The resolve of a run's target, raced against its abort (D7). The listing behind resolve is not cancelled; its
// result is dropped, and its rejection is handled by the race.
function untilAborted<T>(
  work: Promise<T>,
  signal: AbortSignal,
): Promise<T | typeof ABORTED> {
  if (signal.aborted) return Promise.resolve(ABORTED);
  return new Promise((resolve, reject) => {
    const onAbort = (): void => resolve(ABORTED);
    signal.addEventListener('abort', onAbort, { once: true });
    work.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

// The message of a failed run: a module's own message, with its hint when it has one (D3).
function messageOf(error: unknown): string {
  if (!(error instanceof ModuleError)) return FAILED_MESSAGE;
  const hint = hintOf(error.details);
  return hint === undefined ? error.message : `${error.message} ${hint}`;
}

function hintOf(details: unknown): string | undefined {
  if (typeof details !== 'object' || details === null) return undefined;
  const hint = (details as { hint?: unknown }).hint;
  return typeof hint === 'string' ? hint : undefined;
}

// One agent run: its state, its loop, and its single emit (D2, D3, D6 to D9, D13). The registry starts it, stops it and
// reads its state. The loop is the only place events leave a run, and the transcript lines come from the same calls.
export class AgentRun {
  readonly runId: string;
  readonly projectId: string;
  readonly enabledFamilies: AgentToolFamily[];
  readonly state: AgentRunState;
  target: ResolvedModel | undefined;
  private requestedEnd: AgentRunEndReason | undefined;
  private readonly controller = new AbortController();
  private readonly intent: string;
  private readonly tools: ToolRun;
  private readonly deps: AgentRunDeps;
  private readonly transcript: TranscriptWriter;
  // The text of the model call in progress, not yet written to the transcript (D9).
  private stepText = '';
  private intentWritten = false;

  constructor(init: AgentRunInit, deps: AgentRunDeps) {
    this.runId = init.runId;
    this.projectId = init.projectId;
    this.enabledFamilies = init.enabledFamilies;
    this.intent = init.intent;
    this.tools = init.tools;
    this.transcript = init.transcript;
    this.deps = deps;
    this.state = {
      runId: init.runId,
      conversationId: init.conversationId,
      status: 'running',
      step: 0,
      cap: init.cap,
      assistantText: '',
      cards: [],
      groundingResults: [],
      pendingChangeIds: [],
      lastSeq: 0,
    };
  }

  // Publishes run-started (seq 1). Called before the start reply, so the event is never lost to a fast client.
  begin(): void {
    this.emit('run-started', {});
  }

  // Asks the run to end with a reason and aborts its model call and tool call. A run that already has a requested end
  // or has ended is left as it is (D4).
  requestEnd(reason: AgentRunEndReason): void {
    if (this.state.status !== 'running' || this.requestedEnd !== undefined) {
      return;
    }
    this.requestedEnd = reason;
    this.controller.abort();
  }

  // The loop. It never rejects: every failure ends the run with a reason.
  async execute(): Promise<void> {
    try {
      const resolved = await untilAborted(
        this.deps.resolver.resolve({ projectId: this.projectId }),
        this.controller.signal,
      );
      // The key is known from here on, so the transcript can replace it (D4, D7).
      if (resolved !== ABORTED) this.transcript.setKey(resolved.key);
      this.writeIntent();
      if (resolved === ABORTED) return this.finish('stopped');
      this.target = resolved;
      // The finished turns of this conversation, trimmed to the provider's context size (D10, D11, D16). The run's own
      // transcript is unfinished, so it is never among them (D17).
      const history = trimHistory(
        replayTurns(
          this.deps.transcripts.finishedRuns(
            this.projectId,
            this.state.conversationId,
            this.runId,
          ),
        ),
        resolved.contextSize,
      );
      const preamble: ChatMessage[] = [
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
        { role: 'system', content: this.deps.summarize(this.projectId) },
        ...history,
        { role: 'user', content: this.intent },
      ];
      // The run's own assistant and tool messages, in order, after the intent (D10 (5)).
      const turn: ChatMessage[] = [];
      for (;;) {
        if (this.controller.signal.aborted) return this.finish('stopped');
        this.state.step += 1;
        this.writeStep();
        const reply = await this.askModel(resolved, [...preamble, ...turn]);
        if (this.controller.signal.aborted) return this.finish('stopped');
        if (reply.calls.length === 0) return this.finish('completed');
        if (this.state.step >= this.state.cap) {
          this.emit('step-cap-reached', {
            step: this.state.step,
            cap: this.state.cap,
          });
          return this.finish('capped');
        }
        turn.push({
          role: 'assistant',
          content: reply.text,
          toolCalls: reply.calls,
        });
        for (const call of reply.calls) {
          if (this.controller.signal.aborted) return this.finish('stopped');
          turn.push(await this.runCall(call));
        }
      }
    } catch (error) {
      this.finish('error', messageOf(error));
    }
  }

  // One model call. Text deltas are published as they arrive; tool calls are collected with the loop's own ids (D8).
  // The call's text is written to the transcript when the call ends (D4).
  private async askModel(
    target: ResolvedModel,
    messages: ChatMessage[],
  ): Promise<ModelReply> {
    const request: ChatRequest = {
      messages,
      tools: this.tools.schemas(),
      signal: this.controller.signal,
    };
    let text = '';
    const calls: ToolCall[] = [];
    this.stepText = '';
    for await (const event of streamChat(target, request)) {
      if (event.type === 'text-delta') {
        text += event.text;
        this.emit('token-delta', { text: event.text });
      } else if (event.type === 'tool-call') {
        calls.push({
          id: randomUUID(),
          name: event.name,
          arguments: event.arguments,
        });
      }
    }
    this.writeStepText();
    return { text, calls };
  }

  // One tool call (D8). An offered name gets its card events; any call is answered to the model. The call's lines are
  // written after its events (D4).
  private async runCall(call: ToolCall): Promise<ChatMessage> {
    const callId = call.id;
    const family = this.tools.familyOf(call.name);
    if (family !== undefined) {
      this.emit('tool-call-started', { callId, name: call.name, family });
    }
    const result = await this.tools.dispatch(
      { callId, name: call.name, arguments: call.arguments },
      this.controller.signal,
    );
    const { outcome } = result;
    if (family !== undefined) {
      this.emit('tool-call-args', {
        callId,
        arguments: result.arguments,
        valid: result.valid,
      });
      if (outcome.kind === 'result') {
        this.emit('tool-call-result', {
          callId,
          summary: outcome.summary,
          output: outcome.output,
        });
      } else {
        this.emit('tool-call-error', {
          callId,
          message: outcome.message,
          attempt: outcome.attempt,
          ...(outcome.withdrawn === true ? { withdrawn: true } : {}),
        });
      }
    }
    this.transcript.append('tool-call', this.state.lastSeq, {
      step: this.state.step,
      callId,
      name: call.name,
      ...(family === undefined ? {} : { family }),
      arguments: result.arguments,
      rawArguments: call.arguments,
      valid: result.valid,
    });
    if (outcome.kind === 'result') {
      this.transcript.append('tool-result', this.state.lastSeq, {
        step: this.state.step,
        callId,
        summary: outcome.summary,
        output: outcome.output,
        modelText: outcome.modelText,
      });
    } else {
      this.transcript.append('tool-error', this.state.lastSeq, {
        step: this.state.step,
        callId,
        message: outcome.message,
        attempt: outcome.attempt,
        ...(outcome.withdrawn === true ? { withdrawn: true } : {}),
      });
    }
    const content =
      outcome.kind === 'result' ? outcome.modelText : outcome.message;
    return { role: 'tool', toolCallId: callId, content };
  }

  // Ends the run: marks it ended, releases its slot, then publishes run-ended (D3), then writes run-end (D4). A
  // requested end wins over the reason the loop reached, because the abort is what the loop saw. The transcript is
  // completed first, so a run that ends mid-call keeps the text it had.
  private finish(reason: AgentRunEndReason, message?: string): void {
    if (this.state.status === 'ended') return;
    this.writeIntent();
    this.writeStepText();
    const ended = this.requestedEnd ?? reason;
    this.state.status = 'ended';
    this.state.reason = ended;
    this.deps.released(this);
    const data = {
      reason: ended,
      pendingChangeIds: [],
      ...(ended === 'error' && message !== undefined ? { message } : {}),
    };
    this.emit('run-ended', data);
    this.transcript.append('run-end', this.state.lastSeq, data);
  }

  // The intent line, once (D4). It is written after the resolve has settled, so the key is known when it is scrubbed.
  private writeIntent(): void {
    if (this.intentWritten) return;
    this.intentWritten = true;
    this.transcript.append('intent', this.state.lastSeq, {
      intent: this.intent,
    });
  }

  // The step line, before each model call (D4).
  private writeStep(): void {
    this.transcript.append('step', this.state.lastSeq, {
      step: this.state.step,
      cap: this.state.cap,
    });
  }

  // The text of the model call, if it produced any; the buffer is then empty (D4, D9).
  private writeStepText(): void {
    if (this.stepText === '') return;
    this.transcript.append('assistant-text', this.state.lastSeq, {
      step: this.state.step,
      text: this.stepText,
    });
    this.stepText = '';
  }

  // The one place an event leaves the loop (D9): it assigns the seq, updates the state, and publishes.
  private emit(type: string, data: Record<string, unknown>): void {
    this.state.lastSeq += 1;
    const seq = this.state.lastSeq;
    this.apply(type, data);
    this.deps.events.publish({
      module: 'agent-loop',
      type,
      data: { runId: this.runId, seq, ...data },
    });
  }

  // The state each event leaves behind: the assistant text and the tool-call cards (D2).
  private apply(type: string, data: Record<string, unknown>): void {
    if (type === 'token-delta') {
      const text = String(data.text);
      this.state.assistantText += text;
      this.stepText += text;
      return;
    }
    if (type === 'tool-call-started') {
      this.state.cards.push({
        callId: String(data.callId),
        name: String(data.name),
        family: data.family as AgentToolFamily,
        status: 'running',
      });
      return;
    }
    const card = this.state.cards.find((item) => item.callId === data.callId);
    if (card === undefined) return;
    if (type === 'tool-call-args') {
      card.arguments = data.arguments;
      card.valid = data.valid as boolean;
    } else if (type === 'tool-call-result') {
      card.status = 'done';
      card.summary = String(data.summary);
      card.output = data.output;
    } else if (type === 'tool-call-error') {
      card.status = 'error';
      card.error = {
        message: String(data.message),
        attempt: Number(data.attempt),
        ...(data.withdrawn === true ? { withdrawn: true } : {}),
      };
    }
  }
}
