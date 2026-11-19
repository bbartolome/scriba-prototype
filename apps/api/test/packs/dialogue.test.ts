import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { stringify } from 'yaml';
import { errorBodySchema } from '@bbartolome/scriba-contracts/platform';
import { PROVIDER_DEFAULTS } from '@bbartolome/scriba-contracts/providers';
import { TOOL_EXECUTE_ROUTE } from '@bbartolome/scriba-contracts/tool-registry';
import { createTestApp, type TestApp } from '../create-test-app';
import { send, sessionCookie, type Reply } from '../guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from '../invariant-sweep';
import { recordsOf, startMockOpenAI } from '../providers-client.kit';
import { makeLibrary } from '../settings.kit';
import {
  GOLDEN_ROOT,
  PACKS_ROOT,
  goldenCase,
  type GoldenRunResult,
} from './golden.kit';

interface Entity {
  ref: string;
  type: string;
  path: string;
  content: string;
}

interface Fixture {
  arguments: Record<string, unknown>;
  entities: Entity[];
}

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

const LOOPBACK = { host: LOOPBACK_HOST, origin: LOOPBACK_ORIGIN };

function post(
  app: TestApp,
  cookie: string,
  path: string,
  body: unknown,
): Promise<Reply> {
  return send(app.baseUrl, {
    ...LOOPBACK,
    cookie,
    method: 'POST',
    path,
    body: JSON.stringify(body),
  });
}

const caseOptions = {
  tool: 'dialogue',
  name: 'keepers-exchange',
  expect: {
    kind: 'draft' as const,
    sourcesUsed: ['skerry-light', 'nell-carrow', 'pim-dorey'],
  },
  invalidWithout: 'coreIdea',
};

it(
  'AC 2: the dialogue golden case matches, its prompt holds each input entity with its ID and the citation and placeholder instructions, its output is a draft with the expected sourcesUsed, and invalid arguments return an Ajv error that names coreIdea',
  goldenCase({
    ...caseOptions,
    check: (result) => {
      const prompt = renderedPrompt(result);
      for (const id of [
        'skerry-light',
        'nell-carrow',
        'pim-dorey',
        'plain-spoken',
      ]) {
        expect(prompt, id).toContain(id);
      }
      expect(prompt).toContain('[@');
      expect(prompt).toContain('TK (');
    },
  }),
  120000,
);

it("AC 3: the rendered prompt holds both characters' voice and relationship notes and the distinct-voice instruction, and a call with one character returns an Ajv error that names characterIds", async () => {
  await goldenCase({
    ...caseOptions,
    check: (result) => {
      const prompt = renderedPrompt(result);
      for (const text of [
        'voice: Terse.',
        'voice: Talkative.',
        'She tolerates his talk',
        'He wants her approval',
        'distinct diction',
      ]) {
        expect(prompt, text).toContain(text);
      }
    },
  })();

  // The one-character call: the fixture's arguments with one character, through a new app and mock.
  const fixture = JSON.parse(
    readFileSync(
      join(GOLDEN_ROOT, 'dialogue', 'keepers-exchange.fixture.json'),
      'utf8',
    ),
  ) as Fixture;
  const scenario = 'pack-dialogue';
  const mock = await startMockOpenAI();
  const library = makeLibrary(
    stringify({
      schemaVersion: 1,
      providers: {
        schemaVersion: 1,
        list: [
          {
            id: 'mock',
            kind: 'openai-compatible',
            baseURL: `${mock.baseUrl}/scenario/${scenario}/v1`,
            model: 'mock-model',
            ...PROVIDER_DEFAULTS,
          },
        ],
        appDefault: { providerId: 'mock', model: 'mock-model' },
      },
    }),
  );
  try {
    const app = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PACKS_DIR: PACKS_ROOT },
    });
    try {
      const cookie = await sessionCookie(app, library);
      const path = TOOL_EXECUTE_ROUTE.replace(':name', 'dialogue');
      const reply = await post(app, cookie, path, {
        arguments: { ...fixture.arguments, characterIds: ['nell-carrow'] },
        entities: fixture.entities,
      });
      expect(reply.status).toBe(422);
      const error = errorBodySchema.parse(
        JSON.parse(reply.body) as unknown,
      ).error;
      expect(error.code).toBe('TOOL_ARGS_INVALID');
      expect(error.message).toContain('characterIds');
      expect(error.message).toContain('at least 2 items');
      expect(await recordsOf(mock, scenario)).toHaveLength(0);
    } finally {
      await app.close();
    }
  } finally {
    await mock.close();
    rmSync(library, { recursive: true, force: true });
  }
}, 120000);
