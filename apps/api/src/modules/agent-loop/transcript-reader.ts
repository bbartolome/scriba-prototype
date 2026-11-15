import { Injectable } from '@nestjs/common';
import {
  AGENT_TRANSCRIPT_PATH_PATTERN,
  transcriptEntrySchema,
  type AgentCard,
  type AgentRunEndReason,
  type AgentToolFamily,
  type AgentTranscriptKind,
  type ConversationSummary,
  type ConversationTurn,
} from '@bbartolome/scriba-contracts/agent-loop';
import {
  PROJECT_ERROR_CODES,
  type FileEntry,
} from '@bbartolome/scriba-contracts/project-store';
import { ModuleError } from '../platform/platform.module';
import { FilesService } from '../project-store/project-store.module';
import { transcriptPayloadSchemas } from './transcript-entries';

const TRANSCRIPT_FOLDER = 'logs/agent-runs';

// What one call did, as its transcript lines say. A call that was never dispatched has no answer (D4).
export interface TranscriptCall {
  callId: string;
  name: string;
  rawArguments: string;
  answer?:
    { kind: 'result'; modelText: string } | { kind: 'error'; message: string };
}

// One model call of a run: the text it produced and the calls it asked for.
export interface TranscriptStep {
  step: number;
  text: string;
  calls: TranscriptCall[];
}

// One run, read from its transcript (D13, D14). A run without a run-end line is unfinished: it is kept with
// `finished: false`, and the history leaves it out.
export interface TranscriptRun {
  runId: string;
  conversationId: string;
  intent: string;
  startedAt: string; // the `at` of the intent line
  file: string; // project-relative
  finished: boolean;
  reason?: AgentRunEndReason;
  endedAt?: string; // the `at` of the run-end line
  assistantText: string;
  cards: AgentCard[];
  steps: TranscriptStep[];
  lastSeq: number; // the largest seq of the file's lines (AGL-05)
  cap?: number; // the cap of the last step line (AGL-05)
  pendingChangeIds: string[]; // from the run-end line; empty without one (AGL-05)
}

export type FinishedTranscriptRun = TranscriptRun & {
  reason: AgentRunEndReason;
  endedAt: string;
};

interface ParsedLine {
  at: string;
  runId: string;
  conversationId: string;
  seq: number;
  kind: AgentTranscriptKind;
  data: unknown;
}

// Runs the order of D14: the intent line's time, then the file name.
function byRunOrder(a: TranscriptRun, b: TranscriptRun): number {
  if (a.startedAt !== b.startedAt) return a.startedAt < b.startedAt ? -1 : 1;
  return a.file < b.file ? -1 : a.file > b.file ? 1 : 0;
}

function isFinished(run: TranscriptRun): run is FinishedTranscriptRun {
  return run.finished && run.reason !== undefined && run.endedAt !== undefined;
}

// The lines that parse as contract entries with a valid payload. A partial or damaged line is skipped (D13).
function parseLines(content: string): ParsedLine[] {
  const lines: ParsedLine[] = [];
  for (const raw of content.split('\n')) {
    if (raw.trim() === '') continue;
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      continue;
    }
    const entry = transcriptEntrySchema.safeParse(json);
    if (!entry.success) continue;
    const schema = transcriptPayloadSchemas[entry.data.kind];
    if (schema !== undefined && !schema.safeParse(entry.data.data).success) {
      continue;
    }
    lines.push(entry.data);
  }
  return lines;
}

// Builds one run from its lines (D13). The cards are built the way the live loop builds them.
function runOf(lines: ParsedLine[], file: string): TranscriptRun | undefined {
  const intent = lines.find((line) => line.kind === 'intent');
  if (intent === undefined) return undefined;
  const run: TranscriptRun = {
    runId: intent.runId,
    conversationId: intent.conversationId,
    intent: (intent.data as { intent: string }).intent,
    startedAt: intent.at,
    file,
    finished: false,
    assistantText: '',
    cards: [],
    steps: [],
    lastSeq: 0,
    pendingChangeIds: [],
  };
  const steps = new Map<number, TranscriptStep>();
  const stepOf = (number: number): TranscriptStep => {
    let step = steps.get(number);
    if (step === undefined) {
      step = { step: number, text: '', calls: [] };
      steps.set(number, step);
    }
    return step;
  };
  const calls = new Map<string, TranscriptCall>();
  const cards = new Map<string, AgentCard>();

  for (const line of lines) {
    const data = line.data as Record<string, unknown>;
    run.lastSeq = Math.max(run.lastSeq, line.seq);
    switch (line.kind) {
      case 'step':
        stepOf(data.step as number);
        run.cap = data.cap as number;
        break;
      case 'assistant-text':
        stepOf(data.step as number).text += data.text as string;
        run.assistantText += data.text as string;
        break;
      case 'tool-call': {
        const call: TranscriptCall = {
          callId: data.callId as string,
          name: data.name as string,
          rawArguments: data.rawArguments as string,
        };
        stepOf(data.step as number).calls.push(call);
        calls.set(call.callId, call);
        if (data.family !== undefined) {
          const card: AgentCard = {
            callId: call.callId,
            name: call.name,
            family: data.family as AgentToolFamily,
            status: 'running',
            arguments: data.arguments,
            valid: data.valid as boolean,
          };
          cards.set(call.callId, card);
          run.cards.push(card);
        }
        break;
      }
      case 'tool-result': {
        const call = calls.get(data.callId as string);
        if (call !== undefined) {
          call.answer = {
            kind: 'result',
            modelText: data.modelText as string,
          };
        }
        const card = cards.get(data.callId as string);
        if (card !== undefined) {
          card.status = 'done';
          card.summary = data.summary as string;
          card.output = data.output;
        }
        break;
      }
      case 'tool-error': {
        const call = calls.get(data.callId as string);
        if (call !== undefined) {
          call.answer = { kind: 'error', message: data.message as string };
        }
        const card = cards.get(data.callId as string);
        if (card !== undefined) {
          card.status = 'error';
          card.error = {
            message: data.message as string,
            attempt: data.attempt as number,
            ...(data.withdrawn === true ? { withdrawn: true } : {}),
          };
        }
        break;
      }
      case 'run-end':
        if (!run.finished) {
          run.finished = true;
          run.reason = data.reason as AgentRunEndReason;
          run.endedAt = line.at;
          run.pendingChangeIds = data.pendingChangeIds as string[];
        }
        break;
      default:
        // grounding and pending-change lines are kept out of the turns (AGL-16, AGL-12).
        break;
    }
  }
  run.steps = [...steps.values()].sort((a, b) => a.step - b.step);
  return run;
}

