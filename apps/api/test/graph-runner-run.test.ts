import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  RUN_CURRENT_ROUTE,
  RUNS_ROUTE,
  currentRunSchema,
  graphRunnerEventSchema,
  runStartResultSchema,
  type GraphRunnerEvent,
} from '@bbartolome/scriba-contracts/graph-runner';
import { type Reply } from './guard-request';
import {
  BAD_RECIPE,
  OK_STEPS,
  SCENARIO,
  getRun,
  openRunHarness,
  postRun,
  slowFirstSteps,
  writeGraphs,
  type RunHarness,
} from './graph-runner-run.kit';
import { putFile } from './project-store-files.kit';
import type { ErrorBody } from './project-store-projects.kit';
import { recordsOf } from './providers-client.kit';
import { LOOPBACK_HOST, observeEvents, type Observer } from './invariant-sweep';
import { dataOf } from './sse';

// The graph-runner events of a stream, up to and including run-ended. Other modules' events are skipped. Fails after
// 10 s, so that a run that never ends does not hang the test.
async function untilRunEnded(stream: Observer): Promise<GraphRunnerEvent[]> {
  const events: GraphRunnerEvent[] = [];
  const deadline = Date.now() + 10000;
  for (;;) {
    for (const block of await stream.take(25)) {
      const raw = JSON.parse(dataOf(block)) as { module?: unknown };
      if (raw.module !== 'graph-runner') continue;
      const event = graphRunnerEventSchema.parse(raw);
      events.push(event);
      if (event.type === 'run-ended') return events;
    }
    if (Date.now() > deadline) throw new Error('The run did not end.');
  }
}

// Opens the event stream before a start, so that no event of the run is missed. The stream is GET /events with the
// loopback Host and the session cookie.
function openEvents(harness: RunHarness): Promise<Observer> {
  return observeEvents(harness.app.baseUrl, LOOPBACK_HOST, harness.cookie);
}

// The body of an error answer, parsed.
function errorOf(reply: Reply): ErrorBody['error'] {
  return (JSON.parse(reply.body) as ErrorBody).error;
}

// The current run of the active project, parsed from the GET answer.
async function currentOf(harness: RunHarness): Promise<Reply> {
  return getRun(harness.app, harness.cookie, RUN_CURRENT_ROUTE);
}

// Resolves when the predicate holds, polling every 25 ms for up to 5 s.
async function pollUntil(predicate: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 5000;
  while (!(await predicate())) {
    if (Date.now() > deadline) throw new Error('The condition did not hold.');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

it('run engine, C1: a three-tool recipe emits node-status events in topological order and ends done', async () => {
  const harness = await openRunHarness({
    steps: OK_STEPS,
    prepare: writeGraphs,
  });
  const stream = await openEvents(harness);
  try {
    const start = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: 'branch',
      inputs: { in1: { kind: 'text', text: 'Ada' } },
    });
    expect(start.status).toBe(200);
    const { runId } = runStartResultSchema.parse(JSON.parse(start.body));

    const events = await untilRunEnded(stream);
    expect(events[0]?.type).toBe('run-started');
    expect(events[0]?.data).toMatchObject({ runId });
    const nodeEvents = events.flatMap((event) =>
      event.type === 'node-status'
        ? [`${event.data.nodeId}:${event.data.status}`]
        : [],
    );
    expect(nodeEvents).toEqual([
      'in1:queued',
      'n3:queued',
      'n1:queued',
      'n2:queued',
      'in1:running',
      'in1:done',
      'n3:running',
      'n3:done',
      'n1:running',
      'n1:done',
      'n2:running',
      'n2:done',
    ]);
    const last = events.at(-1);
    expect(last?.type).toBe('run-ended');
    expect(last?.data).toMatchObject({ runId, status: 'done' });
    expect(await recordsOf(harness.mock, SCENARIO)).toHaveLength(3);
  } finally {
    await stream.close();
    await harness.close();
  }
});

it('run engine, C2: "Run to here" runs only the target and its upstream nodes', async () => {
  const harness = await openRunHarness({
    steps: OK_STEPS,
    prepare: writeGraphs,
  });
  const stream = await openEvents(harness);
  try {
    const start = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: 'chain',
      inputs: { in1: { kind: 'text', text: 'Ada' } },
      target: { nodeId: 'n2' },
    });
    expect(start.status).toBe(200);
    const { runId } = runStartResultSchema.parse(JSON.parse(start.body));

    const events = await untilRunEnded(stream);
    expect(events.at(-1)?.data).toMatchObject({ runId, status: 'done' });
    expect(
      events.some(
        (event) => event.type === 'node-status' && event.data.nodeId === 'n3',
      ),
    ).toBe(false);
    expect(await recordsOf(harness.mock, SCENARIO)).toHaveLength(2);

    const current = await currentOf(harness);
    expect(current.status).toBe(200);
    const { run } = currentRunSchema.parse(JSON.parse(current.body));
    expect(run?.runId).toBe(runId);
    expect(run?.status).toBe('done');
    expect(run?.target).toEqual({ nodeId: 'n2' });
    expect(run?.nodes.in1?.status).toBe('done');
    expect(run?.nodes.n1?.status).toBe('done');
    expect(run?.nodes.n2?.status).toBe('done');
    expect(run?.nodes.n2?.result).toMatchObject({ output: { content: 'ok' } });
    expect(run?.nodes.n3?.status).toBe('idle');
  } finally {
    await stream.close();
    await harness.close();
  }
});

