import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HealthController } from './health.controller';
import { PlatformExceptionFilter } from './errors/platform-exception.filter';
import { VersionController } from './version.controller';
import { EchoController } from './events/echo.controller';
import { EventsController } from './events/events.controller';
import { EventsPublisher } from './events/events.publisher';
import { SettingsService } from './settings/settings.service';
import { TailnetFilter } from './tailnet/tailnet-filter';

// Modules outside platform import these from this entry file only.
export { SCRIBA_ENV, type ScribaEnv } from './boot/env';
export { ModuleError, ZodValidationPipe } from './errors/index';
export { EventsPublisher } from './events/events.publisher';
export { SettingsService } from './settings/settings.service';
export type {
  SettingsMigrationStep,
  SettingsSection,
  SettingsSectionDef,
  SettingsSectionKey,
} from './settings/settings.types';

@Module({
  controllers: [
    HealthController,
    VersionController,
    EventsController,
    EchoController,
  ],
  providers: [
    { provide: APP_FILTER, useClass: PlatformExceptionFilter },
    EventsPublisher,
    SettingsService,
    TailnetFilter,
  ],
  exports: [EventsPublisher, SettingsService],
})
export class PlatformModule {}
