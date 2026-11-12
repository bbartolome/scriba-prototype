import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import {
  startMockOpenAI,
  type MockOpenAI,
} from '../fixtures/mock-openai/server.mjs';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const apiPort = 8080;
const apiBase = `http://127.0.0.1:${apiPort}`;
const healthTimeoutMs = 60_000;

export default async function globalSetup(): Promise<() => Promise<void>> {
  await assertPortFree(apiPort);
  buildWorkspaces();

  const library = await mkdtemp(join(tmpdir(), 'scriba-e2e-'));
  console.log(`e2e: library ${library}`);
  process.env.SCRIBA_E2E_LIBRARY = library;

  const api = startApi(library);
  let mock: MockOpenAI | undefined;
  const teardown = (): Promise<void> => stop(api, mock, library);
  try {
    mock = await startMockOpenAI();
    console.log(`e2e: mock OpenAI at ${mock.baseUrl}`);
    process.env.SCRIBA_E2E_MOCK_URL = mock.baseUrl;
    await checkMock(mock.baseUrl);
    await waitForHealth(api);
  } catch (error) {
    await teardown();
    throw error;
  }
  return teardown;
}

// The API always binds 8080 on every interface, so a server already there would pass the health wait.
function assertPortFree(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', (error: NodeJS.ErrnoException) => {
      reject(
        error.code === 'EADDRINUSE'
          ? new Error(`port ${port} is in use`)
          : error,
      );
    });
    probe.listen(port, '0.0.0.0', () => {
      probe.close(() => resolve());
    });
  });
}

function buildWorkspaces(): void {
  // The API imports contracts from its dist folder, so contracts builds first.
  for (const workspace of [
    '@bbartolome/scriba-contracts',
    '@bbartolome/scriba-api',
    '@bbartolome/scriba-web',
  ]) {
    execFileSync('npm', ['run', 'build', '-w', workspace], {
      cwd: repoRoot,
      stdio: 'inherit',
    });
  }
}

function startApi(library: string): ChildProcess {
  return spawn(process.execPath, [join(repoRoot, 'apps/api/dist/main.js')], {
    cwd: repoRoot,
    env: {
      PATH: process.env.PATH ?? '',
      SCRIBA_BOOKS_DIR: library,
      SCRIBA_PACKS_DIR: join(repoRoot, 'packages/packs'),
      SCRIBA_EXAMPLES_DIR: join(repoRoot, 'examples'),
    },
    stdio: 'inherit',
  });
}

// The probe is itself a recorded request, so the reset clears its record before any test runs.
async function checkMock(baseUrl: string): Promise<void> {
  const models = await fetch(`${baseUrl}/scenario/tool-call/v1/models`);
  await models.text();
  if (models.status !== 200)
    throw new Error(`mock models probe returned ${models.status}`);
  const reset = await fetch(`${baseUrl}/__mock/scenarios/tool-call/reset`, {
    method: 'POST',
  });
  await reset.text();
  if (reset.status !== 204)
    throw new Error(`mock reset returned ${reset.status}`);
}

async function waitForHealth(api: ChildProcess): Promise<void> {
  const deadline = Date.now() + healthTimeoutMs;
  while (!(await isHealthy())) {
    if (api.exitCode !== null || api.signalCode !== null) {
      throw new Error(
        `API exited before it was ready (code ${api.exitCode}, signal ${api.signalCode})`,
      );
    }
    if (Date.now() >= deadline)
      throw new Error('API did not report healthy within 60 s');
    await sleep(200);
  }
  console.log(`e2e: API ready at ${apiBase}/healthz`);
}

async function isHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBase}/healthz`);
    const body = (await response.json().catch(() => ({}))) as {
      status?: unknown;
    };
    return response.status === 200 && body.status === 'ok';
  } catch {
    return false;
  }
}

async function stop(
  api: ChildProcess,
  mock: MockOpenAI | undefined,
  library: string,
): Promise<void> {
  if (api.exitCode === null && api.signalCode === null) {
    const exited = once(api, 'exit');
    api.kill('SIGTERM');
    await exited;
  }
  await mock?.close();
  await rm(library, { recursive: true, force: true });
}
