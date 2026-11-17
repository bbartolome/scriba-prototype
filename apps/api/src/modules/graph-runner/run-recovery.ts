import type {
  InputValue,
  NodeResult,
  NodeRunState,
  NodeRunStatus,
  RunError,
  RunLogEntry,
  RunState,
  RunStatus,
} from '@bbartolome/scriba-contracts/graph-runner';

type RunStartedEntry = Extract<RunLogEntry, { type: 'run-started' }>;
type RunEndedEntry = Extract<RunLogEntry, { type: 'run-ended' }>;

// The rebuilt state of a run and the repair lines its log still needs (GRR-07 S14, S15).
export interface RecoveredRun {
  state: RunState;
  repairs: RunLogEntry[];
}

// The most recent run among the parsed logs: the latest run-started time, the file path breaking a tie (GRR-07 S13).
// A log with no run-started line is not a run.
export function latestRunOf(
  runs: readonly { path: string; entries: readonly RunLogEntry[] }[],
): readonly RunLogEntry[] | undefined {
  let best:
    { path: string; at: string; entries: readonly RunLogEntry[] } | undefined;
  for (const run of runs) {
    const started = run.entries.find(
      (entry): entry is RunStartedEntry => entry.type === 'run-started',
    );
    if (started === undefined) continue;
    if (
      best === undefined ||
      started.at > best.at ||
      (started.at === best.at && run.path > best.path)
    ) {
      best = { path: run.path, at: started.at, entries: run.entries };
    }
  }
  return best?.entries;
}

// The rebuilt state of one run from its log lines (GRR-07 S14). A run with no run-ended line is stopped as
// interrupted at `at`: its queued and running nodes become stopped, and the repair lines are returned (S15).
// Returns undefined when the lines hold no run-started line.
export function recoveredRunOf(
  entries: readonly RunLogEntry[],
  at: string,
): RecoveredRun | undefined {
  let started: RunStartedEntry | undefined;
  let ended: RunEndedEntry | undefined;
  const order: string[] = [];
  const lastStatus = new Map<
    string,
    { status: NodeRunStatus; error?: RunError }
  >();
  const results = new Map<string, NodeResult>();
  const pendingChangeIds: string[] = [];
  for (const entry of entries) {
    switch (entry.type) {
      case 'run-started':
        started ??= entry;
        break;
      case 'run-ended':
        ended = entry;
        break;
      case 'node-status':
        if (!lastStatus.has(entry.nodeId)) order.push(entry.nodeId);
        lastStatus.set(entry.nodeId, {
          status: entry.status,
          ...(entry.error === undefined ? {} : { error: entry.error }),
        });
        break;
      case 'tool-call':
        results.set(entry.nodeId, {
          output: entry.output,
          sourcesUsed: entry.sourcesUsed,
        });
        break;
      case 'pending-change':
        results.set(entry.nodeId, {
          pendingChangeId: entry.pendingChangeId,
          path: entry.path,
        });
        pendingChangeIds.push(entry.pendingChangeId);
        break;
      default:
        break;
    }
  }
  if (started === undefined) return undefined;

  const inputs: Record<string, InputValue> = {};
  for (const [id, input] of Object.entries(started.inputs)) {
    inputs[id] =
      input.kind === 'file' ? { kind: 'file', ref: input.ref } : input;
  }
  const nodes: Record<string, NodeRunState> = {};
  for (const id of order) {
    const line = lastStatus.get(id);
    if (line === undefined) continue;
    const result = line.status === 'done' ? results.get(id) : undefined;
    nodes[id] = {
      status: line.status,
      ...(line.error === undefined ? {} : { error: line.error }),
      ...(result === undefined ? {} : { result }),
    };
  }

  const state: RunState = {
    runId: started.runId,
    graphId: started.graphId,
    ...(started.target === undefined ? {} : { target: started.target }),
    status: 'running',
    startedAt: started.at,
    inputs,
    targets: {},
    nodes,
    pendingChangeIds,
  };
  const repairs: RunLogEntry[] = [];
  if (ended !== undefined) {
    setEnded(state, ended.status, ended.at, ended.reason);
    return { state, repairs };
  }

  for (const id of order) {
    const status = nodes[id]?.status;
    if (status !== 'queued' && status !== 'running') continue;
    nodes[id] = { status: 'stopped' };
    repairs.push({
      type: 'node-status',
      at,
      runId: started.runId,
      nodeId: id,
      status: 'stopped',
    });
  }
  setEnded(state, 'stopped', at, 'interrupted');
  repairs.push({
    type: 'run-ended',
    at,
    runId: started.runId,
    status: 'stopped',
    reason: 'interrupted',
  });
  return { state, repairs };
}

// Sets the end of a run on its state.
function setEnded(
  state: RunState,
  status: RunStatus,
  endedAt: string,
  reason: RunEndedEntry['reason'],
): void {
  state.status = status;
  state.endedAt = endedAt;
  if (reason !== undefined) state.reason = reason;
}
