import type {
  CollectedStream,
  FinishReason,
  StreamEvent,
  ToolCall,
  Usage,
} from './types';

// Gathers a stream into the text, the tool calls, the finish reason and the usage, if reported.
export async function collectStream(
  events: AsyncIterable<StreamEvent>,
): Promise<CollectedStream> {
  let text = '';
  const toolCalls: ToolCall[] = [];
  let finishReason: FinishReason = 'stop';
  let usage: Usage | undefined;
  for await (const event of events) {
    switch (event.type) {
      case 'text-delta':
        text += event.text;
        break;
      case 'tool-call':
        toolCalls.push({
          id: event.id,
          name: event.name,
          arguments: event.arguments,
        });
        break;
      case 'usage':
        usage = {
          promptTokens: event.promptTokens,
          completionTokens: event.completionTokens,
          totalTokens: event.totalTokens,
        };
        break;
      case 'finish':
        finishReason = event.reason;
        break;
    }
  }
  return usage
    ? { text, toolCalls, finishReason, usage }
    : { text, toolCalls, finishReason };
}
