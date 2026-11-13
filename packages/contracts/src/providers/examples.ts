import { PROVIDER_DEFAULTS, PROVIDER_PRESETS } from './defaults.js';
import type {
  ProviderConfig,
  ProviderConfigInput,
  ProviderCreate,
  ProviderList,
  ProviderRead,
  ProviderUpdate,
} from './config.js';
import type { PresetList } from './defaults.js';
import type {
  AppDefault,
  EffectiveModel,
  EffectiveModelQuery,
  ModelChoice,
  ModelList,
} from './model.js';
import type {
  ConnectionTestRequest,
  ConnectionTestResult,
} from './connection-test.js';
import type { KeyClearRequest, KeySetRequest } from './keys.js';
import type { ProvidersSection } from './settings.js';

// Example payloads for the contract tests and for fake API clients. Data only.
// Ollama is first and OpenRouter is last in PROVIDER_PRESETS (unit order).
const OLLAMA_BASE_URL = PROVIDER_PRESETS[0].baseURL;
const OPENROUTER_BASE_URL = PROVIDER_PRESETS[3].baseURL;

const ollamaProvider: ProviderConfig = {
  id: 'ollama',
  kind: 'openai-compatible',
  baseURL: OLLAMA_BASE_URL,
  model: '',
  ...PROVIDER_DEFAULTS,
};

const openRouterProvider: ProviderConfig = {
  id: 'openrouter',
  kind: 'openai-compatible',
  baseURL: OPENROUTER_BASE_URL,
  model: '',
  ...PROVIDER_DEFAULTS,
  keyRef: 'openrouter-1',
};

const openRouterInput: ProviderConfigInput = {
  kind: 'openai-compatible',
  baseURL: OPENROUTER_BASE_URL,
  model: '',
  ...PROVIDER_DEFAULTS,
};

const ollamaChoice: ModelChoice = { providerId: 'ollama', model: '' };

export const PROVIDERS_EXAMPLES = {
  ollamaProvider,
  openRouterProvider,
  ollamaRead: { ...ollamaProvider, keySet: false } satisfies ProviderRead,
  openRouterRead: {
    ...openRouterProvider,
    keySet: true,
    keyHint: '3f9x',
  } satisfies ProviderRead,
  createFromPreset: {
    presetId: 'openrouter',
    kind: 'openai-compatible',
    baseURL: 'https://openrouter.ai/api/v1',
    model: '',
    temperature: 0.7,
    contextSize: 64000,
    maxTokens: 4096,
    timeout: 120000,
    retries: 2,
  } satisfies ProviderCreate,
  updateModel: { model: 'llama3.1' } satisfies ProviderUpdate,
  providerList: {
    providers: [
      { ...ollamaProvider, keySet: false },
      { ...openRouterProvider, keySet: true, keyHint: '3f9x' },
    ],
  } satisfies ProviderList,
  seededSection: {
    schemaVersion: 1,
    list: [ollamaProvider],
    appDefault: ollamaChoice,
  } satisfies ProvidersSection,
  presetList: { presets: PROVIDER_PRESETS } satisfies PresetList,
  appDefault: { appDefault: ollamaChoice } satisfies AppDefault,
  appDefaultUnset: { appDefault: null } satisfies AppDefault,
  modelChoice: ollamaChoice,
  effectiveModelApp: {
    choice: ollamaChoice,
    source: 'auto',
    contextSize: 64000,
  } satisfies EffectiveModel,
  effectiveModelProject: {
    choice: { providerId: 'openrouter', model: 'openai/gpt-4o-mini' },
    source: 'project',
    contextSize: 64000,
  } satisfies EffectiveModel,
  effectiveModelWarning: {
    choice: ollamaChoice,
    source: 'app',
    contextSize: 64000,
    warning:
      'No model is set for this provider. The provider uses its own default.',
  } satisfies EffectiveModel,
  effectiveModelQuery: {
    projectId: 'sample-project',
  } satisfies EffectiveModelQuery,
  modelList: { models: ['gemma3', 'llama3.1', 'qwen2.5'] } satisfies ModelList,
  keySetRequest: {
    providerId: 'openrouter',
    key: 'key-example-0001',
  } satisfies KeySetRequest,
  keyClearRequest: { providerId: 'openrouter' } satisfies KeyClearRequest,
  connectionTestById: { providerId: 'ollama' } satisfies ConnectionTestRequest,
  connectionTestByDraft: {
    draft: openRouterInput,
    key: 'key-example-0001',
  } satisfies ConnectionTestRequest,
  connectionTestOk: {
    ok: true,
    stage: 'chat',
    latencyMs: 412,
    modelCount: 3,
  } satisfies ConnectionTestResult,
  connectionTestUnreachable: {
    ok: false,
    stage: 'reach',
    latencyMs: 2000,
    error: {
      code: 'PROVIDER_UNREACHABLE',
      message: 'Could not reach the provider.',
      hint: 'Check that Ollama is running and listening on the host.',
    },
  } satisfies ConnectionTestResult,
};
