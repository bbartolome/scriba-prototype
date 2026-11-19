import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { ProjectStoreModule } from '../project-store/project-store.module';
import { SetupAuthModule } from '../setup-auth/setup-auth.module';
import { AssemblyService } from './assembly.service';
import { ManuscriptController } from './manuscript.controller';
import { ManuscriptService } from './manuscript.service';
import { ManuscriptWriteService } from './manuscript-write.service';

// Compile & export: the manuscript view model. It exports the service for the later units that consume it.
@Module({
  imports: [PlatformModule, ProjectStoreModule, SetupAuthModule],
  controllers: [ManuscriptController],
  providers: [ManuscriptService, ManuscriptWriteService, AssemblyService],
  exports: [ManuscriptService, AssemblyService],
})
export class CompileExportModule {}
