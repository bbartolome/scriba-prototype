import type {
  AppDefault,
  ConnectionTestError,
  ConnectionTestResult,
  ConnectionTestStage,
  EffectiveModel,
  ModelChoice,
  ModelList,
  Preset,
  PresetList,
  ProjectModelResponse,
  ProviderErrorCode,
  ProviderList,
  ProviderRead,
} from '@bbartolome/scriba-contracts/providers';
import type { ActiveProject } from '@bbartolome/scriba-contracts/project-store';
import type { ApiPath, ResponseSchema } from '../../shell';

// Hand-written copies of the providers route constants, defaults, error codes, response schemas and
// field rules. The browser ships no runtime zod (DECISIONS lines 1084 to 1088), so
// providers-copies.spec.ts checks each copy against the contract (P1 and P2). The guards rebuild
// each value from the fields the contract knows, so an unexpected field never reaches the store.

/** `GET` and `POST` `/api/providers` (`PROVIDERS_ROUTE`). */
export const PROVIDERS_PATH = '/api/providers';
/** `GET /api/providers/presets` (`PRESETS_ROUTE`). */
export const PRESETS_PATH = '/api/providers/presets';
/** `GET` and `POST /api/providers/app-default` (`APP_DEFAULT_ROUTE`). */
export const APP_DEFAULT_PATH = '/api/providers/app-default';
/** `POST /api/providers/:id/update` (`PROVIDER_UPDATE_ROUTE`). A template: see `providerPath`. */
export const PROVIDER_UPDATE_PATH = '/api/providers/:id/update';
/** `POST /api/providers/:id/delete` (`PROVIDER_DELETE_ROUTE`). A template: see `providerPath`. */
export const PROVIDER_DELETE_PATH = '/api/providers/:id/delete';
/** `GET /api/providers/:id/models` (`MODELS_ROUTE`). A template: see `providerPath`. */
export const MODELS_PATH = '/api/providers/:id/models';
/** `POST /api/providers/key/set` (`KEY_SET_ROUTE`). */
export const KEY_SET_PATH = '/api/providers/key/set';
/** `POST /api/providers/key/clear` (`KEY_CLEAR_ROUTE`). */
export const KEY_CLEAR_PATH = '/api/providers/key/clear';

/** Fills a route template's `:id` with the provider id, encoded as one path segment. */
export function providerPath(template: ApiPath, id: string): ApiPath {
  return template.replace(':id', encodeURIComponent(id)) as ApiPath;
}

/** The defaults of a new provider (`PROVIDER_DEFAULTS`). */
export const PROVIDER_DEFAULTS_COPY = {
  temperature: 0.7,
  contextSize: 64000,
  maxTokens: 4096,
  timeout: 120000,
  retries: 2,
} as const;

/** The error code of a delete refused for the app default (`PROVIDER_ERROR_CODES.DEFAULT_IN_USE`). */
export const DEFAULT_IN_USE_CODE = 'PROVIDER_DEFAULT_IN_USE';
/** The error code of an unknown provider id (`PROVIDER_ERROR_CODES.NOT_FOUND`). */
export const NOT_FOUND_CODE = 'PROVIDER_NOT_FOUND';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * A base URL as zod's `z.url()` reads it: trimmed, then parsed by the URL parser, then stripped of
 * tabs and line feeds and carriage returns. Undefined when the URL parser refuses the text. The
 * order matters: `trim()` removes U+00A0, which the URL parser keeps.
 */
export function contractUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  try {
    void new URL(trimmed);
  } catch {
    return undefined;
  }
  return trimmed.replace(/[\t\n\r]/g, '');
}

/** A finite number (`z.number()` refuses NaN and the infinities). */
export function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

