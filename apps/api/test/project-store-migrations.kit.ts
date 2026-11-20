import {
  Body,
  Controller,
  HttpCode,
  Module,
  Post,
  type Type,
} from '@nestjs/common';
import { PlatformModule } from '../src/modules/platform/platform.module';
import {
  ProjectStoreModule,
  ProjectStoreService,
} from '../src/modules/project-store/project-store.module';

// A test module that registers a migrator through the public provider (PST-23 C1). The one step sets
// upgradedBy to test-migrator, and the kit's current version is 2, so a version 1 file is migrated to 2. Its route
// sits under api/project-store-test, and the module is not in the composed app.
export function migrationsKitModule(): Type<unknown> {
  @Controller('api/project-store-test')
  class MigrationsKitController {
    constructor(private readonly store: ProjectStoreService) {}

    @Post('migrations/register')
    @HttpCode(200)
    register(@Body() body: { kind: string; pattern: string }): object {
      this.store.registerMigrator(
        body.kind,
        body.pattern,
        {
          1: (doc) => {
            doc.set('upgradedBy', 'test-migrator');
          },
        },
        2,
      );
      return {};
    }
  }

  @Module({
    imports: [PlatformModule, ProjectStoreModule],
    controllers: [MigrationsKitController],
  })
  class MigrationsKitModule {}

  return MigrationsKitModule;
}
