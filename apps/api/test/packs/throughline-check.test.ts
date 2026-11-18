import { rmSync } from 'node:fs';
import { expect, it } from 'vitest';
import {
  TOOLS_ROUTE,
  toolListSchema,
} from '@bbartolome/scriba-contracts/tool-registry';
import { createTestApp, type TestApp } from '../create-test-app';
import { send, sessionCookie } from '../guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from '../invariant-sweep';
import { makeLibrary } from '../settings.kit';
import { goldenCase, PACKS_ROOT, type GoldenRunResult } from './golden.kit';

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

it(
  'AC 1: the throughline_check golden matches, its prompt holds the core idea and the drifting paragraph, and the result holds the finding',
  goldenCase({
    tool: 'throughline_check',
    name: 'drifting-paragraph',
    expect: {
      kind: 'check',
      sourcesUsed: [],
    },
    invalidWithout: 'chapterText',
    check: (result) => {
      const prompt = renderedPrompt(result);
      expect(prompt).toContain(
        'Expertise grows from planned practice, not from the hours alone.',
      );
      expect(prompt).toContain(
        'Sourdough starters need feeding every twelve hours, or they sour and lose their rise.',
      );
      expect(result.content).toContain('Sourdough starters need feeding');
    },
  }),
  60000,
);

it('X2: the tool list includes throughline_check with origin core, enabled, valid and output check', async () => {
  const library = makeLibrary();
  let app: TestApp | undefined;
  try {
    app = await createTestApp({
      libraryDir: library,
      env: { SCRIBA_PACKS_DIR: PACKS_ROOT },
    });
    const cookie = await sessionCookie(app, library);
    const reply = await send(app.baseUrl, {
      host: LOOPBACK_HOST,
      origin: LOOPBACK_ORIGIN,
      cookie,
      method: 'GET',
      path: TOOLS_ROUTE,
    });
    expect(reply.status).toBe(200);
    const row = toolListSchema
      .parse(JSON.parse(reply.body))
      .tools.find(
        (tool) => tool.name === 'throughline_check' && tool.origin === 'core',
      );
    expect(row).toBeDefined();
    expect(row).toMatchObject({ enabled: true, valid: true, output: 'check' });
  } finally {
    await app?.close();
    rmSync(library, { recursive: true, force: true });
  }
});