// The transcripts of the agent runs of a project, read from logs/agent-runs (D13). It is the one reader: the history
// routes and the run state (AGL-05) use it. It reads only; it writes nothing.
@Injectable()
export class AgentTranscriptsService {
  constructor(private readonly files: FilesService) {}

  // Every readable run of the project, in run order. A folder that does not exist has no runs.
  runs(projectId: string): TranscriptRun[] {
    const runs: TranscriptRun[] = [];
    for (const path of this.transcriptPaths(projectId)) {
      const run = this.readRun(projectId, path);
      if (run !== undefined) runs.push(run);
    }
    return runs.sort(byRunOrder);
  }

  // The finished runs of one conversation, in run order, without the run excludeRunId (D12, D17).
  finishedRuns(
    projectId: string,
    conversationId: string,
    excludeRunId?: string,
  ): FinishedTranscriptRun[] {
    return this.runs(projectId).filter(
      (run): run is FinishedTranscriptRun =>
        isFinished(run) &&
        run.conversationId === conversationId &&
        run.runId !== excludeRunId,
    );
  }

  // The conversations with at least one finished run, newest first (D14).
  conversations(projectId: string): ConversationSummary[] {
    const groups = new Map<string, TranscriptRun[]>();
    for (const run of this.runs(projectId)) {
      const group = groups.get(run.conversationId) ?? [];
      group.push(run);
      groups.set(run.conversationId, group);
    }
    const summaries: ConversationSummary[] = [];
    for (const [conversationId, group] of groups) {
      const finished = group.filter(isFinished);
      if (finished.length === 0) continue;
      summaries.push({
        conversationId,
        intent: group[0].intent,
        updatedAt: finished
          .map((run) => run.endedAt)
          .sort()
          .reverse()[0],
        turnCount: finished.length,
      });
    }
    return summaries.sort((a, b) =>
      a.updatedAt === b.updatedAt
        ? a.conversationId.localeCompare(b.conversationId)
        : a.updatedAt < b.updatedAt
          ? 1
          : -1,
    );
  }

  // The finished turns of one conversation, oldest first (D14).
  turns(projectId: string, conversationId: string): ConversationTurn[] {
    return this.finishedRuns(projectId, conversationId).map((run) => ({
      runId: run.runId,
      intent: run.intent,
      assistantText: run.assistantText,
      cards: run.cards,
      endedAt: run.endedAt,
      reason: run.reason,
    }));
  }

  // The project-relative paths of the transcript files. A missing folder, or a path that is not a folder, has none.
  private transcriptPaths(projectId: string): string[] {
    let entries: FileEntry[];
    try {
      entries = this.files.list(projectId, { path: TRANSCRIPT_FOLDER }).entries;
    } catch (error) {
      if (
        error instanceof ModuleError &&
        error.code === PROJECT_ERROR_CODES.NOT_FOUND
      ) {
        return [];
      }
      throw error;
    }
    return entries
      .filter(
        (entry) =>
          entry.kind === 'file' &&
          AGENT_TRANSCRIPT_PATH_PATTERN.test(entry.path),
      )
      .map((entry) => entry.path);
  }

  // One file read as a run. A file the read refuses (too large, not text, gone) is skipped.
  private readRun(projectId: string, path: string): TranscriptRun | undefined {
    let content: string;
    try {
      content = this.files.read(projectId, path).content;
    } catch (error) {
      if (error instanceof ModuleError) return undefined;
      throw error;
    }
    return runOf(parseLines(content), path);
  }
}
