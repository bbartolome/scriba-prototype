import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_ERROR_CODES,
  PROJECT_ERROR_STATUS,
  projectsSectionSchema,
  type ProjectSwitchedData,
} from '@bbartolome/scriba-contracts/project-store';
import {
  ModuleError,
  SCRIBA_ENV,
  SettingsService,
  type ScribaEnv,
} from '../platform/platform.module';
import { resolveProjectPath, type ResolvedProjectPath } from './path-safety';
import type { FilesChangedData } from '@bbartolome/scriba-contracts/project-store';

// A handler of project-switched. It runs before the switch is persisted, so it reads the new id from the event.
export type ProjectSwitchedHandler = (event: ProjectSwitchedData) => void;

// A handler of files-changed from the file API or the watcher. It must catch its own errors (PST-16 D17).
export type FilesChangedHandler = (event: FilesChangedData) => void;

// The two messages of the active-project check. Fixed strings only; no input value is echoed.
const ACTIVE_MESSAGES = {
  NO_ACTIVE: 'No project is active. Activate a project first.',
  NOT_ACTIVE: 'That project is not the active project.',
} as const;

// The in-process API of the Project store. Other modules inject it through the module's entry file.
@Injectable()
export class ProjectStoreService {
  private readonly switchHandlers: ProjectSwitchedHandler[] = [];
  private readonly filesChangedHandlers: FilesChangedHandler[] = [];

  constructor(
    @Inject(SCRIBA_ENV) private readonly env: ScribaEnv,
    private readonly settings: SettingsService,
  ) {}

  // The library root as configured (SCRIBA_BOOKS_DIR), not realpathed.
  get libraryRoot(): string {
    return this.env.SCRIBA_BOOKS_DIR;
  }

  // The one path check. Reserved paths are refused.
  resolvePath(projectRoot: string, path: string): ResolvedProjectPath {
    return resolveProjectPath(projectRoot, path);
  }

  // The id of the active project from the projects section, or null when none is set (S11).
  activeId(): string | null {
    const section = projectsSectionSchema.safeParse(
      this.settings.read('projects'),
    );
    return section.success ? section.data.active : null;
  }

  // Adds a handler of project-switched. Handlers run in registration order, once per switch.
  onProjectSwitched(handler: ProjectSwitchedHandler): void {
    this.switchHandlers.push(handler);
  }

  // Calls every handler with the switch. No exception is caught here: a throw fails the switch.
  notifyProjectSwitched(event: ProjectSwitchedData): void {
    for (const handler of this.switchHandlers) {
      handler(event);
    }
  }

  // Adds a handler of files-changed. Handlers run in registration order, once per notification.
  onFilesChanged(handler: FilesChangedHandler): void {
    this.filesChangedHandlers.push(handler);
  }

  // Calls every handler with the paths that changed on disk (PST-16 D17). No exception is caught here.
  notifyFilesChanged(event: FilesChangedData): void {
    for (const handler of this.filesChangedHandlers) {
      handler(event);
    }
  }

  // The active-project check (D10). It compares ids only and never looks up the folder.
  requireActive(projectId: string): void {
    const active = this.activeId();
    if (active === null) {
      throw new ModuleError(
        PROJECT_ERROR_CODES.NO_ACTIVE,
        PROJECT_ERROR_STATUS.PROJECT_NO_ACTIVE,
        ACTIVE_MESSAGES.NO_ACTIVE,
      );
    }
    if (active !== projectId) {
      throw new ModuleError(
        PROJECT_ERROR_CODES.NOT_ACTIVE,
        PROJECT_ERROR_STATUS.PROJECT_NOT_ACTIVE,
        ACTIVE_MESSAGES.NOT_ACTIVE,
      );
    }
  }
}
