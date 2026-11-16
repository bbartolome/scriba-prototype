import { rmSync } from 'node:fs';
import { expect, it } from 'vitest';
import { stringify } from 'yaml';
import { errorBodySchema } from '@bbartolome/scriba-contracts/platform';
import { PROVIDER_DEFAULTS } from '@bbartolome/scriba-contracts/providers';
import {
  TOOL_EXECUTE_ROUTE,
  toolCallResultSchema,
} from '@bbartolome/scriba-contracts/tool-registry';
import { createTestApp, type TestApp } from '../create-test-app';
import { send, sessionCookie, type Reply } from '../guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from '../invariant-sweep';
import { recordsOf, startMockOpenAI } from '../providers-client.kit';
import { makeLibrary } from '../settings.kit';
import { PACKS_ROOT, goldenCase, type GoldenRunResult } from './golden.kit';

interface Entity {
  ref: string;
  type: string;
  path: string;
  content: string;
}

const COREIDEA =
  'Expertise comes from deliberate practice with feedback, not from a fixed number of hours.';
const BELIEF = 'Ten thousand hours of practice make anyone an expert.';

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

it(
  "AC 2: the myth_buster golden matches, its prompt holds every entity with its ID and the citation and placeholder rules, sourcesUsed leaves out the style profile, and invalid arguments return Ajv's readable error",
  goldenCase({
    tool: 'myth_buster',
    name: 'belief-claims',
    expect: {
      kind: 'draft',
      sourcesUsed: ['notes-a', 'claim-a', 'claim-b'],
    },
    invalidWithout: 'belief',
    check: (result) => {
      const prompt = renderedPrompt(result);
      for (const id of ['notes-a', 'claim-a', 'claim-b', 'style-a']) {
        expect(prompt, id).toContain(id);
      }
      expect(prompt).toContain('[@');
      expect(prompt).toContain('TK (');
      expect(prompt).toContain(`Belief: ${BELIEF}`);
      expect(prompt).toContain('Length: 800 words');
      expect(prompt).toContain('game-changer');
    },
  }),
  60000,
);

it('AC 3: only claim entities are accepted on claimIds, and a source or a concept there is refused with TOOL_ENTITY_KIND_MISMATCH', async () => {
  const scenario = 'pack-myth_buster';
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
      const path = TOOL_EXECUTE_ROUTE.replace(':name', 'myth_buster');
      const call = (claimIds: string[], entity: Entity): Promise<Reply> =>
        post(app, cookie, path, {
          arguments: { coreIdea: COREIDEA, belief: BELIEF, claimIds },
          entities: [entity],
        });

      // (a) a claim on claimIds is accepted and reaches the model.
      const claimReply = await call(['claim-a'], {
        ref: 'claim-a',
        type: 'claim',
        path: 'entities/claim-a.md',
        content:
          'Claim A says that the hours of practice alone did not predict the level that people reached.',
      });
      expect(claimReply.status, claimReply.body).toBe(200);
      const result = toolCallResultSchema.parse(
        JSON.parse(claimReply.body) as unknown,
      );
      expect(result.output.kind).toBe('draft');

      // (b) a source on claimIds is refused.
      const sourceReply = await call(['notes-a'], {
        ref: 'notes-a',
        type: 'source',
        path: 'sources/notes-a.md',
        content: 'Notes A say that the ten-thousand-hour figure is an average.',
      });
      expect(sourceReply.status).toBe(422);
      const sourceError = errorBodySchema.parse(
        JSON.parse(sourceReply.body) as unknown,
      ).error;
      expect(sourceError.code).toBe('TOOL_ENTITY_KIND_MISMATCH');
      expect(sourceError.message).toContain('notes-a');
      expect(sourceError.message).toContain('claimIds');
      expect(sourceError.message).toContain('"claim"');

      // (c) a concept on claimIds is refused.
      const conceptReply = await call(['concept-a'], {
        ref: 'concept-a',
        type: 'concept',
        path: 'entities/concept-a.md',
        content: 'Concept A is the idea of deliberate practice.',
      });
      expect(conceptReply.status).toBe(422);
      const conceptError = errorBodySchema.parse(
        JSON.parse(conceptReply.body) as unknown,
      ).error;
      expect(conceptError.code).toBe('TOOL_ENTITY_KIND_MISMATCH');

      // (d) only the claim call reached the model.
      const records = await recordsOf(mock, scenario);
      expect(records).toHaveLength(1);
    } finally {
      await app.close();
    }
  } finally {
    await mock.close();
    rmSync(library, { recursive: true, force: true });
  }
}, 60000);
