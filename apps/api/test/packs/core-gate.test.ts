import { rmSync } from 'node:fs';
import { it, expect } from 'vitest';
import {
  TOOLS_ROUTE,
  toolListSchema,
} from '@bbartolome/scriba-contracts/tool-registry';
import { createTestApp, type TestApp } from '../create-test-app';
import { send, sessionCookie } from '../guard-request';
import { LOOPBACK_HOST, LOOPBACK_ORIGIN } from '../invariant-sweep';
import { makeLibrary } from '../settings.kit';
import { PACKS_ROOT } from './golden.kit';

it('AC 4: the tool list includes propose_graph with origin core', async () => {
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
        (tool) => tool.name === 'propose_graph' && tool.origin === 'core',
      );
    expect(row).toBeDefined();
    expect(row).toMatchObject({ enabled: true, valid: true, output: 'graph' });
  } finally {
    await app?.close();
    rmSync(library, { recursive: true, force: true });
  }
});
