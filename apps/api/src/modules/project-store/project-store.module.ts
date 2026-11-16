import { Module } from '@nestjs/common';
import { PlatformModule, SettingsService } from '../platform/platform.module';
import { ActiveProjectController } from './active-project.controller';
import { ActiveProjectService } from './active-project.service';
import { EntitiesController } from './entities.controller';
import { EntitiesService } from './entities.service';
import { EntityManifest } from './entity-manifest';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { PendingController } from './pending.controller';
import { PendingService } from './pending.service';
import { PROJECTS_SECTION_DEF } from './project-store.section';
import { ProjectStoreService } from './project-store.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { SamplesController } from './samples.controller';
import { SamplesService } from './samples.service';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

// Modules outside project-store import these from this entry file only.
export { ProjectStoreService } from './project-store.service';
export { FilesService } from './files.service';
export { EntitiesService } from './entities.service';
export { EntityManifest } from './entity-manifest';
export { SearchService } from './search.service';
export { PendingService } from './pending.service';
export { ProjectsService } from './projects.service';
export type { ResolvedProjectPath } from './path-safety';

const PROJECT_STORE_SECTION_REGISTRATION = 'PROJECT_STORE_SECTION_REGISTRATION';

// The Project store: the projects section of settings.yaml, the project list and its commands, and the in-process
// path-check provider.
@Module({
  imports: [PlatformModule],
  controllers: [
    ProjectsController,
    ActiveProjectController,
    SamplesController,
    SearchController,
    FilesController,
    EntitiesController,
    PendingController,
  ],
  providers: [
    {
      provide: PROJECT_STORE_SECTION_REGISTRATION,
      inject: [SettingsService],
      useFactory: (settings: SettingsService): true => {
        settings.register(PROJECTS_SECTION_DEF);
        return true;
      },
    },
    ProjectStoreService,
    ProjectsService,
    ActiveProjectService,
    SamplesService,
    FilesService,
    EntityManifest,
    EntitiesService,
    PendingService,
    SearchService,
  ],
  exports: [
    ProjectStoreService,
    ProjectsService,
    FilesService,
    EntitiesService,
    EntityManifest,
    PendingService,
    SearchService,
  ],
})
export class ProjectStoreModule {}