/** A safe integer of at least `min` (`.int()` takes only safe integers). */
export function integerAtLeast(
  value: unknown,
  min: number,
): number | undefined {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= min
    ? value
    : undefined;
}

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** One provider read view, as `openaiCompatibleReadSchema` accepts it. */
function readProvider(value: unknown): ProviderRead | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const {
    id,
    kind,
    baseURL,
    model,
    temperature,
    contextSize,
    maxTokens,
    timeout,
    retries,
    keyRef,
    keySet,
    keyHint,
  } = value;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    return undefined;
  }
  if (kind !== 'openai-compatible') {
    return undefined;
  }
  const url = contractUrl(baseURL);
  const sampling = finiteNumber(temperature);
  const context = integerAtLeast(contextSize, 1);
  const tokens = integerAtLeast(maxTokens, 1);
  const wait = integerAtLeast(timeout, 0);
  const attempts = integerAtLeast(retries, 0);
  if (
    url === undefined ||
    typeof model !== 'string' ||
    sampling === undefined ||
    context === undefined ||
    tokens === undefined ||
    wait === undefined ||
    attempts === undefined ||
    typeof keySet !== 'boolean'
  ) {
    return undefined;
  }
  const read: ProviderRead = {
    id,
    kind: 'openai-compatible',
    baseURL: url,
    model,
    temperature: sampling,
    contextSize: context,
    maxTokens: tokens,
    timeout: wait,
    retries: attempts,
    keySet,
  };
  if (keyRef !== undefined) {
    if (typeof keyRef !== 'string' || keyRef === '') {
      return undefined;
    }
    read.keyRef = keyRef;
  }
  if (keyHint !== undefined) {
    if (
      typeof keyHint !== 'string' ||
      keyHint.length < 1 ||
      keyHint.length > 4
    ) {
      return undefined;
    }
    read.keyHint = keyHint;
  }
  return read;
}

function readPreset(value: unknown): Preset | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const { id, label, baseURL, keyRequired, hints } = value;
  const url = contractUrl(baseURL);
  if (
    typeof id !== 'string' ||
    id === '' ||
    typeof label !== 'string' ||
    label === '' ||
    url === undefined ||
    typeof keyRequired !== 'boolean' ||
    !Array.isArray(hints) ||
    !hints.every(isString)
  ) {
    return undefined;
  }
  return { id, label, baseURL: url, keyRequired, hints };
}

function readAppDefault(value: unknown): AppDefault | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const choice = value['appDefault'];
  if (choice === null) {
    return { appDefault: null };
  }
  if (!isRecord(choice)) {
    return undefined;
  }
  const { providerId, model } = choice;
  if (
    typeof providerId !== 'string' ||
    providerId === '' ||
    typeof model !== 'string'
  ) {
    return undefined;
  }
  return { appDefault: { providerId, model } };
}

function readModels(value: unknown): ModelList | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const models = value['models'];
  if (!Array.isArray(models) || !models.every(isString)) {
    return undefined;
  }
  return { models };
}

/** Turns a parser that returns undefined for a refused body into a response schema. */
function guard<T>(parse: (value: unknown) => T | undefined): ResponseSchema<T> {
  return {
    safeParse(data) {
      const value = parse(data);
      return value === undefined
        ? { success: false, error: 'The body does not match the contract.' }
        : { success: true, data: value };
    },
  };
}

/** Response of `GET /api/providers` (`providerListSchema`). */
export const providerListCopy: ResponseSchema<ProviderList> = guard((data) => {
  if (!isRecord(data) || !Array.isArray(data['providers'])) {
    return undefined;
  }
  const providers: ProviderRead[] = [];
  for (const entry of data['providers']) {
    const read = readProvider(entry);
    if (read === undefined) {
      return undefined;
    }
    providers.push(read);
  }
  return { providers };
});

/** One provider read view (`providerReadSchema`). */
export const providerReadCopy: ResponseSchema<ProviderRead> =
  guard(readProvider);

/** Response of `GET /api/providers/presets` (`presetListSchema`). */
export const presetListCopy: ResponseSchema<PresetList> = guard((data) => {
  if (!isRecord(data) || !Array.isArray(data['presets'])) {
    return undefined;
  }
  const presets: Preset[] = [];
  for (const entry of data['presets']) {
    const preset = readPreset(entry);
    if (preset === undefined) {
      return undefined;
    }
    presets.push(preset);
  }
  return { presets };
});

