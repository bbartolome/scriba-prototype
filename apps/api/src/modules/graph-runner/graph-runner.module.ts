import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { ProjectStoreModule } from '../project-store/project-store.module';
import { ToolRegistryModule } from '../tool-registry/tool-registry.module';
import { GraphsController } from './graphs.controller';
import { GraphRunnerService } from './graph-runner.service';
import { GraphValidatorService } from './graph-validator.service';

// The Graph runner: the graph files of the active project, their list, reads, saves, renames and deletes. It exports
// nothing; no other module consumes it yet.
@Module({
  imports: [PlatformModule, ProjectStoreModule, ToolRegistryModule],
  controllers: [GraphsController],
  providers: [GraphRunnerService, GraphValidatorService],
})
export class GraphRunnerModule {}
