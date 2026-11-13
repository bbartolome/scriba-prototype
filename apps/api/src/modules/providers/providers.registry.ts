import { Injectable } from '@nestjs/common';
import {
  PROVIDER_ERROR_CODES,
  PROVIDER_ERROR_STATUS,
  PROVIDERS_SECTION_SCHEMA_VERSION,
  providerConfigSchema,
  providersSectionSchema,
  type ModelChoice,
  type ProviderConfig,
  type ProviderCreate,
  type ProviderUpdate,
  type ProvidersSection,
} from '@bbartolome/scriba-contracts/providers';
import { ModuleError, SettingsService } from '../platform/platform.module';

// The providers registry: reads and writes of the providers section. Each write reads the section, changes it in
// memory and writes it once through SettingsService. The methods are synchronous, so two writes cannot interleave.
@Injectable()
export class ProvidersRegistry {
  constructor(private readonly settings: SettingsService) {}

  list(): ProviderConfig[] {
    return this.current().list;
  }

  get(id: string): ProviderConfig | undefined {
    return this.current().list.find((provider) => provider.id === id);
  }

  // The stored config with the id. An unknown id is NOT_FOUND.
  find(id: string): ProviderConfig {
    const section = this.current();
    return section.list[indexOf(section.list, id)];
  }

  appDefault(): ModelChoice | null {
    return this.current().appDefault;
  }

  create(body: ProviderCreate): ProviderConfig {
    const section = this.current();
    const id = freeId(idBase(body), section.list);
    // The parse drops presetId and label, which the stored shape does not have.
    const config = providerConfigSchema.parse({ ...body, id });
    this.save({ ...section, list: [...section.list, config] });
    return config;
  }

  update(id: string, patch: ProviderUpdate): ProviderConfig {
    const section = this.current();
    const index = indexOf(section.list, id);
    // id and keyRef come from the stored config: neither is in the input schema.
    const config = providerConfigSchema.parse({
      ...section.list[index],
      ...patch,
      id,
    });
    const list = [...section.list];
    list[index] = config;
    this.save({ ...section, list });
    return config;
  }

  // Returns the removed config, so the caller can delete its secret by keyRef.
  delete(id: string): ProviderConfig {
    const section = this.current();
    const index = indexOf(section.list, id);
    if (section.appDefault?.providerId === id) {
      throw new ModuleError(
        PROVIDER_ERROR_CODES.DEFAULT_IN_USE,
        PROVIDER_ERROR_STATUS[PROVIDER_ERROR_CODES.DEFAULT_IN_USE],
        `Provider "${id}" is the app default. Set another app default before you delete it.`,
      );
    }
    const removed = section.list[index];
    this.save({
      ...section,
      list: section.list.filter((_, position) => position !== index),
    });
    return removed;
  }

  // The app default is set only to an existing provider. It cannot be cleared.
  setAppDefault(choice: ModelChoice): void {
    const section = this.current();
    indexOf(section.list, choice.providerId);
    this.save({
      ...section,
      appDefault: { providerId: choice.providerId, model: choice.model },
    });
  }

  // Sets the keyRef of a provider, or removes the property when keyRef is undefined. One write.
  setKeyRef(id: string, keyRef: string | undefined): void {
    const section = this.current();
    const index = indexOf(section.list, id);
    const config: ProviderConfig = { ...section.list[index], keyRef };
    if (keyRef === undefined) delete config.keyRef;
    const list = [...section.list];
    list[index] = config;
    this.save({ ...section, list });
  }

  // An absent section reads as an empty one. The section is parsed, so a stored shape that breaks the schema fails here.
  private current(): ProvidersSection {
    const stored = this.settings.read('providers');
    if (stored === undefined) {
      return {
        schemaVersion: PROVIDERS_SECTION_SCHEMA_VERSION,
        list: [],
        appDefault: null,
      };
    }
    return providersSectionSchema.parse(stored);
  }

  private save(section: ProvidersSection): void {
    this.settings.write('providers', providersSectionSchema.parse(section));
  }
}

// The id base: the preset id when given, else the slug of the label.
function idBase(body: ProviderCreate): string {
  if (body.presetId !== undefined) return body.presetId;
  if (body.label !== undefined) return slug(body.label);
  throw new Error('A create body needs a presetId or a label.');
}

// DEC 1843 (D-c): lowercase first, each run of characters outside a-z and 0-9 becomes one hyphen, and leading and
// trailing hyphens are removed.
function slug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// The base when no provider has it, else the base with the first free suffix: base-2, base-3, and so on.
function freeId(base: string, list: ProviderConfig[]): string {
  const taken = new Set(list.map((provider) => provider.id));
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

// The position of the first entry with the id. An unknown id is NOT_FOUND.
function indexOf(list: ProviderConfig[], id: string): number {
  const index = list.findIndex((provider) => provider.id === id);
  if (index === -1) {
    throw new ModuleError(
      PROVIDER_ERROR_CODES.NOT_FOUND,
      PROVIDER_ERROR_STATUS[PROVIDER_ERROR_CODES.NOT_FOUND],
      `No provider has the id "${id}".`,
    );
  }
  return index;
}
