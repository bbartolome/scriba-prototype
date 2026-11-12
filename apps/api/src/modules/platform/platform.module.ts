import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HealthController } from './health.controller';
import { PlatformExceptionFilter } from './errors/platform-exception.filter';
import { VersionController } from './version.controller';

// Modules outside platform import these from this entry file only.
export { SCRIBA_ENV, type ScribaEnv } from './boot/env';
export { ModuleError, ZodValidationPipe } from './errors/index';

@Module({
  controllers: [HealthController, VersionController],
  providers: [{ provide: APP_FILTER, useClass: PlatformExceptionFilter }],
})
export class PlatformModule {}
