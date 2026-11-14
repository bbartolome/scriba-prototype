import { readdirSync, readFileSync, statSync, type Dirent } from 'node:fs';
import { join } from 'node:path';
import {
  FILE_SIZE_CAP_BYTES,
  type ProjectSummary,
} from '@bbartolome/scriba-contracts/project-store';
import { ModuleError } from '../platform/platform.module';
import type { ResolvedProjectPath } from './path-safety';
import type { ProjectStoreService } from './project-store.service';
import { invalidState, readYamlState, type YamlState } from './project-yaml';

const PROJECT_YAML = 'project.yaml';

// One project folder of the library. root and yaml never leave the service: the controller maps summary only.
export interface DiscoveredProject {
  id: string;
  root: string; // absolute
  summary: ProjectSummary;
  yaml: YamlState;
}

// Lists the immediate, non-dot folders of the library, sorted by name (P1, P2, P8). Reads only.
export function discoverProjects(
  store: ProjectStoreService,
  activeId: string | null,
): DiscoveredProject[] {
  const library = store.libraryRoot;
  return readdirSync(library, { withFileTypes: true })
    .filter(
      (entry) =>
        !entry.name.startsWith('.') && isProjectFolder(store, library, entry),
    )
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map((entry) => {
      const root = join(library, entry.name);
      const yaml = readProjectYamlFile(store, root);
      return {
        id: entry.name,
        root,
        summary: summaryOf(entry.name, yaml, activeId),
        yaml,
      };
    });
}

// The list entry of one folder (P4, P9). The active flag is set whatever the status.
export function summaryOf(
  id: string,
  yaml: YamlState,
  activeId: string | null,
): ProjectSummary {
  const active = id === activeId;
  switch (yaml.status) {
    case 'importable':
      return { id, active, status: 'importable' };
    case 'too-new':
      return { id, active, status: 'too-new' };
    case 'invalid':
      return { id, active, status: 'invalid', error: yaml.error };
    case 'ok':
      return {
        id,
        title: yaml.title,
        genrePack: yaml.genrePack,
        active,
        status: 'ok',
      };
  }
}

// Reads and classifies the project.yaml of one folder (P5 to P7). A folder without one is importable.
export function readProjectYamlFile(
  store: ProjectStoreService,
  root: string,
): YamlState {
  let target: ResolvedProjectPath;
  try {
    target = store.resolvePath(root, PROJECT_YAML);
  } catch (error) {
    if (error instanceof ModuleError) {
      return invalidState([{ path: [], message: error.message }]);
    }
    throw error;
  }
  if (!target.exists) return { status: 'importable' };

  let text: string;
  try {
    if (statSync(target.realPath).size > FILE_SIZE_CAP_BYTES) {
      return invalidState([
        {
          path: [],
          message: 'project.yaml is larger than the 5 MiB cap.',
        },
      ]);
    }
    text = readFileSync(target.realPath, 'utf8');
  } catch (error) {
    return invalidState([
      {
        path: [],
        message: `project.yaml could not be read (${errnoOf(error)}).`,
      },
    ]);
  }
  return readYamlState(text);
}

// A real folder, or a top-level link whose target lies inside the library and is a folder (P2). A link that
// leads outside the library is not a subfolder of it, so it is not listed.
function isProjectFolder(
  store: ProjectStoreService,
  library: string,
  entry: Dirent,
): boolean {
  if (entry.isDirectory()) return true;
  if (!entry.isSymbolicLink()) return false;
  try {
    const target = store.resolvePath(library, entry.name);
    return statSync(target.realPath).isDirectory();
  } catch (error) {
    if (error instanceof ModuleError) return false;
    throw error;
  }
}

function errnoOf(error: unknown): string {
  return (error as NodeJS.ErrnoException).code ?? 'unknown';
}
