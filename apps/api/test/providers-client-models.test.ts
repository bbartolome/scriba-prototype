import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';
import { listModels } from '../src/modules/providers/client';
import {
  expectCoded,
  recordsOf,
  resetScenario,
  startMockOpenAI,
  targetFor,
  type MockOpenAI,
} from './providers-client.kit';

const KEY = 'sk-test-key-0001';
const SCENARIOS = ['models-non-empty', 'models-empty', 'models-failing'];

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
});
