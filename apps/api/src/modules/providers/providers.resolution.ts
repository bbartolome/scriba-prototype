import { Injectable } from '@nestjs/common';
import { parseDocument } from 'yaml';
import {
  PROVIDER_ERROR_CODES,
  PROVIDER_ERROR_STATUS,
  PROVIDER_PRESETS,
  type EffectiveModelSource,
  type ModelChoice,
  type OpenAICompatibleConfig,
  type ProviderErrorCode,
} from '@bbartolome/scriba-contracts/providers';
import { projectYamlSchema } from '@bbartolome/scriba-contracts/project-store';
import { ModuleError } from '../platform/platform.module';
import {
  FilesService,
  ProjectStoreService,
} from '../project-store/project-store.module';
import { listModels } from './client';
import { ProvidersRegistry } from './providers.registry';
import { SecretsStore } from './secrets/secrets-store';

// The input of a resolution. Without a project id the app default applies.
export interface ResolutionInput {
  projectId?: string;
}

// The warning of an override whose provider was deleted (D3). It names no id, as the Project store's messages do.
const DELETED_PROVIDER_WARNING =
  "The project's model provider was deleted, so the app default is used.";

// The choice in effect for a request, with its source and the warning of a fallback (D2).
interface Selection {
  choice: ModelChoice | null;
  source: EffectiveModelSource;
  warning?: string;
}

// The effective target. `config` is the stored provider; its keyRef is an opaque reference, not a secret. `key` is
// set only when the provider has a keyRef and the secrets file holds its entry. `warning` is set by MPR-12 only.
export interface ResolvedModel {
  config: OpenAICompatibleConfig;
  key?: string;
  model: string;
  contextSize: number;
  source: EffectiveModelSource;
  warning?: string;
}

// Resolves the effective model and lists a provider's models. Both read the registry and the secrets file on every
// call and write nothing. The client takes the target that resolve produces; it never calls resolve itself.
@Injectable()
export class ModelResolver {
  constructor(
    private readonly registry: ProvidersRegistry,
    private readonly secrets: SecretsStore,
    private readonly files: FilesService,
    private readonly store: ProjectStoreService,
  ) {}

  // Whether a choice exists and names a stored provider. It makes no network call, so a caller can refuse a start
  // before any listing (the loop's no-provider check). It agrees with resolve on the two NOT_CONFIGURED throws.
  hasChoice(input: ResolutionInput): boolean {
    const { choice } = this.selectionOf(input);
    return (
      choice !== null && this.registry.get(choice.providerId) !== undefined
    );
  }

  // The order: project override, app default, the provider's own model, then the first model the provider lists.
  async resolve(input: ResolutionInput): Promise<ResolvedModel> {
    const { choice, source, warning } = this.selectionOf(input);
    if (choice === null) {
      throw coded(
        PROVIDER_ERROR_CODES.NOT_CONFIGURED,
        'No app default is set.',
      );
    }
    const provider = this.registry.get(choice.providerId);
    if (provider === undefined) {
      throw coded(
        PROVIDER_ERROR_CODES.NOT_CONFIGURED,
        'The app default names a provider that does not exist.',
      );
    }
    const key = this.keyOf(provider);
    if (choice.model !== '') {
      return resolved(provider, key, choice.model, source, warning);
    }
    if (provider.model !== '') {
      return resolved(provider, key, provider.model, source, warning);
    }
    // The first id in the provider's own order, as the provider sent it (open point 3).
    const ids = await listModels({ config: provider, key, model: '' });
    if (ids.length === 0) {
      throw new ModuleError(
        PROVIDER_ERROR_CODES.NOT_CONFIGURED,
        PROVIDER_ERROR_STATUS[PROVIDER_ERROR_CODES.NOT_CONFIGURED],
        'The provider lists no models.',
        isOllamaProvider(provider) ? { hint: ollamaPullHint() } : undefined,
      );
    }
    return resolved(provider, key, ids[0], 'auto', warning);
  }

  // The project's stored override, or undefined when it has none (D1). A project that is not active has none, and so
  // does a project whose project.yaml cannot be read or does not validate. The Project store refuses to activate such a
  // project, so the last case arises only from an edit made after activation. The check reads the file on every call.
  projectOverride(projectId: string): ModelChoice | undefined {
    if (this.store.activeId() !== projectId) return undefined;
    let text: string;
    try {
      text = this.files.read(projectId, 'project.yaml').content;
    } catch (error) {
      if (error instanceof ModuleError) return undefined;
      throw error;
    }
    const doc = parseDocument(text);
    if (doc.errors.length > 0) return undefined;
    const parsed = projectYamlSchema.safeParse(doc.toJS());
    return parsed.success ? parsed.data.model : undefined;
  }

  // The provider's model ids, sorted for display. The auto choice does not use this order (open point 3).
  async modelList(providerId: string): Promise<string[]> {
    const provider = this.registry.get(providerId);
    if (provider === undefined) {
      throw coded(
        PROVIDER_ERROR_CODES.NOT_FOUND,
        `No provider has the id "${providerId}".`,
      );
    }
    const ids = await listModels({
      config: provider,
      key: this.keyOf(provider),
      model: '',
    });
    return [...ids].sort();
  }

  // The override in effect, else the app default. Shared by resolve and hasChoice, so the two agree (D2). An override
  // that names a deleted provider falls back to the app default with a warning (D3).
  private selectionOf(input: ResolutionInput): Selection {
    const override =
      input.projectId === undefined
        ? undefined
        : this.projectOverride(input.projectId);
    if (override === undefined) {
      return { choice: this.registry.appDefault(), source: 'app' };
    }
    if (this.registry.get(override.providerId) !== undefined) {
      return { choice: override, source: 'project' };
    }
    return {
      choice: this.registry.appDefault(),
      source: 'app',
      warning: DELETED_PROVIDER_WARNING,
    };
  }

  // The key under the provider's keyRef, or undefined when there is no keyRef or no stored entry.
  private keyOf(provider: OpenAICompatibleConfig): string | undefined {
    return provider.keyRef === undefined
      ? undefined
      : this.secrets.get(provider.keyRef);
  }
}

// Whether a stored provider is Ollama (D13; MPR-10 unit line 16): its baseURL uses port 11434, or its id starts
// with `ollama`. The id covers a provider made from the Ollama preset, because presetId is not stored.
export function isOllamaProvider(
  config: Pick<OpenAICompatibleConfig, 'id' | 'baseURL'>,
): boolean {
  return (
    new URL(config.baseURL).port === '11434' || config.id.startsWith('ollama')
  );
}

// The Ollama preset's pull line (D6), so the text has one source.
export function ollamaPullHint(): string {
  const line = PROVIDER_PRESETS.find(
    (preset) => preset.id === 'ollama',
  )?.hints.find((hint) => hint.includes('ollama pull'));
  if (line === undefined) {
    throw new Error('The Ollama preset has no pull line.');
  }
  return line;
}

// A resolved target. `key` is left out when the provider has no stored key, and `warning` when there is none.
function resolved(
  provider: OpenAICompatibleConfig,
  key: string | undefined,
  model: string,
  source: EffectiveModelSource,
  warning?: string,
): ResolvedModel {
  return {
    config: provider,
    ...(key === undefined ? {} : { key }),
    model,
    contextSize: provider.contextSize,
    source,
    ...(warning === undefined ? {} : { warning }),
  };
}

function coded(code: ProviderErrorCode, message: string): ModuleError {
  return new ModuleError(code, PROVIDER_ERROR_STATUS[code], message);
}
