import { symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  AgentLoopModule,
  type DispatchResult,
} from '../src/modules/agent-loop/agent-loop.module';
import { PlatformModule } from '../src/modules/platform/platform.module';
import { agentLoopToolsKitModule } from './agent-loop-tools.kit';
import { createTestApp, type TestApp } from './create-test-app';
import { send, type Reply } from './guard-request';
import { LOOPBACK_HOST } from './invariant-sweep';
import { bookLibrary } from './project-store-files.kit';
import type { ProjectsLibrary } from './project-store-projects.kit';

// Every test builds its own temp library and removes it. Nothing here reads the sample projects. No model is
// involved: the calls go straight to the dispatcher through the kit's HTTP routes.

const RUNS = '/api/agent-loop-test/runs';
const READ_SUMMARY =
  'Expected arguments for read_file: path (string, required).';
const LIST_SUMMARY =
  'Expected arguments for list_files: path (string, optional), recursive (boolean, optional).';
const WITHDRAWN = 'This tool is unavailable for the rest of this agent run.';

let callSeq = 0;

// Boots the kit on the fixture library, and closes the app in every case. The library is removed by the caller.
async function withToolsApp<T>(
  fixture: ProjectsLibrary,
  run: (app: TestApp) => Promise<T>,
): Promise<T> {
  const app = await createTestApp({
    libraryDir: fixture.library,
    modules: [PlatformModule, AgentLoopModule, agentLoopToolsKitModule()],
  });
  try {
    return await run(app);
  } finally {
    await app.close();
  }
}

function post(app: TestApp, path: string, body: unknown): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    method: 'POST',
    path,
    body: JSON.stringify(body),
  });
}

// Starts one agent run of project `book`, and returns its id.
async function startRun(app: TestApp): Promise<string> {
  const reply = await post(app, RUNS, { projectId: 'book' });
  expect(reply.status).toBe(200);
  return (JSON.parse(reply.body) as { runId: string }).runId;
}

// One call in a run, with the raw argument string. Returns the reply as sent, so the body can be checked too.
function call(
  app: TestApp,
  runId: string,
  name: string,
  args: string,
): Promise<Reply> {
  callSeq += 1;
  return post(app, `${RUNS}/${runId}/calls`, {
    callId: `call-${callSeq}`,
    name,
    arguments: args,
  });
}

async function callResult(
  app: TestApp,
  runId: string,
  name: string,
  args: string,
): Promise<DispatchResult> {
  const reply = await call(app, runId, name, args);
  expect(reply.status).toBe(200);
  return JSON.parse(reply.body) as DispatchResult;
}

// The names of the tools a run still offers.
async function offeredTools(app: TestApp, runId: string): Promise<string[]> {
  const reply = await send(app.baseUrl, {
    host: LOOPBACK_HOST,
    path: `${RUNS}/${runId}/tools`,
  });
  expect(reply.status).toBe(200);
  return (JSON.parse(reply.body) as { tools: string[] }).tools;
}

it('AC1: a path outside the project is refused with a readable error, and nothing outside is shown', async () => {
  const fixture = bookLibrary();
  try {
    writeFileSync(join(fixture.outside, 'secret.md'), 'SECRET-OUTSIDE\n');
    symlinkSync(
      join(fixture.outside, 'secret.md'),
      join(fixture.library, 'book', 'escape.md'),
    );

    await withToolsApp(fixture, async (app) => {
      const bodies: string[] = [];
      const refusals = [
        {
          name: 'read_file',
          args: '{"path":"../outside/secret.md"}',
          message: 'path: The path must not contain a ".." segment.',
          summary: READ_SUMMARY,
        },
        {
          name: 'read_file',
          args: '{"path":"/etc/passwd"}',
          message:
            'path: The path must be relative to the project, not absolute.',
          summary: READ_SUMMARY,
        },
        {
          name: 'read_file',
          args: '{"path":"escape.md"}',
          message:
            'path: The path leads outside the project, or through a link that cannot be resolved.',
          summary: READ_SUMMARY,
        },
        {
          name: 'list_files',
          args: '{"path":"../"}',
          message: 'path: The path must not contain a ".." segment.',
          summary: LIST_SUMMARY,
        },
      ];
      for (const refusal of refusals) {
        const runId = await startRun(app);
        const reply = await call(app, runId, refusal.name, refusal.args);
        bodies.push(reply.body);
        expect(reply.status).toBe(200);
        expect(JSON.parse(reply.body) as DispatchResult).toEqual({
          arguments: JSON.parse(refusal.args),
          valid: false,
          outcome: {
            kind: 'error',
            message: `${refusal.message}\n${refusal.summary}`,
            attempt: 1,
          },
        });
      }

      // Control: a valid list and a valid read of the project's own file.
      const runId = await startRun(app);
      const listed = await callResult(
        app,
        runId,
        'list_files',
        '{"path":"sources"}',
      );
      expect(listed.valid).toBe(true);
      expect(listed.outcome).toMatchObject({
        kind: 'result',
        summary: 'Listed sources.',
      });
      const entries = (
        listed.outcome as { output: { entries: { path: string; kind: string }[] } }
      ).output.entries;
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        path: 'sources/outline.md',
        kind: 'file',
      });

      const read = await call(
        app,
        runId,
        'read_file',
        '{"path":"sources/outline.md"}',
      );
      bodies.push(read.body);
      expect(JSON.parse(read.body) as DispatchResult).toEqual({
        arguments: { path: 'sources/outline.md' },
        valid: true,
        outcome: {
          kind: 'result',
          summary: 'Read sources/outline.md.',
          output: { path: 'sources/outline.md', content: '# Outline\n' },
          modelText:
            '{"path":"sources/outline.md","content":"# Outline\\n"}',
        },
      });

      const everything = bodies.join('\n');
      expect(everything).not.toContain('SECRET-OUTSIDE');
      expect(everything).not.toContain(fixture.outside);
    });
  } finally {
    fixture.remove();
  }
});

