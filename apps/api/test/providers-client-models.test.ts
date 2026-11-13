import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { listModels } from '../src/modules/providers/client';
import {
  expectCoded,
  recordsOf,
  resetScenario,
  startMockOpenAI,
  targetAt,
  targetFor,
  type MockOpenAI,
} from './providers-client.kit';

const KEY = 'sk-test-key-0001';
const SCENARIOS = ['models-non-empty', 'models-empty', 'models-failing'];

interface LocalReply {
  contentType: string;
  body: string;
}

interface LocalServer {
  baseUrl: string;
  hits: () => number;
  close: () => Promise<void>;
}

// A local server that answers every request with the same 200 reply and counts the requests.
async function serveReply(reply: LocalReply): Promise<LocalServer> {
  let hits = 0;
  const server: Server = createServer((_request, response) => {
    hits += 1;
    response.writeHead(200, { 'content-type': reply.contentType });
    response.end(reply.body);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    hits: () => hits,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

let mock: MockOpenAI;

beforeAll(async () => {
  mock = await startMockOpenAI();
});

afterAll(async () => {
  await mock.close();
});

beforeEach(async () => {
  for (const scenario of SCENARIOS) {
    await resetScenario(mock, scenario);
  }
});

describe('providers client: model list', () => {
  test('D4: listModels returns the ids in the order the provider sent them', async () => {
    const target = targetFor(mock, 'models-non-empty', { key: KEY });

    expect(await listModels(target)).toEqual(['qwen2.5', 'gemma3', 'llama3.1']);
  });

  test('D4b: listModels with an empty target model still returns the list', async () => {
    const target = targetFor(mock, 'models-non-empty', { model: '' });

    expect(await listModels(target)).toEqual(['qwen2.5', 'gemma3', 'llama3.1']);
  });

  test('D5: listModels returns an empty list for an empty model list', async () => {
    const target = targetFor(mock, 'models-empty', { key: KEY });

    expect(await listModels(target)).toEqual([]);
  });

  test('D6: listModels fails with PROVIDER_UNAUTHORIZED for a rejected key', async () => {
    const target = targetFor(mock, 'models-failing', { key: KEY, retries: 2 });

    await expectCoded(listModels(target), 'PROVIDER_UNAUTHORIZED');

    const records = await recordsOf(mock, 'models-failing');
    expect(records).toHaveLength(1);
  });

  test('D8b: a 200 reply that is not a model list fails with PROVIDER_BAD_RESPONSE', async () => {
    // A wrong URL often answers 200 with a page. That is not an empty list. Each case is one request, not retried.
    const cases: LocalReply[] = [
      {
        contentType: 'text/html',
        body: '<html><body>Not a model list.</body></html>',
      },
      {
        contentType: 'application/json',
        body: JSON.stringify({ object: 'list' }),
      },
    ];
    for (const reply of cases) {
      const local = await serveReply(reply);
      try {
        const target = targetAt(`${local.baseUrl}/v1`, {
          key: KEY,
          retries: 2,
        });
        await expectCoded(listModels(target), 'PROVIDER_BAD_RESPONSE');
        expect(local.hits()).toBe(1);
      } finally {
        await local.close();
      }
    }
  });
});
