import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it, vi } from 'vitest';
import { bootstrap } from '../src/bootstrap';

// A fake socket stands in for the one property the filter reads, plus destroy.
function fakeSocket(remoteAddress: string) {
  const destroy = vi.fn();
  const socket = Object.assign(new EventEmitter(), { remoteAddress, destroy });
  return { socket: socket as unknown as Socket, destroy };
}

it('the tailnet filter is installed on the server connection event', async () => {
  const library = mkdtempSync(join(tmpdir(), 'scriba-api-test-'));
  const app = await bootstrap({
    env: {
      SCRIBA_BOOKS_DIR: library,
      SCRIBA_PACKS_DIR: join(library, 'packs'),
      SCRIBA_EXAMPLES_DIR: join(library, 'examples'),
      SCRIBA_LOG_LEVEL: 'error',
    },
    staticRoot: resolve(__dirname, 'fixtures/static'),
  });
  try {
    await app.listen(0, '127.0.0.1');
    const server = app.getHttpServer() as Server;
    const baseline = createServer().listeners('connection');
    const added = server
      .listeners('connection')
      .filter((listener) => !baseline.includes(listener));
    expect(added.length).toBeGreaterThanOrEqual(1);

    const refused = fakeSocket('100.100.1.1');
    for (const listener of added) listener(refused.socket);
    expect(refused.destroy).toHaveBeenCalled();

    const served = fakeSocket('127.0.0.1');
    for (const listener of added) listener(served.socket);
    expect(served.destroy).not.toHaveBeenCalled();
  } finally {
    await app.close();
    rmSync(library, { recursive: true, force: true });
  }
});
