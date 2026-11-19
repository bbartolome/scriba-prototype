import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { ProjectStoreModule } from '../project-store/project-store.module';
import { SetupAuthModule } from '../setup-auth/setup-auth.module';
import { AssemblyService } from './assembly.service';
import { ManuscriptController } from './manuscript.controller';
import { ManuscriptService } from './manuscript.service';
import { ManuscriptWriteService } from './manuscript-write.service';
import { PreflightController } from './preflight.controller';
import { PreflightService } from './preflight.service';
import { SnapshotController } from './snapshot.controller';
import { SnapshotService } from './snapshot.service';

// Compile & export: the manuscript view model. It exports the services for the later units that consume it.
@Module({
  imports: [PlatformModule, ProjectStoreModule, SetupAuthModule],
  controllers: [ManuscriptController, PreflightController, SnapshotController],
  providers: [
    ManuscriptService,
    ManuscriptWriteService,
    AssemblyService,
    PreflightService,
    SnapshotService,
  ],
  exports: [ManuscriptService, AssemblyService, PreflightService],
})
export class CompileExportModule {}