it('run engine, C3: a story graph, a second run and a recipe with blocking errors are refused', async () => {
  const harness = await openRunHarness({
    steps: slowFirstSteps(2000),
    prepare: writeGraphs,
  });
  let stream: Observer | undefined;
  try {
    // (a) A story graph is not runnable.
    const story = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: 'notes',
      inputs: {},
    });
    expect(story.status).toBe(409);
    expect(errorOf(story).code).toBe('GRAPH_VIEW_NOT_RUNNABLE');

    // (b) A recipe with a blocking error (an unknown tool) is refused.
    const bad = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: BAD_RECIPE.id,
      inputs: { in1: { kind: 'text', text: 'Ada' } },
    });
    expect(bad.status).toBe(422);
    expect(errorOf(bad).code).toBe('GRAPH_VALIDATION_FAILED');

    // The refused starts registered no run.
    const none = await currentOf(harness);
    expect(none.status).toBe(200);
    expect(currentRunSchema.parse(JSON.parse(none.body))).toEqual({
      run: null,
    });

    // (c) A second run while one is active is refused.
    stream = await openEvents(harness);
    const first = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: 'chain',
      inputs: { in1: { kind: 'text', text: 'Ada' } },
    });
    expect(first.status).toBe(200);
    const { runId } = runStartResultSchema.parse(JSON.parse(first.body));
    const second = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: 'chain',
      inputs: { in1: { kind: 'text', text: 'Ada' } },
    });
    expect(second.status).toBe(409);
    expect(errorOf(second).code).toBe('GRAPH_RUN_ACTIVE');

    const events = await untilRunEnded(stream);
    expect(events.at(-1)?.data).toMatchObject({ runId });
  } finally {
    await stream?.close();
    await harness.close();
  }
});

it('run engine, C4: a file input is read once at start', async () => {
  const harness = await openRunHarness({
    steps: slowFirstSteps(1000),
    prepare: (library) => {
      writeGraphs(library);
      putFile(library, 'book/notes/source.md', 'ORIGINAL TEXT');
    },
  });
  const sourcePath = join(harness.library, 'book', 'notes', 'source.md');
  const stream = await openEvents(harness);
  try {
    const start = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: 'fan',
      inputs: { in1: { kind: 'file', ref: 'notes/source.md' } },
    });
    expect(start.status).toBe(200);

    // The first request (n1) is recorded while it waits; the host edit lands during the run.
    await pollUntil(
      async () => (await recordsOf(harness.mock, SCENARIO)).length >= 1,
    );
    writeFileSync(sourcePath, 'EDITED TEXT');

    await untilRunEnded(stream);
    const records = await recordsOf(harness.mock, SCENARIO);
    expect(records).toHaveLength(2);
    const [first, second] = records.map((record) =>
      JSON.stringify(record.body),
    );
    expect(first).toContain('ORIGINAL TEXT');
    expect(second).toContain('ORIGINAL TEXT');
    expect(second).not.toContain('EDITED TEXT');
    expect(readFileSync(sourcePath, 'utf8')).toBe('EDITED TEXT');

    const current = await currentOf(harness);
    const { run } = currentRunSchema.parse(JSON.parse(current.body));
    expect(run?.inputs.in1).toEqual({ kind: 'file', ref: 'notes/source.md' });
    expect(JSON.stringify(run)).not.toContain('ORIGINAL TEXT');
  } finally {
    await stream.close();
    await harness.close();
  }
});

it('run engine, C5: current run state returns the active run, then the last finished one', async () => {
  const harness = await openRunHarness({
    steps: slowFirstSteps(1000),
    prepare: writeGraphs,
  });
  const stream = await openEvents(harness);
  try {
    const before = await currentOf(harness);
    expect(before.status).toBe(200);
    expect(currentRunSchema.parse(JSON.parse(before.body))).toEqual({
      run: null,
    });

    const start = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: 'chain',
      inputs: { in1: { kind: 'text', text: 'Ada' } },
    });
    expect(start.status).toBe(200);
    const { runId } = runStartResultSchema.parse(JSON.parse(start.body));

    const during = await currentOf(harness);
    expect(during.status).toBe(200);
    const active = currentRunSchema.parse(JSON.parse(during.body)).run;
    expect(active?.runId).toBe(runId);
    expect(active?.status).toBe('running');

    await untilRunEnded(stream);
    const after = await currentOf(harness);
    expect(after.status).toBe(200);
    const finished = currentRunSchema.parse(JSON.parse(after.body)).run;
    expect(finished?.runId).toBe(runId);
    expect(finished?.status).toBe('done');
  } finally {
    await stream.close();
    await harness.close();
  }
});
