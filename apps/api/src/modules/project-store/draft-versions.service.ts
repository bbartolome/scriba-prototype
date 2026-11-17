import { lstatSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import {
  PROJECT_ERROR_CODES,
  type DraftRestore,
  type DraftVersionList,
  type DraftVersionRead,
} from '@bbartolome/scriba-contracts/project-store';
import {
  compareNewestFirst,
  createdAtOf,
  isTopLevelDraft,
  isVersionId,
  saveVersion,
  versionFolderOf,
} from './draft-versions';
import {
  decodeText,
  FILE_MESSAGES,
  FilesService,
  readFileAt,
  refuse,
} from './files.service';
import type { DiscoveredProject } from './project-discovery';
import type { ResolvedProjectPath } from './path-safety';
import { ProjectStoreService } from './project-store.service';
import { PROJECT_MESSAGES, ProjectsService } from './projects.service';

// The two messages of the version routes. Fixed strings only; no input value is echoed.
const VERSION_MESSAGES = {
  NOT_TOP_LEVEL: 'Versions belong to a top-level draft in drafts/.',
  NO_VERSION: 'No version of this draft has that id.',
} as const;

// The versions of a top-level draft: the list, the read, and the restore (PST-18 D1 to D3). Every call runs the
// active check and the lookup of the project (D9), then the one path check (D8).
@Injectable()
export class DraftVersionsService {
  constructor(
    private readonly store: ProjectStoreService,
    private readonly projects: ProjectsService,
    private readonly files: FilesService,
  ) {}

  // The versions of a draft, newest first. A missing folder gives an empty list (D10, D15).
  list(projectId: string, draftPath: string): DraftVersionList {
    const project = this.projectFor(projectId);
    const draft = this.draftOf(project, draftPath);
    const folder = versionFolderOf(project, draft.relativePath, false);
    if (folder === undefined) {
      return { draftPath: draft.relativePath, versions: [] };
    }
    const versions = readdirSync(folder)
      .filter((name) => isVersionId(name))
      .filter((name) => lstatSync(join(folder, name)).isFile())
      .sort(compareNewestFirst)
      .map((id) => ({
        id,
        createdAt: createdAtOf(id),
        size: lstatSync(join(folder, id)).size,
      }));
    return { draftPath: draft.relativePath, versions };
  }

  // The stored text of one version. It only reads (D10, D16).
  read(projectId: string, draftPath: string, id: string): DraftVersionRead {
    const project = this.projectFor(projectId);
    const draft = this.draftOf(project, draftPath);
    const version = this.versionFile(project, draft.relativePath, id);
    return {
      draftPath: draft.relativePath,
      id,
      content: this.readVersion(version),
    };
  }

  // Saves the current text as a new version, then writes the restored text to the draft (D17). Every refusal comes
  // before the first write, and the steps are synchronous.
  restore(projectId: string, body: DraftRestore): DraftVersionRead {
    const project = this.projectFor(projectId);
    const draft = this.draftOf(project, body.draftPath);
    const version = this.versionFile(project, draft.relativePath, body.id);
    const restoredText = this.readVersion(version);
    const current = readFileAt(draft);
    saveVersion(project, draft.relativePath, current.bytes, new Date());
    this.files.write(projectId, {
      path: draft.relativePath,
      content: restoredText,
    });
    return {
      draftPath: draft.relativePath,
      id: body.id,
      content: restoredText,
    };
  }

  // The active check, then the lookup (D9), in the order of PendingService.openChangeOf.
  private projectFor(projectId: string): DiscoveredProject {
    this.store.requireActive(projectId);
    const project = this.projects.find(projectId);
    if (project === undefined) {
      throw refuse(PROJECT_ERROR_CODES.NOT_FOUND, PROJECT_MESSAGES.NOT_FOUND);
    }
    return project;
  }

  // The one path check (D8), then the rule that versions belong to top-level drafts (D5, D15).
  private draftOf(
    project: DiscoveredProject,
    draftPath: string,
  ): ResolvedProjectPath {
    const target = this.store.resolvePath(project.root, draftPath);
    if (!isTopLevelDraft(target.relativePath)) {
      throw refuse(
        PROJECT_ERROR_CODES.PATH_INVALID,
        VERSION_MESSAGES.NOT_TOP_LEVEL,
      );
    }
    return target;
  }

  // The real file of one version (D14). A malformed id, a missing folder and a missing file are all not found, and
  // the id is checked before any disk access.
  private versionFile(
    project: DiscoveredProject,
    draftPath: string,
    id: string,
  ): ResolvedProjectPath {
    if (!isVersionId(id)) {
      throw refuse(PROJECT_ERROR_CODES.NOT_FOUND, VERSION_MESSAGES.NO_VERSION);
    }
    const folder = versionFolderOf(project, draftPath, false);
    if (folder === undefined) {
      throw refuse(PROJECT_ERROR_CODES.NOT_FOUND, VERSION_MESSAGES.NO_VERSION);
    }
    const realPath = join(folder, id);
    const stats = (() => {
      try {
        return lstatSync(realPath);
      } catch {
        return undefined;
      }
    })();
    if (stats === undefined || !stats.isFile()) {
      throw refuse(PROJECT_ERROR_CODES.NOT_FOUND, VERSION_MESSAGES.NO_VERSION);
    }
    return {
      relativePath: `drafts/.versions/${basename(draftPath)}/${id}`,
      realPath,
      isRoot: false,
      exists: true,
    };
  }

  // The text of one version (D16): over the cap gives 413 and bytes that are not text give 415.
  private readVersion(version: ResolvedProjectPath): string {
    const { bytes } = readFileAt(version);
    const text = decodeText(bytes);
    if (text === undefined) {
      throw refuse(PROJECT_ERROR_CODES.NOT_TEXT, FILE_MESSAGES.NOT_TEXT);
    }
    return text;
  }
}
