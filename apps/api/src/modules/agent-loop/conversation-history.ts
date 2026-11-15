import type { ChatMessage, ToolCall } from '../providers/providers.module';
import { SHORTENED_TEXT_LIMIT, cutText } from './transcript-entries';
import type { TranscriptCall, TranscriptRun } from './transcript-reader';

type ToolMessage = Extract<ChatMessage, { role: 'tool' }>;

function isToolMessage(message: ChatMessage): message is ToolMessage {
  return message.role === 'tool';
}

// The text a call's answer gives the model: the model text of a result, or the message of an error (D10).
function answerTextOf(call: TranscriptCall): string {
  const answer = call.answer;
  if (answer === undefined) return '';
  return answer.kind === 'result' ? answer.modelText : answer.message;
}

// The model messages of the finished turns, oldest first (D10). Each run gives its intent, then each step in order: the
// step's text and its calls, then one tool message per answered call. A step with neither adds nothing. This reproduces
// what the live loop sent, plus the final answer, which the live loop never pushes because the run ends.
export function replayTurns(runs: TranscriptRun[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const run of runs) {
    messages.push({ role: 'user', content: run.intent });
    for (const step of run.steps) {
      const answered = step.calls.filter((call) => call.answer !== undefined);
      if (step.text === '' && answered.length === 0) continue;
      if (answered.length === 0) {
        messages.push({ role: 'assistant', content: step.text });
        continue;
      }
      const toolCalls: ToolCall[] = answered.map((call) => ({
        id: call.callId,
        name: call.name,
        arguments: call.rawArguments,
      }));
      messages.push({ role: 'assistant', content: step.text, toolCalls });
      for (const call of answered) {
        messages.push({
          role: 'tool',
          toolCallId: call.callId,
          content: answerTextOf(call),
        });
      }
    }
  }
  return messages;
}

// The size of one message in tokens, estimated as a quarter of its characters: its content and its tool calls'
// raw arguments (D11, A3). The repository has no tokenizer, so this is a heuristic.
function estimateOf(message: ChatMessage): number {
  let characters = 0;
  if (message.role === 'assistant') {
    characters += message.content?.length ?? 0;
    for (const call of message.toolCalls ?? []) {
      characters += call.arguments.length;
    }
  } else {
    characters += message.content.length;
  }
  return Math.ceil(characters / 4);
}

// The estimated size of a list of messages in tokens (D11).
export function estimateTokens(messages: ChatMessage[]): number {
  return messages.reduce((sum, message) => sum + estimateOf(message), 0);
}

// Fits the history to a budget (D11). While the estimate is over the budget, the oldest tool message that is longer
// than SHORTENED_TEXT_LIMIT and not yet shortened is shortened; when none is left, the oldest turn is dropped (its user
// message and everything up to the next user message). The history may end up empty. The system prompt, the project
// summary and the current intent are not in the history list, so they are never dropped.
export function trimHistory(
  history: ChatMessage[],
  contextSize: number,
): ChatMessage[] {
  let messages = [...history];
  const shortened = new Set<ChatMessage>();
  while (messages.length > 0 && estimateTokens(messages) > contextSize) {
    const index = messages.findIndex(
      (message) =>
        isToolMessage(message) &&
        !shortened.has(message) &&
        message.content.length > SHORTENED_TEXT_LIMIT,
    );
    if (index !== -1) {
      const tool = messages[index] as ToolMessage;
      const next: ToolMessage = {
        role: 'tool',
        toolCallId: tool.toolCallId,
        content: cutText(tool.content, SHORTENED_TEXT_LIMIT, 'shortened'),
      };
      shortened.add(next);
      messages[index] = next;
      continue;
    }
    const nextTurn = messages.findIndex(
      (message, position) => position > 0 && message.role === 'user',
    );
    messages = nextTurn === -1 ? [] : messages.slice(nextTurn);
  }
  return messages;
}
