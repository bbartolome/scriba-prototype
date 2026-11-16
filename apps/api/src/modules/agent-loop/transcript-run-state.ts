import {
  AGENT_DEFAULT_STEP_CAP,
  type AgentRunState,
} from '@bbartolome/scriba-contracts/agent-loop';
import type { TranscriptRun } from './transcript-reader';

// The state of a run rebuilt from its transcript (AGL-05 D4). Every such state is ended: a run that is still running
// is held in memory, and a restart leaves no such run. A run without a run-end line reports `stopped`.
export function runStateOfTranscript(run: TranscriptRun): AgentRunState {
  return {
    runId: run.runId,
    conversationId: run.conversationId,
    status: 'ended',
    step: run.steps.reduce((largest, step) => Math.max(largest, step.step), 0),
    cap: run.cap ?? AGENT_DEFAULT_STEP_CAP,
    assistantText: run.assistantText,
    cards: run.cards,
    groundingResults: run.groundingResults,
    pendingChangeIds: run.pendingChangeIds,
    lastSeq: run.lastSeq,
    reason: run.reason ?? 'stopped',
  };
}
