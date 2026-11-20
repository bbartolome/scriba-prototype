import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { ProjectStoreModule } from '../project-store/project-store.module';
import { SetupAuthModule } from '../setup-auth/setup-auth.module';
import { AssemblyService } from './assembly.service';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { ExportSettingsController } from './export-settings.controller';
import { ExportSettingsService } from './export-settings.service';
import { ManuscriptController } from './manuscript.controller';
import { ManuscriptService } from './manuscript.service';
import { ManuscriptWriteService } from './manuscript-write.service';
import { PreflightController } from './preflight.controller';
import { PreflightService } from './preflight.service';
import { SnapshotController } from './snapshot.controller';
import { SnapshotService } from './snapshot.service';

// Modules outside compile-export import these from this entry file only.
export { ManuscriptService } from './manuscript.service';
export { AssemblyService } from './assembly.service';
export { PreflightService } from './preflight.service';
export { ExportService } from './export.service';

// Compile & export: the manuscript view model. It exports the services for the later units that consume it.
@Module({
  imports: [PlatformModule, ProjectStoreModule, SetupAuthModule],
  controllers: [
    ManuscriptController,
    PreflightController,
    SnapshotController,
    ExportController,
    ExportSettingsController,
  ],
  providers: [
    ManuscriptService,
    ManuscriptWriteService,
    AssemblyService,
    PreflightService,
    SnapshotService,
    ExportService,
    ExportSettingsService,
  ],
  exports: [
    ManuscriptService,
    AssemblyService,
    PreflightService,
    ExportService,
  ],
})
export class CompileExportModule {}
