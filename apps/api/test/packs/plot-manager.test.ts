import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { graphFileSchema } from '@bbartolome/scriba-contracts/graph-runner';
import {
  TOOLS_ROUTE,
  toolListSchema,
} from '@bbartolome/scriba-contracts/tool-registry';
import { createTestApp, type TestApp } from '../create-test-app';
import { send, sessionCookie } from '../guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from '../invariant-sweep';
import { makeLibrary } from '../settings.kit';
import {
  goldenCase,
  GOLDEN_ROOT,
  PACKS_ROOT,
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

it('AC 1: the plot_manager golden matches with a story-graph JSON fixture as outline, its prompt holds the beats and the two characters, and the result holds the finding', async () => {
  const fixture = JSON.parse(
    readFileSync(
      join(GOLDEN_ROOT, 'plot_manager', 'late-boat.fixture.json'),
      'utf8',
    ),
  ) as { arguments: { outline: string } };
  expect(typeof fixture.arguments.outline).toBe('string');
  expect(
    graphFileSchema.parse(JSON.parse(fixture.arguments.outline)).view,
  ).toBe('story');

  await goldenCase({
    tool: 'plot_manager',
    name: 'late-boat',
    expect: {
      kind: 'check',
      sourcesUsed: ['nell-carrow', 'pim-dorey'],
    },
    invalidWithout: 'outline',
    check: (result) => {
      const prompt = renderedPrompt(result);
      expect(prompt).toContain('Nell hides the logbook page');
      expect(prompt).toContain('Pim reads the sealed telegram');
      expect(prompt).toContain('nell-carrow');
      expect(prompt).toContain('pim-dorey');
      expect(result.content).toContain('Nell hides the logbook page');
    },
  })();
}, 60000);

it('X1: the tool list includes plot_manager with origin fiction, enabled, valid and output check', async () => {
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
        (tool) => tool.name === 'plot_manager' && tool.origin === 'fiction',
      );
    expect(row).toBeDefined();
    expect(row).toMatchObject({ enabled: true, valid: true, output: 'check' });
  } finally {
    await app?.close();
    rmSync(library, { recursive: true, force: true });
  }
});
