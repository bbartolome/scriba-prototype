import { join } from 'node:path';
import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import {
  PROVIDER_DEFAULTS,
  PROVIDER_PRESETS,
  PROVIDERS_SECTION_SCHEMA_VERSION,
  providersSectionSchema,
  type ProvidersSection,
} from '@bbartolome/scriba-contracts/providers';
import {
  BootError,
  SCRIBA_ENV,
  SettingsService,
  type ScribaEnv,
} from '../platform/platform.module';

const OLLAMA_PRESET_ID = 'ollama';

// Seeds the providers section on the first start, and refuses boot when a present section breaks its schema.
// PlatformModule is deeper than ProvidersModule, because ProvidersModule imports it. Nest calls the hooks of the
// deepest modules first, so Platform's onApplicationBootstrap runs before this one: the file already has every
// default section when this runs.
@Injectable()
export class ProvidersSeeder implements OnApplicationBootstrap {
  constructor(
    private readonly settings: SettingsService,
    @Inject(SCRIBA_ENV) private readonly env: ScribaEnv,
  ) {}

  onApplicationBootstrap(): void {
    const existing = this.settings.read('providers');
    if (existing === undefined) {
      this.settings.write('providers', ollamaSection());
      return;
    }
    // A present section is left as it is, even an empty list. Only its shape is checked.
    const checked = providersSectionSchema.safeParse(existing);
    if (!checked.success) {
      const [issue] = checked.error.issues;
      const where = issue.path.map(String).join('.') || '(root)';
      throw new BootError(
        `Cannot read ${settingsPath(this.env.SCRIBA_BOOKS_DIR)}: section "providers" does not match its schema (${where}: ${issue.message}).`,
      );
    }
  }
}

// The seeded section: the Ollama preset with the defaults, validated before it is written.
function ollamaSection(): ProvidersSection {
  const preset = PROVIDER_PRESETS.find(
    (candidate) => candidate.id === OLLAMA_PRESET_ID,
  );
  if (preset === undefined) {
    throw new Error('The Ollama preset is missing from PROVIDER_PRESETS.');
  }
  return providersSectionSchema.parse({
    schemaVersion: PROVIDERS_SECTION_SCHEMA_VERSION,
    list: [
      {
        id: preset.id,
        kind: 'openai-compatible',
        baseURL: preset.baseURL,
        model: '',
        ...PROVIDER_DEFAULTS,
      },
    ],
    appDefault: { providerId: preset.id, model: '' },
  });
}

// The same path as Platform's settingsFilePath. It is repeated here because a module may import only the platform
// entry file, and settingsFilePath is not exported from it.
function settingsPath(booksDir: string): string {
  return join(booksDir, '.scriba', 'settings.yaml');
}
