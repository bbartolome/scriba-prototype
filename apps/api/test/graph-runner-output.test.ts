import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  RUN_CURRENT_ROUTE,
  RUNS_ROUTE,
  currentRunSchema,
  runStartResultSchema,
  type RunState,
} from '@bbartolome/scriba-contracts/graph-runner';
import {
  PROJECT_PENDING_ACCEPT_ROUTE,
  PROJECT_PENDING_ROUTE,
  pendingListSchema,
  type PendingChange,
} from '@bbartolome/scriba-contracts/project-store';
import { GraphRunnerModule } from '../src/modules/graph-runner/graph-runner.module';
import { createTestApp } from './create-test-app';
import { CHAPTER_ORIGINAL, prepareOutputs } from './graph-runner-output.kit';
import {
  OK_STEPS,
  SCENARIO,
  STATIC_ROOT,
  getRun,
  openRunHarness,
  postRun,
  slowFirstSteps,
  type RunHarness,
} from './graph-runner-run.kit';
import { bookLibrary, fileUrl, putFile } from './project-store-files.kit';
import { pendingKitModule } from './project-store-pending.kit';
import type { ErrorBody } from './project-store-projects.kit';
import { recordsOf } from './providers-client.kit';

// The tests of the output nodes (GRR-06). Each test builds its own mock scenario folder and library, and removes them.
// Test names start `run outputs, C<n>:`, one per criterion.

// The kit route of the in-process propose (PST-15). The kit app has no guard, so no cookie is sent.
const KIT_PROPOSE = '/api/project-store-test/pending/propose';

// The current run of the active project, parsed. The answer is 200 and holds a run.
async function currentOf(harness: RunHarness): Promise<RunState> {
  const reply = await getRun(harness.app, harness.cookie, RUN_CURRENT_ROUTE);
  expect(reply.status).toBe(200);
  const run = currentRunSchema.parse(JSON.parse(reply.body)).run;
  if (run === null) throw new Error('No run is registered.');
  return run;
}

