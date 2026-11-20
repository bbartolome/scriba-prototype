import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import type { AgentLoopEvent } from '@bbartolome/scriba-contracts/agent-loop';
import {
  EXPORT_ROUTE,
  PREFLIGHT_CHECK_IDS,
} from '@bbartolome/scriba-contracts/compile-export';
import { RUN_CURRENT_ROUTE } from '@bbartolome/scriba-contracts/graph-runner';
import { storyGraph } from './compile-export-manuscript.kit';
import {
  get,
  observe,
  openHarness,
  post,
  readUntilEnded,
  requestsOf,
  startRun,
  toolMessagesOf,
  type ChatBody,
  type Harness,
} from './agent-loop-transcript.kit';
import type { ProjectsLibrary } from './project-store-projects.kit';

// The compile tools (AGL-24). Each test opens its own harness: one mock scenario, one temp library with `book`
// active, and the composed app. The criteria run through the SSE stream and the mock's record of the chat requests.

const DRAFT = 'drafts/ch01.md';
const DRAFT_TEXT = 'The harbour woke before the town did.\n';
const COMPILE_NAMES = [
  'assemble_manuscript',
  'export_manuscript',
  'run_preflight',
];

function prepare(fixture: ProjectsLibrary): void {
  const book = join(fixture.library, 'book');
  mkdirSync(join(book, 'drafts'), { recursive: true });
  writeFileSync(join(book, DRAFT), DRAFT_TEXT);
}

// One chat step that makes one tool call with the given arguments.
function toolCallStep(turnIndex: number, name: string, args: string): unknown {
  return {
    match: { endpoint: 'chat', turnIndex },
    reply: { kind: 'toolCalls', calls: [{ name, argumentChunks: [args] }] },
  };
}

function doneStep(turnIndex: number): unknown {
  return {
    match: { endpoint: 'chat', turnIndex },
    reply: { kind: 'stream', deltas: ['Done.'] },
  };
}

// The data of every event of one type, in stream order.
function dataOfType<T>(events: AgentLoopEvent[], type: string): T[] {
  return events
    .filter((event) => event.type === type)
    .map((event) => (event as unknown as { data: T }).data);
}

interface StartedData {
  callId: string;
  name: string;
  family: string;
}

interface ResultData {
  callId: string;
  summary: string;
  output?: unknown;
}

interface PreflightOutput {
  checks: Array<{ id: string; status: string; findings: unknown[] }>;
}

interface ExportOutput {
  format: string;
  fileName: string;
  bytes: number;
  downloadUrl: string;
  warnings: string[];
  preflight: {
    errors: number;
    warnings: number;
    infos: number;
    revision: unknown;
    ranAt: string;
  };
}

// The names of the tools a request offers, sorted.
function toolNamesOf(body: ChatBody): string[] {
  return (body.tools ?? []).map((tool) => tool.function.name).sort();
}

function exportsFolder(h: Harness): string {
  return join(
    h.fixture.library,
    'book',
    '.scriba',
    'compile-export',
    'exports',
  );
}

it('AC1: "Run the preflight" returns the five checks as a card.', async () => {
  const h = await openHarness({
    scenario: 'ac1',
    steps: [toolCallStep(0, 'run_preflight', '{}'), doneStep(1)],
    prepare,
  });
  try {
    const stream = await observe(h);
    try {
      await startRun(h, { intent: 'Run the preflight' });
      const events = await readUntilEnded(stream);

      const started = dataOfType<StartedData>(events, 'tool-call-started');
      const call = started.find((data) => data.name === 'run_preflight');
      expect(call?.family).toBe('compile');
      if (call === undefined) throw new Error('No run_preflight call.');

      const result = dataOfType<ResultData>(events, 'tool-call-result').find(
        (data) => data.callId === call.callId,
      );
      if (result === undefined) throw new Error('No result of the preflight.');
      const output = result.output as PreflightOutput;
      expect(output.checks.map((check) => check.id)).toEqual([
        ...PREFLIGHT_CHECK_IDS,
      ]);
      for (const check of output.checks) {
        expect(typeof check.status).toBe('string');
        expect(Array.isArray(check.findings)).toBe(true);
      }
      expect(result.summary.startsWith('Ran the preflight:')).toBe(true);
      expect(events.some((event) => event.type === 'run-ended')).toBe(true);

      const requests = await requestsOf(h);
      const [toolMessage] = toolMessagesOf(requests[1]);
      const text = String(toolMessage.content);
      for (const id of PREFLIGHT_CHECK_IDS) {
        expect(text).toContain(`"${id}"`);
      }
    } finally {
      await stream.close();
    }
  } finally {
    await h.close();
  }
});

