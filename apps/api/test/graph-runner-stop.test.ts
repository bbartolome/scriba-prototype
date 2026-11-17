import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  RUN_CURRENT_ROUTE,
  RUNS_ROUTE,
  RUN_STOP_ROUTE,
  currentRunSchema,
  graphRunnerEventSchema,
  runStartResultSchema,
  type GraphRunnerEvent,
} from '@bbartolome/scriba-contracts/graph-runner';
import {
  ACTIVE_PROJECT_ROUTE,
  PROJECT_PENDING_ROUTE,
  pendingListSchema,
} from '@bbartolome/scriba-contracts/project-store';
import { type Reply } from './guard-request';
import {
  SCENARIO,
  getRun,
  openRunHarness,
  postRun,
  putGraph,
  slowFirstSteps,
  writeGraphs,
  type RunHarness,
} from './graph-runner-run.kit';
import type { ErrorBody } from './project-store-projects.kit';
import { recordsOf } from './providers-client.kit';
import { LOOPBACK_HOST, observeEvents, type Observer } from './invariant-sweep';
import { dataOf } from './sse';

// The helpers of graph-runner-run.test.ts (lines 32 to 70). Local copies, because those helpers are private to that file.

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

// Opens the event stream before a start, so that no event of the run is missed.
function openEvents(harness: RunHarness): Promise<Observer> {
  return observeEvents(harness.app.baseUrl, LOOPBACK_HOST, harness.cookie);
}

// The body of an error answer, parsed.
function errorOf(reply: Reply): ErrorBody['error'] {
  return (JSON.parse(reply.body) as ErrorBody).error;
}

// The current run of the active project.
function currentOf(harness: RunHarness): Promise<Reply> {
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

// The node-status events of a run, as `node:status` strings.
function nodeEventsOf(events: GraphRunnerEvent[]): string[] {
  return events.flatMap((event) =>
    event.type === 'node-status'
      ? [`${event.data.nodeId}:${event.data.status}`]
      : [],
  );
}

// The mock's first request, once the client has closed its connection (the mock sets closedByClient on close, which
// can come after run-ended reaches the test).
async function expectAborted(harness: RunHarness): Promise<void> {
  await pollUntil(async () => {
    const [first] = await recordsOf(harness.mock, SCENARIO);
    return first?.closedByClient === true;
  });
  expect(await recordsOf(harness.mock, SCENARIO)).toHaveLength(1);
}

// The mock reply of a refusal: HTTP 400 with a body that is not a model-not-found error. It is not retried, so the
// run fails at its first request.
const failFirstSteps = [
  { reply: { kind: 'status', status: 400, body: { error: 'refused' } } },
];

// A recipe of one input, one tool and one output node. The output node has no params (P21, optional).
const CHAIN_OUT = {
  id: 'chain-out',
  value: {
    schemaVersion: 1,
    view: 'recipe',
    name: 'chain-out',
    nodes: [
      {
        id: 'in1',
        kind: 'input',
        position: { x: 0, y: 0 },
        params: { type: 'text', label: 'Topic' },
      },
      {
        id: 'n1',
        kind: 'tool',
        position: { x: 0, y: 0 },
        tool: 'gr_text',
        params: { words: 40 },
      },
      {
        id: 'out1',
        kind: 'output',
        position: { x: 0, y: 0 },
      },
    ],
    edges: [
      { id: 'w1', from: 'in1.out', to: 'n1.topic' },
      { id: 'w2', from: 'n1.output', to: 'out1.in' },
    ],
  },
};

it('stop and fail-fast, C1: a mock tool failure marks the node error, the queued nodes stopped, and ends the run error', async () => {
  const harness = await openRunHarness({
    steps: failFirstSteps,
    prepare: writeGraphs,
  });
  const stream = await openEvents(harness);
  try {
    const start = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: 'chain',
      inputs: { in1: { kind: 'text', text: 'Ada' } },
    });
    expect(start.status).toBe(200);
    const { runId } = runStartResultSchema.parse(JSON.parse(start.body));

    const events = await untilRunEnded(stream);
    expect(nodeEventsOf(events)).toEqual([
      'in1:queued',
      'n1:queued',
      'n2:queued',
      'n3:queued',
      'in1:running',
      'in1:done',
      'n1:running',
      'n1:error',
      'n2:stopped',
      'n3:stopped',
    ]);
    const failed = events.find(
      (event) =>
        event.type === 'node-status' &&
        event.data.nodeId === 'n1' &&
        event.data.status === 'error',
    );
    expect(failed?.type === 'node-status' && failed.data.error?.code).toBe(
      'TOOL_MODEL_ERROR',
    );
    expect(
      failed?.type === 'node-status' && failed.data.error?.message.length,
    ).toBeGreaterThan(0);

    const last = events.at(-1);
    expect(last?.type).toBe('run-ended');
    expect(last?.data).toMatchObject({ runId, status: 'error' });
    expect(last?.data).not.toHaveProperty('reason');
    expect(await recordsOf(harness.mock, SCENARIO)).toHaveLength(1);

    const current = await currentOf(harness);
    expect(current.status).toBe(200);
    const { run } = currentRunSchema.parse(JSON.parse(current.body));
    expect(run?.status).toBe('error');
    expect(run?.nodes.n1?.status).toBe('error');
    expect(run?.nodes.n2?.status).toBe('stopped');
    expect(run?.nodes.n3?.status).toBe('stopped');
    expect(run?.reason).toBeUndefined();
  } finally {
    await stream.close();
    await harness.close();
  }
});

