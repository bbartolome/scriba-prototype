import { performance } from 'node:perf_hooks';
import { Injectable } from '@nestjs/common';
import {
  PROVIDER_ERROR_CODES,
  type ConnectionTestRequest,
  type ConnectionTestResult,
  type ConnectionTestStage,
  type OpenAICompatibleConfig,
  type ProviderErrorCode,
} from '@bbartolome/scriba-contracts/providers';
import { ModuleError } from '../platform/platform.module';
import {
  collectStream,
  listModels,
  streamChat,
  type ProviderTarget,
} from './client';
import { ProvidersRegistry } from './providers.registry';
import { isOllamaProvider, ollamaPullHint } from './providers.resolution';
import { SecretsStore } from './secrets/secrets-store';

// The hint texts (plan D5). The pull line for an empty Ollama list is the preset's own (ollamaPullHint).
const HINT_REACH_OLLAMA =
  'Is Ollama running on the host, and listening on all interfaces? On Linux, start it with OLLAMA_HOST=0.0.0.0. Outside Docker, try http://localhost:11434/v1 as the base URL.';
const HINT_REACH_OTHER =
  'The server could not be reached. Check the base URL and that the server is running.';
const HINT_TIMEOUT =
  'The provider did not answer in time. Check the base URL and the timeout setting.';
const HINT_UNAUTHORIZED =
  'The provider rejected the key. Check the key. If the key is right, the account may be out of credit.';
const HINT_NO_KEY =
  'No key is stored for this provider. Set one, or type a key for this test.';
const HINT_BAD_RESPONSE =
  "The provider's answer was not usable. Check the base URL. A hosted account that is out of credit may get this answer too.";
const HINT_RATE_LIMITED =
  'The provider refused the request: rate limited, or out of credit. Wait, or add credit.';
const HINT_MODEL_UNKNOWN =
  'The provider does not know this model. Pick one from the list.';
const HINT_NO_MODELS = 'The provider lists no models. Check the model id.';
const HINT_NO_MODEL_ID = 'Set a model id for this provider.';

// The codes that mean the server was not reached at all. Any other code from the list call means the server answered.
const REACH_CODES: ReadonlySet<string> = new Set([
  PROVIDER_ERROR_CODES.UNREACHABLE,
  PROVIDER_ERROR_CODES.TIMEOUT,
]);

// The one-token chat sent by the chat stage.
const PING_MESSAGE = 'Hello';

// The author's connection test (MPR-07): reach and list in one list call, then a one-token chat. Reads only: it
// never writes settings or secrets, and a test-only key is used for the test and never stored.
@Injectable()
export class ConnectionTestService {
  constructor(
    private readonly registry: ProvidersRegistry,
    private readonly secrets: SecretsStore,
  ) {}

  async run(request: ConnectionTestRequest): Promise<ConnectionTestResult> {
    const { config, key } = this.resolveTarget(request);
    const ollama = isOllamaProvider(config);
    const started = performance.now();
    const elapsed = (): number => Math.round(performance.now() - started);

    // Reach and list. The first request is the list call, so its code decides the stage (plan D1).
    let ids: string[];
    try {
      ids = await listModels(providerTarget(withoutRetries(config), key, ''));
    } catch (error) {
      const coded = moduleErrorOf(error);
      const stage: ConnectionTestStage = REACH_CODES.has(coded.code)
        ? 'reach'
        : 'list';
      return failure(stage, coded, ollama, elapsed(), undefined);
    }

    // Chat. An empty saved or draft model takes the first listed id (plan D1); with no id at all, the client
    // refuses the chat before any request.
    const modelCount = ids.length;
    const model = config.model !== '' ? config.model : (ids[0] ?? '');
    const chatConfig = { ...withoutRetries(config), maxTokens: 1 };
    try {
      await collectStream(
        streamChat(providerTarget(chatConfig, key, model), {
          messages: [{ role: 'user', content: PING_MESSAGE }],
        }),
      );
    } catch (error) {
      return failure(
        'chat',
        moduleErrorOf(error),
        ollama,
        elapsed(),
        modelCount,
      );
    }
    return { ok: true, stage: 'chat', latencyMs: elapsed(), modelCount };
  }

  // The config and the key of a request (plan D2). A saved provider takes its stored key when the request names
  // none. A draft has no keyRef, so its key is the request's own or none. An empty key is no key.
  private resolveTarget(request: ConnectionTestRequest): {
    config: OpenAICompatibleConfig;
    key: string | undefined;
  } {
    const typed =
      request.key === undefined || request.key === '' ? undefined : request.key;
    if ('draft' in request) {
      return { config: { id: 'draft', ...request.draft }, key: typed };
    }
    const stored = this.registry.find(request.providerId);
    const key =
      typed ??
      (stored.keyRef === undefined
        ? undefined
        : this.secrets.get(stored.keyRef));
    return { config: stored, key };
  }
}

// The client's own retry is turned off for each stage: one attempt gives the first failure at once (plan D3).
function withoutRetries(
  config: OpenAICompatibleConfig,
): OpenAICompatibleConfig {
  return { ...config, retries: 0 };
}

function providerTarget(
  config: OpenAICompatibleConfig,
  key: string | undefined,
  model: string,
): ProviderTarget {
  return { config, model, ...(key === undefined ? {} : { key }) };
}

// The client throws only coded ModuleErrors. Anything else is not a provider answer, so it is rethrown.
function moduleErrorOf(error: unknown): ModuleError {
  if (error instanceof ModuleError) {
    return error;
  }
  throw error;
}

// A failed test. modelCount is present only when the list stage passed, including when it is 0.
function failure(
  stage: ConnectionTestStage,
  error: ModuleError,
  ollama: boolean,
  latencyMs: number,
  modelCount: number | undefined,
): ConnectionTestResult {
  const code = error.code as ProviderErrorCode;
  const hint = hintOf(stage, code, ollama, modelCount);
  return {
    ok: false,
    stage,
    latencyMs,
    ...(modelCount === undefined ? {} : { modelCount }),
    error: {
      code,
      message: error.message,
      ...(hint === undefined ? {} : { hint }),
    },
  };
}

// The hint of a failure (plan D5). A code that is not in the table gets no hint.
function hintOf(
  stage: ConnectionTestStage,
  code: ProviderErrorCode,
  ollama: boolean,
  modelCount: number | undefined,
): string | undefined {
  switch (code) {
    case PROVIDER_ERROR_CODES.UNREACHABLE:
      return stage === 'reach'
        ? ollama
          ? HINT_REACH_OLLAMA
          : HINT_REACH_OTHER
        : undefined;
    case PROVIDER_ERROR_CODES.TIMEOUT:
      return HINT_TIMEOUT;
    case PROVIDER_ERROR_CODES.UNAUTHORIZED:
      return HINT_UNAUTHORIZED;
    case PROVIDER_ERROR_CODES.NOT_CONFIGURED:
      if (stage === 'list') {
        return HINT_NO_KEY;
      }
      return ollama ? ollamaPullHint() : HINT_NO_MODEL_ID;
    case PROVIDER_ERROR_CODES.MODEL_NOT_FOUND:
      if (modelCount !== undefined && modelCount > 0) {
        return HINT_MODEL_UNKNOWN;
      }
      return ollama ? ollamaPullHint() : HINT_NO_MODELS;
    case PROVIDER_ERROR_CODES.BAD_RESPONSE:
      return HINT_BAD_RESPONSE;
    case PROVIDER_ERROR_CODES.RATE_LIMITED:
      return HINT_RATE_LIMITED;
    default:
      return undefined;
  }
}
