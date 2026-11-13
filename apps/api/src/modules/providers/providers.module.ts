import { Module } from '@nestjs/common';
import { PlatformModule, SettingsService } from '../platform/platform.module';
import { ProvidersRegistry } from './providers.registry';
import { PROVIDERS_SECTION_DEF } from './providers.section';
import { ProvidersSeeder } from './providers.seeding';
import { SecretsStore } from './secrets/secrets-store';

const PROVIDERS_SECTION_REGISTRATION = 'PROVIDERS_SECTION_REGISTRATION';

// Model providers: the providers section of settings.yaml, the in-process registry, and the first-start seeding.
@Module({
  imports: [PlatformModule],
  providers: [
    {
      provide: PROVIDERS_SECTION_REGISTRATION,
      inject: [SettingsService],
      useFactory: (settings: SettingsService): true => {
        settings.register(PROVIDERS_SECTION_DEF);
        return true;
      },
    },
    ProvidersRegistry,
    ProvidersSeeder,
    SecretsStore,
  ],
  exports: [ProvidersRegistry, SecretsStore],
})
export class ProvidersModule {}