it('stop and fail-fast, C2: a stop during a slow mock call ends the run stopped within 2 seconds, the mock sees the request aborted, and no pending change is created afterwards', async () => {
  const harness = await openRunHarness({
    steps: slowFirstSteps(10000),
    prepare: (library) => {
      writeGraphs(library);
      putGraph(library, CHAIN_OUT.id, CHAIN_OUT.value);
    },
  });
  const stream = await openEvents(harness);
  try {
    // (1) A stop of an unknown run is refused.
    const unknown = await postRun(harness.app, harness.cookie, RUN_STOP_ROUTE, {
      runId: 'no-such-run',
    });
    expect(unknown.status).toBe(404);
    expect(errorOf(unknown).code).toBe('GRAPH_RUN_NOT_FOUND');

    // (2) A run starts; its first model call waits in the mock.
    const start = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: CHAIN_OUT.id,
      inputs: { in1: { kind: 'text', text: 'Ada' } },
    });
    expect(start.status).toBe(200);
    const { runId } = runStartResultSchema.parse(JSON.parse(start.body));
    await pollUntil(
      async () => (await recordsOf(harness.mock, SCENARIO)).length === 1,
    );

    // (3) The stop is answered at once, with an empty body.
    const t0 = Date.now();
    const stop = await postRun(harness.app, harness.cookie, RUN_STOP_ROUTE, {
      runId,
    });
    expect(stop.status).toBe(200);
    expect(JSON.parse(stop.body)).toEqual({});

    // (4) The run ends stopped, with reason author, within 2 seconds.
    const events = await untilRunEnded(stream);
    const elapsed = Date.now() - t0;
    expect(events.at(-1)?.data).toMatchObject({
      runId,
      status: 'stopped',
      reason: 'author',
    });
    expect(elapsed).toBeLessThan(2000);

    // (5) The mock saw the request aborted, and no retry followed.
    await expectAborted(harness);

    // (6) The running node and the queued output node become stopped; nothing is marked done or error after n1 starts.
    const nodeEvents = nodeEventsOf(events);
    const afterRunning = nodeEvents.slice(nodeEvents.indexOf('n1:running') + 1);
    expect(afterRunning).toEqual(['n1:stopped', 'out1:stopped']);

    // (7) The current run is stopped, with no pending change.
    const current = await currentOf(harness);
    const { run } = currentRunSchema.parse(JSON.parse(current.body));
    expect(run?.status).toBe('stopped');
    expect(run?.reason).toBe('author');
    expect(run?.pendingChangeIds).toEqual([]);
    expect(run?.nodes.n1?.status).toBe('stopped');
    expect(run?.nodes.out1?.status).toBe('stopped');

    // (8) The pending list of the book holds no change.
    const pending = await getRun(
      harness.app,
      harness.cookie,
      PROJECT_PENDING_ROUTE.replace(':projectId', 'book'),
    );
    expect(pending.status).toBe(200);
    expect(pendingListSchema.parse(JSON.parse(pending.body)).changes).toEqual(
      [],
    );

    // (9) A repeated stop is a no-op: 200, and the run stays stopped with reason author.
    const again = await postRun(harness.app, harness.cookie, RUN_STOP_ROUTE, {
      runId,
    });
    expect(again.status).toBe(200);
    const after = currentRunSchema.parse(
      JSON.parse((await currentOf(harness)).body),
    );
    expect(after.run?.status).toBe('stopped');
    expect(after.run?.reason).toBe('author');
  } finally {
    await stream.close();
    await harness.close();
  }
});

it('stop and fail-fast, C3: switching the active project mid-run ends the run stopped with reason project-switched', async () => {
  const harness = await openRunHarness({
    steps: slowFirstSteps(10000),
    prepare: (library) => {
      writeGraphs(library);
      const other = join(library, 'other');
      mkdirSync(other);
      writeFileSync(
        join(other, 'project.yaml'),
        'schemaVersion: 1\ntitle: Other\ngenrePack: nonfiction\n',
      );
    },
  });
  const stream = await openEvents(harness);
  try {
    const start = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: 'chain',
      inputs: { in1: { kind: 'text', text: 'Ada' } },
    });
    expect(start.status).toBe(200);
    const { runId } = runStartResultSchema.parse(JSON.parse(start.body));
    await pollUntil(
      async () => (await recordsOf(harness.mock, SCENARIO)).length === 1,
    );

    // The switch is answered after the hook has run.
    const switched = await postRun(
      harness.app,
      harness.cookie,
      ACTIVE_PROJECT_ROUTE,
      { projectId: 'other' },
    );
    expect(switched.status).toBe(200);

    const events = await untilRunEnded(stream);
    expect(events.at(-1)?.data).toMatchObject({
      runId,
      status: 'stopped',
      reason: 'project-switched',
    });
    const nodeEvents = nodeEventsOf(events);
    const afterRunning = nodeEvents.slice(nodeEvents.indexOf('n1:running') + 1);
    expect(afterRunning).toEqual(['n1:stopped', 'n2:stopped', 'n3:stopped']);
    await expectAborted(harness);
  } finally {
    await stream.close();
    await harness.close();
  }
});
