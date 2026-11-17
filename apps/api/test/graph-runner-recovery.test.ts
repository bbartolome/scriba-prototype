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
import { createTestApp, type TestApp } from './create-test-app';
import { sessionCookie } from './guard-request';
import {
  SCENARIO,
  STATIC_ROOT,
  getRun,
  openRunHarness,
  postRun,
  slowFirstSteps,
  type RunHarness,
} from './graph-runner-run.kit';
import { prepareOutputs } from './graph-runner-output.kit';
import { recordsOf } from './providers-client.kit';

// The state of the current run of an app, or null before any run.
async function currentOf(
  app: TestApp,
  cookie: string,
): Promise<RunState | null> {
  const reply = await getRun(app, cookie, RUN_CURRENT_ROUTE);
  return currentRunSchema.parse(JSON.parse(reply.body)).run;
}

// Polls the current run of an app until it has ended. Fails after 10 s.
async function endedOf(app: TestApp, cookie: string): Promise<RunState> {
  const deadline = Date.now() + 10000;
  for (;;) {
    const run = await currentOf(app, cookie);
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

it('run logs, C2: after an API restart mid-run, current-run-state reports that run as stopped with reason interrupted', async () => {
  const harness: RunHarness = await openRunHarness({
    steps: slowFirstSteps(60000),
    prepare: prepareOutputs,
  });
  let second: TestApp | undefined;
  try {
    // Step 1 and 2: a run whose first model call is held.
    const start = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: 'file-out',
      inputs: { in1: { kind: 'file', ref: 'drafts/chapter.md' } },
    });
    expect(start.status).toBe(200);
    const { runId } = runStartResultSchema.parse(JSON.parse(start.body));
    const deadline = Date.now() + 10000;
    while ((await recordsOf(harness.mock, SCENARIO)).length !== 1) {
      if (Date.now() > deadline)
        throw new Error('The model call did not start.');
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    // Step 3: the log so far has the start and a running line, and no end.
    const before = logOf(harness.library, runId);
    expect(before[0]).toMatchObject({ type: 'run-started', runId });
    expect(before).toContainEqual(
      expect.objectContaining({
        type: 'node-status',
        nodeId: 'n1',
        status: 'running',
      }),
    );
    expect(before.some((entry) => entry.type === 'run-ended')).toBe(false);

    // Step 4: the API stops mid-run.
    await harness.app.close();

    // Step 5: a second API boots on the same library; book is still the active project.
    second = await createTestApp({
      libraryDir: harness.library,
      staticRoot: STATIC_ROOT,
    });
    const cookie = await sessionCookie(second, harness.library);
    const reply = await getRun(second, cookie, RUN_CURRENT_ROUTE);
    expect(reply.status).toBe(200);
    const run = currentRunSchema.parse(JSON.parse(reply.body)).run;
    expect(run).not.toBeNull();
    if (run === null) return;
    expect(run).toMatchObject({
      runId,
      status: 'stopped',
      reason: 'interrupted',
      nodes: {
        in1: { status: 'done' },
        n1: { status: 'stopped' },
        out1: { status: 'stopped' },
      },
      inputs: { in1: { kind: 'file', ref: 'drafts/chapter.md' } },
    });
    expect(run.endedAt).toBeDefined();

    // Step 6: the log ends with one repaired end line, after the repair lines of the two nodes.
    const after = logOf(harness.library, runId);
    const ends = after.filter((entry) => entry.type === 'run-ended');
    expect(ends).toHaveLength(1);
    expect(after[after.length - 1]).toMatchObject({
      type: 'run-ended',
      status: 'stopped',
      reason: 'interrupted',
    });
    const endAt = after.length - 1;
    for (const nodeId of ['n1', 'out1']) {
      const repairAt = after.findIndex(
        (entry) =>
          entry.type === 'node-status' &&
          entry.nodeId === nodeId &&
          entry.status === 'stopped',
      );
      expect(repairAt).toBeGreaterThan(-1);
      expect(repairAt).toBeLessThan(endAt);
    }

    // Step 7: the recovered run does not block a new run.
    const next = await postRun(second, cookie, RUNS_ROUTE, {
      graphId: 'file-out',
      inputs: { in1: { kind: 'file', ref: 'drafts/chapter.md' } },
    });
    expect(next.status).toBe(200);
    const nextRun = await endedOf(second, cookie);
    expect(nextRun.status).toBe('done');
  } finally {
    try {
      await second?.close();
    } finally {
      await harness.close();
    }
  }
});