// Resolves with the current run once it has ended, polling every 25 ms for up to 10 s.
async function endedRun(harness: RunHarness): Promise<RunState> {
  const deadline = Date.now() + 10000;
  for (;;) {
    const run = await currentOf(harness);
    if (run.status !== 'running') return run;
    if (Date.now() > deadline) throw new Error('The run did not end.');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

// Resolves when the predicate holds, polling every 25 ms for up to 5 s.
async function pollUntil(predicate: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 5000;
  while (!(await predicate())) {
    if (Date.now() > deadline) throw new Error('The condition did not hold.');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

// The open changes of the book project, parsed.
async function pendingOf(harness: RunHarness): Promise<PendingChange[]> {
  const reply = await getRun(
    harness.app,
    harness.cookie,
    fileUrl(PROJECT_PENDING_ROUTE, 'book'),
  );
  expect(reply.status).toBe(200);
  return pendingListSchema.parse(JSON.parse(reply.body)).changes;
}

// The node id of a change's origin, or an empty string for an agent-run origin.
function nodeOf(change: PendingChange): string {
  return change.origin.kind === 'recipe-run' ? change.origin.nodeId : '';
}

// One propose of the kit module into the book project, with an agent-run origin.
function kitPropose(
  baseUrl: string,
  path: string,
  content: string,
): Promise<Response> {
  return fetch(baseUrl + KIT_PROPOSE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      projectId: 'book',
      path,
      content,
      origin: { kind: 'agent-run', runId: 'r1' },
    }),
  });
}

it('run outputs, C1: a run creates one pending change per in-scope output node, with origin recipe-run and provenance', async () => {
  const harness = await openRunHarness({
    steps: OK_STEPS,
    prepare: prepareOutputs,
  });
  try {
    const start = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: 'entity-out',
      inputs: { in2: { kind: 'entities', refs: ['ada'] } },
    });
    expect(start.status).toBe(200);
    const { runId } = runStartResultSchema.parse(JSON.parse(start.body));

    const run = await endedRun(harness);
    expect(run.status).toBe('done');
    expect(run.pendingChangeIds).toHaveLength(2);

    const changes = await pendingOf(harness);
    expect(changes).toHaveLength(2);
    const out1 = changes.find((change) => nodeOf(change) === 'out1');
    const out2 = changes.find((change) => nodeOf(change) === 'out2');
    expect(out1).toBeDefined();
    expect(out2).toBeDefined();
    expect(run.pendingChangeIds.sort()).toEqual(
      [out1?.id ?? '', out2?.id ?? ''].sort(),
    );

    expect(out2?.targetPath).toBe('drafts/second.md');
    expect(out1?.targetPath).toMatch(/^drafts\/entity-out-\d{8}-\d{4}\.md$/);
    expect(run.nodes.out1?.result).toEqual({
      pendingChangeId: out1?.id,
      path: out1?.targetPath,
    });
    expect(run.nodes.out2?.result).toEqual({
      pendingChangeId: out2?.id,
      path: 'drafts/second.md',
    });
    expect(out1?.origin).toEqual({
      kind: 'recipe-run',
      runId,
      graphId: 'entity-out',
      nodeId: 'out1',
    });
    expect(out2?.origin).toEqual({
      kind: 'recipe-run',
      runId,
      graphId: 'entity-out',
      nodeId: 'out2',
    });
    expect(out1?.provenance).toEqual({
      graphId: 'entity-out',
      nodeId: 'out1',
      entityIds: ['ada'],
      sourcesUsed: ['ada'],
    });
    expect(await recordsOf(harness.mock, SCENARIO)).toHaveLength(1);
  } finally {
    await harness.close();
  }

  // Part (b): a run to out1 only, on a second harness, so that part (a)'s changes do not fold or count.
  const single = await openRunHarness({
    steps: OK_STEPS,
    prepare: prepareOutputs,
  });
  try {
    const start = await postRun(single.app, single.cookie, RUNS_ROUTE, {
      graphId: 'entity-out',
      target: { nodeId: 'out1' },
      inputs: { in2: { kind: 'entities', refs: ['ada'] } },
    });
    expect(start.status).toBe(200);
    const run = await endedRun(single);
    expect(run.status).toBe('done');
    expect(run.pendingChangeIds).toHaveLength(1);
    expect(run.nodes.out2?.status).toBe('idle');
    const changes = await pendingOf(single);
    expect(changes.map(nodeOf)).toEqual(['out1']);
  } finally {
    await single.close();
  }
});

it('run outputs, C2: a text input fed a file keeps its run-start content as the captured base, and accepting after a mid-run host edit answers a conflict', async () => {
  const harness = await openRunHarness({
    steps: slowFirstSteps(1000),
    prepare: prepareOutputs,
  });
  try {
    const start = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: 'file-out',
      inputs: { in1: { kind: 'file', ref: 'drafts/chapter.md' } },
    });
    expect(start.status).toBe(200);
    await pollUntil(
      async () => (await recordsOf(harness.mock, SCENARIO)).length === 1,
    );
    putFile(harness.library, 'book/drafts/chapter.md', 'EDITED TEXT\n');

    const run = await endedRun(harness);
    expect(run.status).toBe('done');

    const changes = await pendingOf(harness);
    expect(changes).toHaveLength(1);
    const change = changes[0];
    expect(change).toMatchObject({
      targetPath: 'drafts/chapter.md',
      kind: 'modify',
      capturedBase: { content: CHAPTER_ORIGINAL },
      proposed: 'ok',
    });

    const accept = await postRun(
      harness.app,
      harness.cookie,
      PROJECT_PENDING_ACCEPT_ROUTE.replace(':projectId', 'book').replace(
        ':id',
        change?.id ?? '',
      ),
      {},
    );
    expect(accept.status).toBe(409);
    const error = (JSON.parse(accept.body) as ErrorBody).error;
    expect(error.code).toBe('PROJECT_PENDING_CONFLICT');
    expect(error.details).toEqual({ reason: 'base-changed' });
    expect(
      readFileSync(
        join(harness.library, 'book', 'drafts', 'chapter.md'),
        'utf8',
      ),
    ).toBe('EDITED TEXT\n');
  } finally {
    await harness.close();
  }
});

