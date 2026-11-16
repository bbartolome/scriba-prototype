import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export type LocalApiFixture =
  | 'needs-login'
  | 'logged-out'
  | 'running-certs'
  | 'running-no-certs'
  | 'running-null-certs';

export interface FakeLocalApi {
  readonly socketPath: string;
  use(fixture: LocalApiFixture): void;
  hits(): number;
  close(): Promise<void>;
}

const FIXTURE_DIR = resolve(__dirname, 'fixtures', 'localapi');
const STATUS_PATH = '/localapi/v0/status';
const HOST = 'local-tailscaled.sock';

// A Unix-socket server that replays the stored status payloads. It is the only double for tailscaled.
// The socket folder is short on purpose: macOS limits a socket path to about 104 bytes.
export async function startFakeLocalApi(
  fixture: LocalApiFixture,
): Promise<FakeLocalApi> {
  const folder = mkdtempSync(join(tmpdir(), 'lapi-'));
  const socketPath = join(folder, 'ts.sock');
  let current: LocalApiFixture = fixture;
  let count = 0;

  const server: Server = createServer((request, response) => {
    count += 1;
    if (request.headers.host !== HOST) {
      response.writeHead(400).end();
      return;
    }
    if (request.url !== STATUS_PATH) {
      response.writeHead(404).end();
      return;
    }
    const body = readFileSync(join(FIXTURE_DIR, `${current}.json`), 'utf8');
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(body);
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(socketPath, () => {
      server.off('error', rejectListen);
      resolveListen();
    });
  });

  return {
    socketPath,
    use: (next) => {
      current = next;
    },
    hits: () => count,
    close: async () => {
      try {
        await new Promise<void>((resolveClose, rejectClose) => {
          server.close((error) =>
            error ? rejectClose(error) : resolveClose(),
          );
          server.closeAllConnections();
        });
      } finally {
        rmSync(folder, { recursive: true, force: true });
      }
    },
  };
}