it('AC2: unparseable JSON and schema violations produce the readable format', async () => {
  const fixture = bookLibrary();
  try {
    const cases = [
      {
        name: 'read_file',
        args: '{"path": ',
        arguments: '{"path": ',
        message: 'arguments: is not valid JSON',
        summary: READ_SUMMARY,
      },
      {
        name: 'read_file',
        args: '{}',
        arguments: {},
        message: 'path: is required',
        summary: READ_SUMMARY,
      },
      {
        name: 'list_files',
        args: '{"recursive": "yes"}',
        arguments: { recursive: 'yes' },
        message: 'recursive: must be a boolean',
        summary: LIST_SUMMARY,
      },
      {
        name: 'read_file',
        args: '{"path": 3}',
        arguments: { path: 3 },
        message: 'path: must be a string',
        summary: READ_SUMMARY,
      },
      {
        name: 'read_file',
        args: '{"path": "sources/outline.md", "extra": 1}',
        arguments: { path: 'sources/outline.md', extra: 1 },
        message: 'extra: is not an argument of this tool',
        summary: READ_SUMMARY,
      },
      {
        name: 'read_file',
        args: '[1]',
        arguments: [1],
        message: 'arguments: must be an object',
        summary: READ_SUMMARY,
      },
    ];

    await withToolsApp(fixture, async (app) => {
      for (const item of cases) {
        // Each case is its own run, so no count carries over between them.
        const runId = await startRun(app);
        const result = await callResult(app, runId, item.name, item.args);
        expect(result, item.args).toEqual({
          arguments: item.arguments,
          valid: false,
          outcome: {
            kind: 'error',
            message: `${item.message}\n${item.summary}`,
            attempt: 1,
          },
        });
      }
    });
  } finally {
    fixture.remove();
  }
});

it('AC3: a tool is withdrawn on the third consecutive invalid call, and a valid call resets the count', async () => {
  const fixture = bookLibrary();
  try {
    await withToolsApp(fixture, async (app) => {
      const missing = `path: is required\n${READ_SUMMARY}`;

      // Case 1: three invalid calls withdraw read_file, and a later valid call is refused.
      const first = await startRun(app);
      expect(await callResult(app, first, 'read_file', '{}')).toEqual({
        arguments: {},
        valid: false,
        outcome: { kind: 'error', message: missing, attempt: 1 },
      });
      expect(await callResult(app, first, 'read_file', '{}')).toEqual({
        arguments: {},
        valid: false,
        outcome: { kind: 'error', message: missing, attempt: 2 },
      });
      expect(await callResult(app, first, 'read_file', '{}')).toEqual({
        arguments: {},
        valid: false,
        outcome: {
          kind: 'error',
          message: `${missing}\n${WITHDRAWN}`,
          attempt: 3,
          withdrawn: true,
        },
      });
      expect(await offeredTools(app, first)).toEqual(['list_files']);
      expect(
        await callResult(
          app,
          first,
          'read_file',
          '{"path":"sources/outline.md"}',
        ),
      ).toEqual({
        arguments: { path: 'sources/outline.md' },
        valid: true,
        outcome: { kind: 'error', message: WITHDRAWN, attempt: 3, withdrawn: true },
      });
      const listed = await callResult(
        app,
        first,
        'list_files',
        '{"path":"sources"}',
      );
      expect(listed.outcome).toMatchObject({ kind: 'result' });

      // Case 2: a valid call between invalid ones resets the count.
      const second = await startRun(app);
      expect(
        (await callResult(app, second, 'read_file', '{}')).outcome,
      ).toMatchObject({ attempt: 1 });
      expect(
        (await callResult(app, second, 'read_file', '{}')).outcome,
      ).toMatchObject({ attempt: 2 });
      const valid = await callResult(
        app,
        second,
        'read_file',
        '{"path":"sources/outline.md"}',
      );
      expect(valid.outcome).toMatchObject({
        kind: 'result',
        summary: 'Read sources/outline.md.',
      });
      expect(
        (await callResult(app, second, 'read_file', '{}')).outcome,
      ).toEqual({ kind: 'error', message: missing, attempt: 1 });
      expect(
        (await callResult(app, second, 'read_file', '{}')).outcome,
      ).toEqual({ kind: 'error', message: missing, attempt: 2 });
      expect(await offeredTools(app, second)).toEqual([
        'list_files',
        'read_file',
      ]);
      expect(
        (await callResult(app, second, 'read_file', '{}')).outcome,
      ).toEqual({
        kind: 'error',
        message: `${missing}\n${WITHDRAWN}`,
        attempt: 3,
        withdrawn: true,
      });
    });
  } finally {
    fixture.remove();
  }
});