it("run outputs, C3: request target, params.path and generated name are honoured in that order, and a target outside its kind's folder is refused before the run starts", async () => {
  const harness = await openRunHarness({
    steps: OK_STEPS,
    prepare: prepareOutputs,
  });
  try {
    const start = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: 'precedence',
      inputs: { in1: { kind: 'text', text: 'Ada' } },
      targets: { out1: 'drafts/from-request.md' },
    });
    expect(start.status).toBe(200);
    const { runId } = runStartResultSchema.parse(JSON.parse(start.body));

    const run = await endedRun(harness);
    expect(run.status).toBe('done');

    const paths = new Map(
      (await pendingOf(harness)).map((change): [string, string] => [
        nodeOf(change),
        change.targetPath,
      ]),
    );
    expect(paths.size).toBe(3);
    expect(paths.get('out1')).toBe('drafts/from-request.md');
    expect(paths.get('out2')).toBe('drafts/second.md');
    expect(paths.get('out3')).toMatch(/^drafts\/precedence-\d{8}-\d{4}\.md$/);

    // Part (b): a target in entities/ for a draft output is refused before the run starts.
    const refused = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: 'precedence',
      inputs: { in1: { kind: 'text', text: 'Ada' } },
      targets: { out1: 'entities/notes.md' },
    });
    expect(refused.status).toBe(422);
    expect((JSON.parse(refused.body) as ErrorBody).error.code).toBe(
      'GRAPH_TARGET_INVALID',
    );
    expect(await recordsOf(harness.mock, SCENARIO)).toHaveLength(1);
    expect((await currentOf(harness)).runId).toBe(runId);
  } finally {
    await harness.close();
  }
});

it('run outputs, C4: a graph output whose content fails the graph schema errors the output node', async () => {
  const harness = await openRunHarness({
    steps: OK_STEPS,
    prepare: prepareOutputs,
  });
  try {
    const start = await postRun(harness.app, harness.cookie, RUNS_ROUTE, {
      graphId: 'graph-out',
      inputs: { in1: { kind: 'text', text: 'Ada' } },
    });
    expect(start.status).toBe(200);

    const run = await endedRun(harness);
    expect(run.status).toBe('error');
    expect(run.nodes.n1?.status).toBe('done');
    expect(run.nodes.out1?.status).toBe('error');
    expect(run.nodes.out1?.error?.code).toBe('PROJECT_VALIDATION_FAILED');
    expect(run.nodes.out1?.error?.message).toMatch(/\S/);
    expect(run.pendingChangeIds).toEqual([]);
    expect(await pendingOf(harness)).toEqual([]);
    const graphFiles = readdirSync(join(harness.library, 'book', 'graphs'));
    expect(graphFiles.some((name) => name.startsWith('graph-out-'))).toBe(
      false,
    );
  } finally {
    await harness.close();
  }
});

it('run outputs, C5: a propose of an invalid graph file to graphs/ is refused by the registered validator', async () => {
  const fixture = bookLibrary();
  try {
    // The Graph runner is booted beside the kit module, so the validator is the one RunsService registers.
    const app = await createTestApp({
      libraryDir: fixture.library,
      staticRoot: STATIC_ROOT,
      modules: [pendingKitModule(), GraphRunnerModule],
    });
    try {
      const bad = await kitPropose(
        app.baseUrl,
        'graphs/bad.json',
        '{"schemaVersion":1,"view":"recipe"}',
      );
      expect(bad.status).toBe(422);
      expect(((await bad.json()) as ErrorBody).error.code).toBe(
        'PROJECT_VALIDATION_FAILED',
      );

      const broken = await kitPropose(app.baseUrl, 'graphs/broken.json', '{');
      expect(broken.status).toBe(422);
      expect(((await broken.json()) as ErrorBody).error.code).toBe(
        'PROJECT_VALIDATION_FAILED',
      );

      const good = await kitPropose(
        app.baseUrl,
        'graphs/good.json',
        '{"schemaVersion":1,"view":"story","name":"Good","nodes":[],"edges":[]}',
      );
      expect(good.status).toBe(200);

      const queued = readdirSync(
        join(fixture.library, 'book', '.scriba', 'pending'),
      ).filter((name) => name.endsWith('.json'));
      expect(queued).toHaveLength(1);
    } finally {
      await app.close();
    }
  } finally {
    fixture.remove();
  }
});
