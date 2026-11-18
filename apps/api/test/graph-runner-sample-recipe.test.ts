import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { stringify } from 'yaml';
import { expect, it } from 'vitest';
import { PROVIDER_DEFAULTS } from '@bbartolome/scriba-contracts/providers';
import {
  ACTIVE_PROJECT_ROUTE,
  PROJECT_PENDING_ROUTE,
  pendingListSchema,
} from '@bbartolome/scriba-contracts/project-store';
import {
  RUN_CURRENT_ROUTE,
  RUNS_ROUTE,
  currentRunSchema,
  runStartResultSchema,
  type RunState,
} from '@bbartolome/scriba-contracts/graph-runner';
import { createTestApp, type TestApp } from './create-test-app';
import { sessionCookie } from './guard-request';
import { getRun, postRun, STATIC_ROOT } from './graph-runner-run.kit';
import {
  buildProjectsLibrary,
  postJson,
  readJson,
} from './project-store-projects.kit';
import { startFromSample } from './project-store-samples.kit';
import { recordsOf, startMockOpenAI } from './providers-client.kit';

// The sample under test: a checked-in byte copy of the whole nonfiction sample, with its recipe (plan C5).
const FIXTURE_SAMPLE = resolve(__dirname, 'fixtures/chapter-opening-sample');

// The real packs: the nonfiction workhorses and the core tools (agent-loop-workhorses.test.ts line 41).
const PACKS_ROOT = join(__dirname, '..', '..', '..', 'packages', 'packs');

// The scenario of the shipped mock that the recipe's four chat steps are on.
const SCENARIO = 'recipe-chapter-opening';

// The poll of the run's state: every 100 ms, for at most 10 s. The test's own timeout is 30 s.
const POLL_INTERVAL_MS = 100;
const POLL_LIMIT_MS = 10_000;
const TEST_TIMEOUT_MS = 30_000;

// Waits for the run to leave `running`, then returns its state.
async function finishedRun(
  app: TestApp,
  cookie: string,
  runId: string,
): Promise<RunState | null> {
  const deadline = Date.now() + POLL_LIMIT_MS;
  for (;;) {
    const reply = await getRun(app, cookie, RUN_CURRENT_ROUTE);
    expect(reply.status).toBe(200);
    const run = currentRunSchema.parse(JSON.parse(reply.body)).run;
    if (run !== null && run.runId === runId && run.status !== 'running') {
      return run;
    }
    if (Date.now() > deadline) throw new Error('The run did not end.');
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

it(
  'sample recipe: start from sample, run chapter-opening against the mock, and leave a pending change',
  async () => {
    const samples = mkdtempSync(join(tmpdir(), 'scriba-chapter-sample-'));
    cpSync(FIXTURE_SAMPLE, samples, { recursive: true });
    const mock = await startMockOpenAI();
    const settings = stringify({
      schemaVersion: 1,
      projects: { schemaVersion: 1, active: 'book' },
      providers: {
        schemaVersion: 1,
        list: [
          {
            id: 'mock',
            kind: 'openai-compatible',
            baseURL: `${mock.baseUrl}/scenario/${SCENARIO}/v1`,
            model: 'mock-model',
            ...PROVIDER_DEFAULTS,
          },
        ],
        appDefault: { providerId: 'mock', model: 'mock-model' },
      },
    });
    const fixture = buildProjectsLibrary({ settings });
    let app: TestApp | undefined;
    try {
      app = await createTestApp({
        libraryDir: fixture.library,
        staticRoot: STATIC_ROOT,
        env: {
          SCRIBA_EXAMPLES_DIR: samples,
          SCRIBA_PACKS_DIR: PACKS_ROOT,
        },
      });
      const cookie = await sessionCookie(app, fixture.library);

      // Start from sample: the folder is created in the library.
      const started = await startFromSample(app, cookie, {
        sampleId: 'nonfiction',
        folderName: 'chapter-run',
        title: 'Chapter run',
      });
      expect(started.status).toBe(201);

      // Activate the new project.
      const activated = await postJson(app, cookie, ACTIVE_PROJECT_ROUTE, {
        projectId: 'chapter-run',
      });
      expect(activated.status).toBe(200);
      expect(readJson<{ active: string }>(activated)).toEqual({
        active: 'chapter-run',
      });

      // Start the recipe with its three inputs.
      const start = await postRun(app, cookie, RUNS_ROUTE, {
        graphId: 'chapter-opening',
        inputs: {
          'chapter-notes': {
            kind: 'file',
            ref: 'drafts/the-ten-thousand-hour-idea.md',
          },
          people: { kind: 'entities', refs: ['k-anders-ericsson'] },
          'house-style': { kind: 'style', ref: 'book-style' },
        },
      });
      expect(start.status).toBe(200);
      const { runId } = runStartResultSchema.parse(JSON.parse(start.body));

      // The run ends done, and every node is done.
      const run = await finishedRun(app, cookie, runId);
      expect(run?.status).toBe('done');
      for (const id of [
        'chapter-notes',
        'people',
        'house-style',
        'mystery',
        'cold-open',
        'myth-buster',
        'numbers-to-people',
        'draft',
      ]) {
        expect(run?.nodes[id]?.status).toBe('done');
      }

      // The mock received four chat requests, in order, with the expected content.
      const chats = (await recordsOf(mock, SCENARIO)).filter(
        (record) => record.endpoint === 'chat',
      );
      expect(chats.map((record) => record.attempt)).toEqual([1, 2, 3, 4]);
      const bodies = chats.map((record) => JSON.stringify(record.body));
      expect(bodies[0]).toContain('# Chapter 3: The Ten-Thousand-Hour Idea');
      expect(bodies[1]).toContain('mystery-reply');
      expect(bodies[2]).toContain('cold-open-reply');
      expect(bodies[3]).toContain('myth-reply');

      // The run left one pending change for the draft, and wrote nothing into the manuscript.
      const pendingReply = await getRun(
        app,
        cookie,
        PROJECT_PENDING_ROUTE.replace(':projectId', 'chapter-run'),
      );
      expect(pendingReply.status).toBe(200);
      const pending = pendingListSchema.parse(JSON.parse(pendingReply.body));
      expect(pending.changes).toHaveLength(1);
      expect(pending.changes[0]?.targetPath).toBe('drafts/chapter-opening.md');
      expect(pending.changes[0]?.origin.kind).toBe('recipe-run');
      expect(
        existsSync(
          join(fixture.library, 'chapter-run', 'drafts', 'chapter-opening.md'),
        ),
      ).toBe(false);
    } finally {
      await app?.close();
      await mock.close();
      rmSync(samples, { recursive: true, force: true });
      fixture.remove();
    }
  },
  TEST_TIMEOUT_MS,
);
