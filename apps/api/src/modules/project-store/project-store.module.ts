import { Module } from '@nestjs/common';
import { PlatformModule, SettingsService } from '../platform/platform.module';
import { ActiveProjectController } from './active-project.controller';
import { ActiveProjectService } from './active-project.service';
import { PROJECTS_SECTION_DEF } from './project-store.section';
import { ProjectStoreService } from './project-store.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

// Modules outside project-store import these from this entry file only.
export { ProjectStoreService } from './project-store.service';
export type { ResolvedProjectPath } from './path-safety';

const PROJECT_STORE_SECTION_REGISTRATION = 'PROJECT_STORE_SECTION_REGISTRATION';

// The Project store: the projects section of settings.yaml, the project list and its commands, and the in-process
// path-check provider.
@Module({
  imports: [PlatformModule],
  controllers: [ProjectsController, ActiveProjectController],
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
  ],
  exports: [ProjectStoreService],
})
export class ProjectStoreModule {}
