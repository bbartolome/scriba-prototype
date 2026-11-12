import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HealthController } from './health.controller';
import { PlatformExceptionFilter } from './errors/platform-exception.filter';
import { VersionController } from './version.controller';
import { EchoController } from './events/echo.controller';
import { EventsController } from './events/events.controller';
import { EventsPublisher } from './events/events.publisher';

// Modules outside platform import these from this entry file only.
export { SCRIBA_ENV, type ScribaEnv } from './boot/env';
export { ModuleError, ZodValidationPipe } from './errors/index';
export { EventsPublisher } from './events/events.publisher';

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
  ],
  exports: [EventsPublisher],
})
export class PlatformModule {}
