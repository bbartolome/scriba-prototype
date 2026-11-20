import { Injectable } from '@nestjs/common';
import {
  PROJECT_ERROR_CODES,
  PROJECT_ERROR_STATUS,
  PROJECTS_SECTION_SCHEMA_VERSION,
  type ActiveProject,
  type ProjectSwitchedData,
} from '@bbartolome/scriba-contracts/project-store';
import {
  EventsPublisher,
  ModuleError,
  SettingsService,
} from '../platform/platform.module';
import { FilesService } from './files.service';
import { ProjectStoreService } from './project-store.service';
import { PROJECT_MESSAGES, ProjectsService } from './projects.service';

// Activation of one project, the POST of the active route (D2, D7). The order of the steps is the order of the
// unit: find and refuse, the same project again, the migration point, the hooks, the write, the event, the answer.
@Injectable()
export class ActiveProjectService {
  constructor(
    private readonly store: ProjectStoreService,
    private readonly projects: ProjectsService,
    private readonly settings: SettingsService,
    private readonly events: EventsPublisher,
    private readonly files: FilesService,
  ) {}

  activate(projectId: string): ActiveProject {
    // (1) The target is looked up in the discovered list only, and refused in the states of import (D3 to D5).
    const project = this.projects.find(projectId);
    if (project === undefined) {
      throw new ModuleError(
        PROJECT_ERROR_CODES.NOT_FOUND,
        PROJECT_ERROR_STATUS.PROJECT_NOT_FOUND,
        PROJECT_MESSAGES.NOT_FOUND,
      );
    }
    const state = project.yaml;
    switch (state.status) {
      case 'ok':
        break;
      case 'importable':
        throw new ModuleError(
          PROJECT_ERROR_CODES.NOT_FOUND,
          PROJECT_ERROR_STATUS.PROJECT_NOT_FOUND,
          PROJECT_MESSAGES.NOT_FOUND,
        );
      case 'too-new':
        throw new ModuleError(
          PROJECT_ERROR_CODES.SCHEMA_TOO_NEW,
          PROJECT_ERROR_STATUS.PROJECT_SCHEMA_TOO_NEW,
          PROJECT_MESSAGES.TOO_NEW,
        );
      case 'invalid':
        throw new ModuleError(
          PROJECT_ERROR_CODES.INVALID,
          PROJECT_ERROR_STATUS.PROJECT_INVALID,
          PROJECT_MESSAGES.INVALID,
          state.issues,
        );
    }

    // (2) The project that is already active: nothing changes, and no hook, write or event follows (D6).
    const previous = this.store.activeId();
    if (previous === projectId) {
      return { active: projectId };
    }

    // (3) The project.yaml lazy migration runs here, before the hooks (D7). A step that throws refuses the activation
    // with nothing written (PST-23 C10).
    this.files.upgradeProjectYaml(project);

    // (4) Every hook is called with {from, to} before anything is written or published (D7, D8).
    const event: ProjectSwitchedData = { from: previous, to: projectId };
    this.store.notifyProjectSwitched(event);

    // (5) The projects section is written with the new active id (D1).
    this.settings.write('projects', {
      schemaVersion: PROJECTS_SECTION_SCHEMA_VERSION,
      active: projectId,
    });

    // (6) project-switched is published after the hooks and the write (D9).
    this.events.publish({
      module: 'project-store',
      type: 'project-switched',
      data: event,
    });

    // (7) The answer.
    return { active: projectId };
  }
}
