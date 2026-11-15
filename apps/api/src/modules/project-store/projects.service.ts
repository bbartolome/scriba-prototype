import { rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import {
  PLATFORM_ERROR_CODES,
  PLATFORM_ERROR_STATUS,
} from '@bbartolome/scriba-contracts/platform';
import {
  DEFAULT_GENRE_PACK,
  PROJECT_ERROR_CODES,
  PROJECT_ERROR_STATUS,
  type NewProjectRequest,
  type ProjectSummary,
} from '@bbartolome/scriba-contracts/project-store';
import { ModuleError } from '../platform/platform.module';
import { writeFileAtomic } from './atomic-write';
import {
  discoverProjects,
  summaryOf,
  type DiscoveredProject,
} from './project-discovery';
import {
  appendGitignoreLine,
  LAYOUT_FOLDERS,
  reserveProjectFolder,
  slugFromTitle,
} from './project-folders';
import { newProjectYaml } from './project-yaml';
import { ProjectStoreService } from './project-store.service';

const PROJECT_YAML = 'project.yaml';

// Every message of the project list and its commands. Fixed strings only; no input value is echoed.
export const PROJECT_MESSAGES = {
  NO_FOLDER_NAME:
    'A folder name cannot be made from this title. Give a folder name.',
  EXISTS: 'A folder with that name already exists in the library.',
  NOT_FOUND: 'No project with that id was found in the library.',
  ALREADY_PROJECT: 'That folder already holds a project.',
  TOO_NEW:
    'That project.yaml has a newer schema version than this app supports.',
  INVALID: 'project.yaml is not valid. The details list each issue.',
} as const;

// The project list, New and Import. Every file access goes through the Project store's path check.
@Injectable()
export class ProjectsService {
  constructor(private readonly store: ProjectStoreService) {}

  // The id of the active project, read from the Project store (S11).
  activeId(): string | null {
    return this.store.activeId();
  }

  discover(): DiscoveredProject[] {
    return discoverProjects(this.store, this.activeId());
  }

  find(id: string): DiscoveredProject | undefined {
    return this.discover().find((project) => project.id === id);
  }

  // New (P10): reserves the folder, scaffolds the layout, and writes project.yaml last as the commit point.
  create(request: NewProjectRequest): ProjectSummary {
    const { title, genrePack } = request;
    const name = request.folderName ?? slugFromTitle(title);
    if (name === undefined) {
      throw new ModuleError(
        PLATFORM_ERROR_CODES.VALIDATION_FAILED,
        PLATFORM_ERROR_STATUS.PLATFORM_VALIDATION_FAILED,
        PROJECT_MESSAGES.NO_FOLDER_NAME,
      );
    }
    const libraryRoot = this.store.libraryRoot;
    if (!reserveProjectFolder(libraryRoot, name)) {
      throw new ModuleError(
        PROJECT_ERROR_CODES.EXISTS,
        PROJECT_ERROR_STATUS.PROJECT_EXISTS,
        PROJECT_MESSAGES.EXISTS,
      );
    }
    const root = join(libraryRoot, name);
    try {
      for (const folder of LAYOUT_FOLDERS) {
        mkdirSync(join(root, folder));
      }
      appendGitignoreLine(this.store, root);
      writeFileAtomic(
        this.store.resolvePath(root, PROJECT_YAML).realPath,
        newProjectYaml({ title, genrePack }).toString(),
      );
    } catch (error) {
      rmSync(root, { recursive: true, force: true });
      throw error;
    }
    return summaryOf(name, { status: 'ok', title, genrePack }, this.activeId());
  }

  // Import (P13): applies to an importable folder only. The .scriba/ line goes into .gitignore first and
  // project.yaml is written last, so a refused write leaves the folder importable.
  importProject(projectId: string): ProjectSummary {
    const project = this.find(projectId);
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
        throw new ModuleError(
          PROJECT_ERROR_CODES.EXISTS,
          PROJECT_ERROR_STATUS.PROJECT_EXISTS,
          PROJECT_MESSAGES.ALREADY_PROJECT,
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
      case 'importable':
        break;
    }
    appendGitignoreLine(this.store, project.root);
    const title = project.id;
    writeFileAtomic(
      this.store.resolvePath(project.root, PROJECT_YAML).realPath,
      newProjectYaml({ title, genrePack: DEFAULT_GENRE_PACK }).toString(),
    );
    return summaryOf(
      project.id,
      { status: 'ok', title, genrePack: DEFAULT_GENRE_PACK },
      this.activeId(),
    );
  }
}
