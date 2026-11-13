import { expect, vi } from 'vitest';
import {
  PROVIDER_DEFAULTS,
  PROVIDER_ERROR_STATUS,
  type OpenAICompatibleConfig,
  type ProviderErrorCode,
} from '@bbartolome/scriba-contracts/providers';
import {
  startMockOpenAI,
  type MockOpenAI,
  type MockOpenAIRecord,
} from '../../../e2e/fixtures/mock-openai/server.mjs';
import { ModuleError } from '../src/modules/platform/platform.module';
import type { ProviderTarget } from '../src/modules/providers/client';

export { startMockOpenAI, type MockOpenAI, type MockOpenAIRecord };
export { vi };

interface TargetOptions {
  key?: string;
  keyRef?: string;
  model?: string;
  timeout?: number;
  retries?: number;
}

// A resolved target for one scenario on the mock. The base URL is the scenario's own path on the mock.
export function targetFor(
  mock: MockOpenAI,
  scenario: string,
  options: TargetOptions = {},
): ProviderTarget {
  return targetAt(`${mock.baseUrl}/scenario/${scenario}/v1`, options);
}

// A resolved target at any base URL (for example a local test server).
export function targetAt(
  baseURL: string,
  options: TargetOptions = {},
): ProviderTarget {
  const config: OpenAICompatibleConfig = {
    id: 'mock',
    kind: 'openai-compatible',
    baseURL,
    model: 'mock-model',
    temperature: PROVIDER_DEFAULTS.temperature,
    contextSize: PROVIDER_DEFAULTS.contextSize,
    maxTokens: PROVIDER_DEFAULTS.maxTokens,
    timeout: options.timeout ?? PROVIDER_DEFAULTS.timeout,
    retries: options.retries ?? PROVIDER_DEFAULTS.retries,
    keyRef: options.keyRef,
  };
  return {
    config,
    key: options.key,
    model: options.model ?? 'mock-model',
  };
}

// The records the mock has received for one scenario, in arrival order.
export async function recordsOf(
  mock: MockOpenAI,
  scenario: string,
): Promise<MockOpenAIRecord[]> {
  const response = await fetch(
    `${mock.baseUrl}/__mock/scenarios/${scenario}/requests`,
  );
  return (await response.json()) as MockOpenAIRecord[];
}

// Clears the mock's records and attempt counters for one scenario.
export async function resetScenario(
  mock: MockOpenAI,
  scenario: string,
): Promise<void> {
  await fetch(`${mock.baseUrl}/__mock/scenarios/${scenario}/reset`, {
    method: 'POST',
  });
}

// Resolves to the ModuleError the promise rejects with, after checking its code and its status.
export async function expectCoded(
  promise: Promise<unknown>,
  code: ProviderErrorCode,
): Promise<ModuleError> {
  const reason: unknown = await promise.then(
    () => undefined,
    (error: unknown) => error,
  );
  expect(reason).toBeInstanceOf(ModuleError);
  const coded = reason as ModuleError;
  expect(coded.code).toBe(code);
  expect(coded.status).toBe(PROVIDER_ERROR_STATUS[code]);
  return coded;
}
