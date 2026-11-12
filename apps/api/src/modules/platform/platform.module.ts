import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { VersionController } from './version.controller';

// Modules outside platform import these from this entry file only.
export { SCRIBA_ENV, type ScribaEnv } from './boot/env';

@Module({
  controllers: [HealthController, VersionController],
  providers: [],
})
export class PlatformModule {}
