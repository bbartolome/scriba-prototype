import {
  PROJECT_ERROR_CODES,
  PROJECT_ERROR_STATUS,
} from '@bbartolome/scriba-contracts/project-store';
import { ModuleError } from '../platform/platform.module';
import type { DiscoveredProject } from './project-discovery';
import { PROJECT_MESSAGES } from './projects.service';

// The message of a folder that has no project.yaml yet. Fixed string; no input value is echoed.
export const NOT_A_PROJECT_MESSAGE =
  'That folder has no project.yaml yet. Import it first.';

// The one status rule of the in-process writers (appendLog and propose). A missing folder, an importable folder,
// an invalid project.yaml and a too-new one are each refused with the same code, status and text in both places.
export function requireOkProject(
  found: DiscoveredProject | undefined,
): DiscoveredProject {
  if (found === undefined) {
    throw new ModuleError(
      PROJECT_ERROR_CODES.NOT_FOUND,
      PROJECT_ERROR_STATUS.PROJECT_NOT_FOUND,
      PROJECT_MESSAGES.NOT_FOUND,
    );
  }
  const state = found.yaml;
  switch (state.status) {
    case 'ok':
      return found;
    case 'importable':
      throw new ModuleError(
        PROJECT_ERROR_CODES.NOT_FOUND,
        PROJECT_ERROR_STATUS.PROJECT_NOT_FOUND,
        NOT_A_PROJECT_MESSAGE,
      );
    case 'invalid':
      throw new ModuleError(
        PROJECT_ERROR_CODES.INVALID,
        PROJECT_ERROR_STATUS.PROJECT_INVALID,
        PROJECT_MESSAGES.INVALID,
        state.issues,
      );
    case 'too-new':
      throw new ModuleError(
        PROJECT_ERROR_CODES.SCHEMA_TOO_NEW,
        PROJECT_ERROR_STATUS.PROJECT_SCHEMA_TOO_NEW,
        PROJECT_MESSAGES.TOO_NEW,
      );
  }
}
