import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { ProjectStoreModule } from '../project-store/project-store.module';
import { ManuscriptController } from './manuscript.controller';
import { ManuscriptService } from './manuscript.service';

// Compile & export: the manuscript view model. It exports the service for the later units that consume it.
@Module({
  imports: [PlatformModule, ProjectStoreModule],
  controllers: [ManuscriptController],
  providers: [ManuscriptService],
  exports: [ManuscriptService],
})
export class CompileExportModule {}