/** Response of `GET` and `POST /api/providers/app-default` (`appDefaultSchema`). */
export const appDefaultCopy: ResponseSchema<AppDefault> = guard(readAppDefault);

/** Response of `GET /api/providers/:id/models` (`modelListSchema`). */
export const modelListCopy: ResponseSchema<ModelList> = guard(readModels);

/** A 204 with no body: the fetch backend gives null and the XHR backend gives null too (A5). */
export const emptyBodyCopy: ResponseSchema<null> = {
  safeParse(data) {
    return data === null || data === undefined
      ? { success: true, data: null }
      : { success: false, error: 'A 204 has no body.' };
  },
};

/** `POST /api/providers/test` (`CONNECTION_TEST_ROUTE`). The form sends it through the store. */
export const CONNECTION_TEST_PATH = '/api/providers/test';

/** The ten provider error codes as a literal tuple (`PROVIDER_ERROR_CODE_VALUES`). */
export const PROVIDER_ERROR_CODE_NAMES = [
  'PROVIDER_UNREACHABLE',
  'PROVIDER_UNAUTHORIZED',
  'PROVIDER_MODEL_NOT_FOUND',
  'PROVIDER_TIMEOUT',
  'PROVIDER_RATE_LIMITED',
  'PROVIDER_BAD_RESPONSE',
  'PROVIDER_ABORTED',
  'PROVIDER_NOT_CONFIGURED',
  'PROVIDER_DEFAULT_IN_USE',
  'PROVIDER_NOT_FOUND',
] as const;

/** The three stages of a connection test, in order (`CONNECTION_TEST_STAGES`). */
const CONNECTION_TEST_STAGE_NAMES = ['reach', 'list', 'chat'] as const;

function isStage(value: unknown): value is ConnectionTestStage {
  return CONNECTION_TEST_STAGE_NAMES.some((stage) => stage === value);
}

function isErrorCode(value: unknown): value is ProviderErrorCode {
  return PROVIDER_ERROR_CODE_NAMES.some((code) => code === value);
}

function readConnectionTestError(
  value: unknown,
): ConnectionTestError | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const { code, message, hint } = value;
  if (!isErrorCode(code) || !isString(message)) {
    return undefined;
  }
  const error: ConnectionTestError = { code, message };
  if (hint !== undefined) {
    if (!isString(hint)) {
      return undefined;
    }
    error.hint = hint;
  }
  return error;
}

function readConnectionTestResult(
  value: unknown,
): ConnectionTestResult | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const { ok, stage, latencyMs, modelCount, error } = value;
  const wait = finiteNumber(latencyMs);
  if (typeof ok !== 'boolean' || !isStage(stage) || wait === undefined) {
    return undefined;
  }
  if (wait < 0) {
    return undefined;
  }
  const result: ConnectionTestResult = { ok, stage, latencyMs: wait };
  if (modelCount !== undefined) {
    const count = integerAtLeast(modelCount, 0);
    if (count === undefined) {
      return undefined;
    }
    result.modelCount = count;
  }
  if (error !== undefined) {
    const parsed = readConnectionTestError(error);
    if (parsed === undefined) {
      return undefined;
    }
    result.error = parsed;
  }
  return result;
}

/** Response of `POST /api/providers/test` (`connectionTestResultSchema`). */
export const connectionTestResultCopy: ResponseSchema<ConnectionTestResult> =
  guard(readConnectionTestResult);

/**
 * Whether a provider is Ollama, by the server's rule (`isOllamaProvider`, providers.resolution.ts lines
 * 114 to 120; MPR-10 unit line 16): its baseURL uses port 11434, or its id starts with `ollama`. The id
 * covers a provider made from the Ollama preset, whose `presetId` is not stored. An unparsable URL is not
 * Ollama. The form passes the typed text, so the URL may be unparsable.
 */
