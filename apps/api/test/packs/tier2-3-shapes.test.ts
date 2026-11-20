import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { stringify } from 'yaml';
import { errorBodySchema } from '@bbartolome/scriba-contracts/platform';
import { PROVIDER_DEFAULTS } from '@bbartolome/scriba-contracts/providers';
import { ACTIVE_PROJECT_ROUTE } from '@bbartolome/scriba-contracts/project-store';
import {
  FUNCTIONS_ROUTE,
  TOOL_ENABLED_ROUTE,
  TOOL_EXECUTE_ROUTE,
  functionListSchema,
  toolCallRequestSchema,
  toolCallResultSchema,
} from '@bbartolome/scriba-contracts/tool-registry';
import { createTestApp, type TestApp } from '../create-test-app';
import { send, sessionCookie, type Reply } from '../guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from '../invariant-sweep';
import { recordsOf, startMockOpenAI } from '../providers-client.kit';
import { buildProjectsLibrary } from '../project-store-projects.kit';
import {
  GOLDEN_ROOT,
  PACKS_ROOT,
  goldenCase,
  type GoldenRunResult,
} from './golden.kit';

// The rendered prompt: the content of the user message in the request the mock recorded.
function renderedPrompt(result: GoldenRunResult): string {
  const user = result.request.messages.find(
    (message): message is { role: 'user'; content: string } =>
      typeof message === 'object' &&
      message !== null &&
      'role' in message &&
      message.role === 'user' &&
      'content' in message &&
      typeof message.content === 'string',
  );
  if (user === undefined) {
    throw new Error(
      'the recorded request has no user message with a string content',
    );
  }
  return user.content;
}

// The prompt holds each text of `texts` and the banned phrase of the style profile.
function promptHolds(result: GoldenRunResult, texts: string[]): void {
  const prompt = renderedPrompt(result);
  for (const text of [...texts, 'game-changer']) {
    expect(prompt, text).toContain(text);
  }
}

const contrast = goldenCase({
  tool: 'contrast',
  name: 'basic',
  enable: true,
  expect: { kind: 'draft', sourcesUsed: ['notes-a'] },
  invalidWithout: 'subjectA',
  check: (result) =>
    promptHolds(result, [
      'notes-a',
      'style-a',
      'Practice planned in advance, with a teacher',
      'Practice alone, from a list chosen beforehand',
    ]),
});

const profile = goldenCase({
  tool: 'profile',
  name: 'basic',
  enable: true,
  expect: { kind: 'draft', sourcesUsed: ['notes-b', 'person-a'] },
  invalidWithout: 'person',
  check: (result) => promptHolds(result, ['notes-b', 'person-a', 'style-a']),
});

const zoom = goldenCase({
  tool: 'zoom',
  name: 'basic',
  enable: true,
  expect: { kind: 'draft', sourcesUsed: ['notes-a'] },
  invalidWithout: 'detail',
  check: (result) =>
    promptHolds(result, [
      'notes-a',
      'style-a',
      'One lamp, turned down by a single notch each night',
      'A whole service kept running by small, repeated checks',
    ]),
});

const readerChallenge = goldenCase({
  tool: 'reader_challenge',
  name: 'basic',
  enable: true,
  expect: { kind: 'draft', sourcesUsed: ['notes-a'] },
  invalidWithout: 'question',
  check: (result) =>
    promptHolds(result, [
      'notes-a',
      'style-a',
      'Does doubling the hours double the skill?',
    ]),
});

const frameworkBuilder = goldenCase({
  tool: 'framework_builder',
  name: 'basic',
  enable: true,
  expect: { kind: 'draft', sourcesUsed: ['notes-a', 'claim-a'] },
  invalidWithout: 'pattern',
  check: (result) =>
    promptHolds(result, [
      'notes-a',
      'claim-a',
      'style-a',
      'Planned practice, a teacher, and feedback after each attempt',
    ]),
});

const methodFirst = goldenCase({
  tool: 'method_first',
  name: 'basic',
  enable: true,
  expect: { kind: 'draft', sourcesUsed: ['notes-b'] },
  invalidWithout: 'method',
  check: (result) =>
    promptHolds(result, [
      'notes-b',
      'style-a',
      'Each session was planned in advance and written in a notebook',
    ]),
});

const timeline = goldenCase({
  tool: 'timeline',
  name: 'basic',
  enable: true,
  expect: { kind: 'draft', sourcesUsed: ['notes-a', 'notes-b'] },
  invalidWithout: 'events',
  check: (result) =>
    promptHolds(result, [
      'notes-a',
      'notes-b',
      'style-a',
      'Year one: the study starts. Year two: the first results. Year three: the follow-up.',
    ]),
});