it('AC2: An export started by the agent produces the same result as one started from the manuscript view.', async () => {
  const h = await openHarness({
    scenario: 'ac2',
    steps: [
      toolCallStep(0, 'export_manuscript', '{"format":"md"}'),
      doneStep(1),
    ],
    prepare,
  });
  try {
    const stream = await observe(h);
    let agentFile: Buffer;
    let agent: ExportOutput;
    try {
      await startRun(h, { intent: 'Export the manuscript as md' });
      const events = await readUntilEnded(stream);
      const started = dataOfType<StartedData>(events, 'tool-call-started');
      const call = started.find((data) => data.name === 'export_manuscript');
      if (call === undefined) throw new Error('No export_manuscript call.');
      const result = dataOfType<ResultData>(events, 'tool-call-result').find(
        (data) => data.callId === call.callId,
      );
      if (result === undefined) throw new Error('No result of the export.');
      agent = result.output as ExportOutput;
      // Read before the second export, which removes the older md file (keepOnly).
      agentFile = readFileSync(join(exportsFolder(h), agent.fileName));
    } finally {
      await stream.close();
    }

    const reply = await post(h, EXPORT_ROUTE, { format: 'md' });
    expect(reply.status).toBe(200);
    const view = JSON.parse(reply.body) as ExportOutput;
    const viewFile = readFileSync(join(exportsFolder(h), view.fileName));

    expect(agent.fileName.endsWith('.md')).toBe(true);
    expect(view.fileName.endsWith('.md')).toBe(true);
    expect(view.format).toBe(agent.format);
    expect(view.bytes).toBe(agent.bytes);
    expect(view.warnings).toEqual(agent.warnings);
    expect(view.preflight.errors).toBe(agent.preflight.errors);
    expect(view.preflight.warnings).toBe(agent.preflight.warnings);
    expect(view.preflight.infos).toBe(agent.preflight.infos);
    expect(view.preflight.revision).toEqual(agent.preflight.revision);
    expect(view.downloadUrl).toBe(agent.downloadUrl);
    expect(viewFile.equals(agentFile)).toBe(true);
  } finally {
    await h.close();
  }
});

it('AC3: No agent tool starts a recipe run or calls the Graph runner.', async () => {
  const graphPath = join('book', 'graphs', 'story.json');
  const h = await openHarness({
    scenario: 'ac3',
    steps: [
      toolCallStep(0, 'assemble_manuscript', '{}'),
      toolCallStep(1, 'run_preflight', '{}'),
      toolCallStep(2, 'export_manuscript', '{"format":"md"}'),
      doneStep(3),
    ],
    prepare: (fixture) => {
      prepare(fixture);
      mkdirSync(join(fixture.library, 'book', 'graphs'), { recursive: true });
      writeFileSync(
        join(fixture.library, graphPath),
        storyGraph('Story', [{ id: 'ch01', path: DRAFT }], []),
      );
    },
  });
  try {
    const graphFile = join(h.fixture.library, graphPath);
    const graphBefore = readFileSync(graphFile);
    const stream = await observe(h);
    let events: AgentLoopEvent[];
    try {
      await startRun(h, { intent: 'Assemble, check and export' });
      events = await readUntilEnded(stream);
    } finally {
      await stream.close();
    }

    const started = dataOfType<StartedData>(events, 'tool-call-started').filter(
      (data) => COMPILE_NAMES.includes(data.name),
    );
    expect(started.map((data) => data.name).sort()).toEqual(COMPILE_NAMES);
    const results = dataOfType<ResultData>(events, 'tool-call-result');
    for (const call of started) {
      expect(results.some((data) => data.callId === call.callId)).toBe(true);
    }
    expect(
      dataOfType<{ callId: string }>(events, 'tool-call-error').some((data) =>
        started.some((call) => call.callId === data.callId),
      ),
    ).toBe(false);

    const current = await get(h, RUN_CURRENT_ROUTE);
    expect(JSON.parse(current.body)).toEqual({ run: null });
    expect(readFileSync(graphFile).equals(graphBefore)).toBe(true);

    const requests = await requestsOf(h);
    expect(requests).toHaveLength(4);
    expect(toolNamesOf(requests[0])).toEqual(
      expect.arrayContaining(COMPILE_NAMES),
    );
    expect(existsSync(exportsFolder(h))).toBe(true);
  } finally {
    await h.close();
  }
});
