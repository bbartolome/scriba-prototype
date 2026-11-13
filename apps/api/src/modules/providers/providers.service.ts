import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  PROVIDER_PRESETS,
  type EffectiveModel,
  type EffectiveModelQuery,
  type ModelChoice,
  type ProviderConfig,
  type ProviderCreate,
  type ProviderRead,
  type ProviderUpdate,
} from '@bbartolome/scriba-contracts/providers';
import { ProvidersRegistry } from './providers.registry';
import { ModelResolver } from './providers.resolution';
import { SecretsStore } from './secrets/secrets-store';

// The logic of the providers HTTP API: the reads, the commands and the read view. The write paths call only
// synchronous methods (the registry and SecretsStore), so no await falls between a settings write and a secrets
// write. The model list and the effective model await the resolver, and neither writes.
@Injectable()
export class ProvidersService {
  constructor(
    private readonly registry: ProvidersRegistry,
    private readonly secrets: SecretsStore,
    private readonly resolver: ModelResolver,
  ) {}

  list(): ProviderRead[] {
    return this.registry.list().map((config) => this.toRead(config));
  }

  presets() {
    return PROVIDER_PRESETS;
  }

  appDefault(): ModelChoice | null {
    return this.registry.appDefault();
  }

  create(body: ProviderCreate): ProviderRead {
    return this.toRead(this.registry.create(body));
  }

  update(id: string, patch: ProviderUpdate): ProviderRead {
    return this.toRead(this.registry.update(id, patch));
  }

  // The config goes first, so no provider names a secret that is being removed. Then its secret goes.
  remove(id: string): void {
    const removed = this.registry.delete(id);
    if (removed.keyRef !== undefined) this.secrets.delete(removed.keyRef);
  }

  // Writes the secret before settings names it. A reference is minted only for a provider that has none.
  setKey(providerId: string, key: string): ProviderRead {
    const config = this.registry.find(providerId);
    const keyRef = config.keyRef ?? mintKeyRef();
    this.secrets.put(keyRef, key);
    if (config.keyRef === undefined) {
      this.registry.setKeyRef(providerId, keyRef);
    }
    return this.toRead(this.registry.find(providerId));
  }

  // The reference goes first, then the secret. A provider without a reference is left as it is.
  clearKey(providerId: string): ProviderRead {
    const config = this.registry.find(providerId);
    if (config.keyRef !== undefined) {
      this.registry.setKeyRef(providerId, undefined);
      this.secrets.delete(config.keyRef);
    }
    return this.toRead(this.registry.find(providerId));
  }

  // The app default is set to an existing provider only. The reply reads the value back from the registry.
  setAppDefault(choice: ModelChoice): ModelChoice | null {
    this.registry.setAppDefault(choice);
    return this.registry.appDefault();
  }

  async models(providerId: string): Promise<string[]> {
    return this.resolver.modelList(providerId);
  }

  // Built field by field: the resolved object carries the key, so it is never spread.
  async effectiveModel(query: EffectiveModelQuery): Promise<EffectiveModel> {
    const resolved = await this.resolver.resolve({
      projectId: query.projectId,
    });
    return {
      choice: { providerId: resolved.config.id, model: resolved.model },
      source: resolved.source,
      contextSize: resolved.contextSize,
      ...(resolved.warning === undefined ? {} : { warning: resolved.warning }),
    };
  }

  // The stored config, keySet, and the last four characters of the key when it has five or more. The key is never in
  // the view. The secrets file is read on each call.
  private toRead(config: ProviderConfig): ProviderRead {
    const { keyRef } = config;
    if (keyRef === undefined || !this.secrets.has(keyRef)) {
      return { ...config, keySet: false };
    }
    const hint = this.secrets.hint(keyRef);
    return {
      ...config,
      keySet: true,
      ...(hint === undefined ? {} : { keyHint: hint }),
    };
  }
}

// An opaque reference: a fixed prefix and a random id. It is not derived from the provider id, which can be reused.
function mintKeyRef(): string {
  return `key-${randomUUID()}`;
}