export function isOllamaProvider(config: {
  id?: string;
  baseURL: string;
}): boolean {
  let port: string;
  try {
    port = new URL(config.baseURL).port;
  } catch {
    return false;
  }
  return (
    port === '11434' ||
    (config.id !== undefined && config.id.startsWith('ollama'))
  );
}

/**
 * The context-length note under the context field (MPR-10 D6): the Ollama preset's first hint, then one
 * sentence with the number from the installer (PLT-17 D18).
 */
export const OLLAMA_CONTEXT_NOTE =
  'Context length is set in Ollama, not in Scriba. Start Ollama with OLLAMA_CONTEXT_LENGTH=64000 or higher.';

/** The pull note under the model picker when the list is empty (MPR-10 D6): the Ollama preset's pull line. */
export const OLLAMA_PULL_NOTE =
  'Pull a model on the host with `ollama pull <model>`.';

/** `GET /api/project-store/active` (`ACTIVE_PROJECT_ROUTE`). Read by the "This project" section. */
export const ACTIVE_PROJECT_PATH: ApiPath = '/api/project-store/active';
/** `GET /api/providers/effective-model` (`EFFECTIVE_MODEL_ROUTE`). Takes the `projectId` query. */
export const EFFECTIVE_MODEL_PATH: ApiPath = '/api/providers/effective-model';
/** `POST /api/providers/project-model` (`PROJECT_MODEL_ROUTE`). */
export const PROJECT_MODEL_PATH: ApiPath = '/api/providers/project-model';
/** `POST /api/providers/project-model/clear` (`PROJECT_MODEL_CLEAR_ROUTE`). */
export const PROJECT_MODEL_CLEAR_PATH: ApiPath =
  '/api/providers/project-model/clear';

/** The three sources of an effective model, as a literal tuple (`EFFECTIVE_MODEL_SOURCES`). */
export const EFFECTIVE_MODEL_SOURCE_NAMES = ['project', 'app', 'auto'] as const;

/** A model choice: a non-empty provider id and a model text, which may be empty (`modelChoiceSchema`). */
function readChoice(value: unknown): ModelChoice | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const { providerId, model } = value;
  if (typeof providerId !== 'string' || providerId === '' || !isString(model)) {
    return undefined;
  }
  return { providerId, model };
}

/** Response of `GET /api/project-store/active` (`activeProjectSchema`): `active` is null or an id. */
export const activeProjectCopy: ResponseSchema<ActiveProject> = guard(
  (data) => {
    if (!isRecord(data)) {
      return undefined;
    }
    const active = data['active'];
    if (active === null) {
      return { active: null };
    }
    return typeof active === 'string' && active !== '' ? { active } : undefined;
  },
);

/** Response of `GET /api/providers/effective-model` (`effectiveModelSchema`). */
export const effectiveModelCopy: ResponseSchema<EffectiveModel> = guard(
  (data) => {
    if (!isRecord(data)) {
      return undefined;
    }
    const choice = readChoice(data['choice']);
    const source = data['source'];
    const context = integerAtLeast(data['contextSize'], 1);
    const warning = data['warning'];
    if (
      choice === undefined ||
      !EFFECTIVE_MODEL_SOURCE_NAMES.some((name) => name === source) ||
      context === undefined ||
      (warning !== undefined && !isString(warning))
    ) {
      return undefined;
    }
    const effective: EffectiveModel = {
      choice,
      source: source as EffectiveModel['source'],
      contextSize: context,
    };
    if (warning !== undefined) {
      effective.warning = warning;
    }
    return effective;
  },
);

/** Response of `POST .../project-model` and `POST .../project-model/clear` (`projectModelResponseSchema`). */
export const projectModelResponseCopy: ResponseSchema<ProjectModelResponse> =
  guard((data) => {
    if (!isRecord(data)) {
      return undefined;
    }
    const projectModel = data['projectModel'];
    if (projectModel === null) {
      return { projectModel: null };
    }
    const choice = readChoice(projectModel);
    return choice === undefined ? undefined : { projectModel: choice };
  });