const flashback = goldenCase({
  tool: 'flashback',
  name: 'basic',
  enable: true,
  expect: { kind: 'draft', sourcesUsed: ['notes-a'] },
  invalidWithout: 'past',
  check: (result) =>
    promptHolds(result, [
      'notes-a',
      'style-a',
      'The student now plays the piece without errors.',
      'Years earlier, the same student practised the piece alone.',
    ]),
});

const stockdaleTension = goldenCase({
  tool: 'stockdale_tension',
  name: 'basic',
  enable: true,
  expect: { kind: 'draft', sourcesUsed: ['notes-b'] },
  invalidWithout: 'hardFact',
  check: (result) =>
    promptHolds(result, [
      'notes-b',
      'style-a',
      'Most of the hours in the study were estimates made from memory.',
      'The planned sessions in the notes can still be counted.',
    ]),
});

it('AC 2: the nine tier 2-3 golden cases match once each tool is enabled in its temporary library; each prompt holds its entities and its text; each output is a draft with the expected sourcesUsed; and each invalid call returns a readable Ajv error', async () => {
  await contrast();
  await profile();
  await zoom();
  await readerChallenge();
  await frameworkBuilder();
  await methodFirst();
  await timeline();
  await flashback();
  await stockdaleTension();
}, 300000);

// One request: a GET with no Origin, as the function list is read.
function get(app: TestApp, cookie: string, path: string): Promise<Reply> {
  return send(app.baseUrl, { host: LOOPBACK_HOST, cookie, path });
}

// One command: a POST with a JSON body and the loopback Origin the guard requires.
function post(
  app: TestApp,
  cookie: string,
  path: string,
  body: unknown,
): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    origin: LOOPBACK_ORIGIN,
    cookie,
    method: 'POST',
    path,
    body: JSON.stringify(body),
  });
}

// The names of the functions the active project offers now.
async function functionNames(app: TestApp, cookie: string): Promise<string[]> {
  const reply = await get(app, cookie, FUNCTIONS_ROUTE);
  expect(reply.status, reply.body).toBe(200);
  return functionListSchema
    .parse(JSON.parse(reply.body) as unknown)
    .functions.map((entry) => entry.function.name);
}

it('AC 3: an enabled tool is callable through execute and present in the function list', async () => {
  const mock = await startMockOpenAI();
  const settings = stringify({
    schemaVersion: 1,
    providers: {
      schemaVersion: 1,
      list: [
        {
          id: 'mock',
          kind: 'openai-compatible',
          baseURL: `${mock.baseUrl}/scenario/pack-contrast/v1`,
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
      env: { SCRIBA_PACKS_DIR: PACKS_ROOT },
    });
    const cookie = await sessionCookie(app, fixture.library);

    const active = await post(app, cookie, ACTIVE_PROJECT_ROUTE, {
      projectId: 'book',
    });
    expect(active.status, active.body).toBe(200);
    expect(JSON.parse(active.body) as unknown).toEqual({ active: 'book' });

    expect(await functionNames(app, cookie)).not.toContain('contrast');

    const request = toolCallRequestSchema.parse(
      JSON.parse(
        readFileSync(
          join(GOLDEN_ROOT, 'contrast', 'basic.fixture.json'),
          'utf8',
        ),
      ) as unknown,
    );
    const executePath = TOOL_EXECUTE_ROUTE.replace(':name', 'contrast');

    const refused = await post(app, cookie, executePath, request);
    expect(refused.status, refused.body).toBe(409);
    expect(
      errorBodySchema.parse(JSON.parse(refused.body) as unknown).error.code,
    ).toBe('TOOL_DISABLED');

    const switched = await post(
      app,
      cookie,
      TOOL_ENABLED_ROUTE.replace(':name', 'contrast'),
      { enabled: true },
    );
    expect(switched.status, switched.body).toBe(200);

    expect(await functionNames(app, cookie)).toContain('contrast');

    const run = await post(app, cookie, executePath, request);
    expect(run.status, run.body).toBe(200);
    const result = toolCallResultSchema.parse(JSON.parse(run.body) as unknown);
    expect(result.output.kind).toBe('draft');
    expect(result.sourcesUsed).toEqual(['notes-a']);
    expect(await recordsOf(mock, 'pack-contrast')).toHaveLength(1);
  } finally {
    try {
      await app?.close();
    } finally {
      await mock.close();
      fixture.remove();
    }
  }
}, 120000);
