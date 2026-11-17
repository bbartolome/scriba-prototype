import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  RUN_CURRENT_ROUTE,
  RUNS_ROUTE,
  currentRunSchema,
  runLogEntrySchema,
  runStartResultSchema,
  type RunLogEntry,
  type RunState,
} from '@bbartolome/scriba-contracts/graph-runner';
import {
  OK_STEPS,
  SCENARIO,
  getRun,
  openRunHarness,
  postRun,
  type RunHarness,
} from './graph-runner-run.kit';
import { CHAPTER_ORIGINAL, prepareOutputs } from './graph-runner-output.kit';
import { recordsOf } from './providers-client.kit';

// The state of the current run once it has ended. Fails after 10 s, so that a run that never ends does not hang.
async function endedRun(harness: RunHarness): Promise<RunState> {
  const deadline = Date.now() + 10000;
  for (;;) {
    const reply = await getRun(harness.app, harness.cookie, RUN_CURRENT_ROUTE);
    const run = currentRunSchema.parse(JSON.parse(reply.body)).run;
    if (run !== null && run.status !== 'running') return run;
    if (Date.now() > deadline) throw new Error('The run did not end.');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

// The entries of one run's log, read from disk. Every non-empty line must parse against the contract.
function logOf(library: string, runId: string): RunLogEntry[] {
  const path = join(library, 'book', 'logs', 'recipe-runs', `${runId}.jsonl`);
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => runLogEntrySchema.parse(JSON.parse(line)));
}

// The statuses of one node, in the order of its node-status lines.
function statusesOf(entries: RunLogEntry[], nodeId: string): string[] {
  return entries.flatMap((entry) =>
    entry.type === 'node-status' && entry.nodeId === nodeId
      ? [entry.status]
      : [],
  );
}

// The position of the first line that matches.
function indexOfLine(
  entries: RunLogEntry[],
  predicate: (entry: RunLogEntry) => boolean,
): number {
  return entries.findIndex(predicate);
}

it('run logs, C1: after a run, the log holds start, per-node, tool-call, pending-change and end entries that parse against the contract', async () => {
  const harness = await openRunHarness({
    steps: OK_STEPS,
    prepare: prepareOutputs,
  });
  try {
    // Part (a): a run with a file input, that ends done.
    const start = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: 'file-out',
      inputs: { in1: { kind: 'file', ref: 'drafts/chapter.md' } },
    });
    expect(start.status).toBe(200);
    const { runId } = runStartResultSchema.parse(JSON.parse(start.body));

    const run = await endedRun(harness);
    expect(run.status).toBe('done');
    expect(run.runId).toBe(runId);
    const entries = logOf(harness.library, runId);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) expect(entry.runId).toBe(runId);
    expect(entries.some((entry) => 'result' in entry)).toBe(false);

    const hash = `sha256:${createHash('sha256')
      .update(CHAPTER_ORIGINAL, 'utf8')
      .digest('hex')}`;
    expect(entries[0]).toMatchObject({
      type: 'run-started',
      graphId: 'file-out',
      inputs: { in1: { kind: 'file', ref: 'drafts/chapter.md', hash } },
    });
    expect('target' in entries[0]).toBe(false);
    expect(entries[entries.length - 1]).toMatchObject({
      type: 'run-ended',
      status: 'done',
    });
    expect('reason' in entries[entries.length - 1]).toBe(false);

    for (const nodeId of ['in1', 'n1', 'out1']) {
      expect(statusesOf(entries, nodeId)).toEqual([
        'queued',
        'running',
        'done',
      ]);
    }

    const toolCalls = entries.filter((entry) => entry.type === 'tool-call');
    expect(toolCalls).toMatchObject([
      { nodeId: 'n1', output: { content: 'ok' }, sourcesUsed: [] },
    ]);
    const toolAt = indexOfLine(entries, (entry) => entry.type === 'tool-call');
    expect(toolAt).toBeLessThan(
      indexOfLine(
        entries,
        (entry) =>
          entry.type === 'node-status' &&
          entry.nodeId === 'n1' &&
          entry.status === 'done',
      ),
    );

    const changes = entries.filter((entry) => entry.type === 'pending-change');
    expect(changes).toMatchObject([
      {
        nodeId: 'out1',
        path: 'drafts/chapter.md',
        pendingChangeId: run.pendingChangeIds[0],
      },
    ]);
    expect(changes).toHaveLength(1);
    const changeAt = indexOfLine(
      entries,
      (entry) => entry.type === 'pending-change',
    );
    expect(changeAt).toBeLessThan(
      indexOfLine(
        entries,
        (entry) =>
          entry.type === 'node-status' &&
          entry.nodeId === 'out1' &&
          entry.status === 'done',
      ),
    );
    expect(await recordsOf(harness.mock, SCENARIO)).toHaveLength(1);

    // Part (b): a run that ends with an error at its output node.
    const failing = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: 'graph-out',
      inputs: { in1: { kind: 'text', text: 'Ada' } },
    });
    expect(failing.status).toBe(200);
    const failingId = runStartResultSchema.parse(
      JSON.parse(failing.body),
    ).runId;
    const failed = await endedRun(harness);
    expect(failed.status).toBe('error');

    const errorEntries = logOf(harness.library, failingId);
    const errorLines = errorEntries.filter((entry) => entry.type === 'error');
    expect(errorLines).toMatchObject([
      { nodeId: 'out1', code: 'PROJECT_VALIDATION_FAILED' },
    ]);
    expect(errorLines).toHaveLength(1);
    const errorLine = errorLines[0];
    expect(errorLine.type === 'error' && errorLine.message).toMatch(/\S/);
    expect(errorEntries).toContainEqual(
      expect.objectContaining({
        type: 'node-status',
        nodeId: 'out1',
        status: 'error',
        error: expect.objectContaining({
          code: 'PROJECT_VALIDATION_FAILED',
        }),
      }),
    );
    expect(errorEntries[errorEntries.length - 1]).toMatchObject({
      type: 'run-ended',
      status: 'error',
    });
  } finally {
    await harness.close();
  }
});
