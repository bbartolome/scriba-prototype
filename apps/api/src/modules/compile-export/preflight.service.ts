import { Injectable } from '@nestjs/common';
import {
  type PreflightCheck,
  type PreflightFinding,
  type PreflightResult,
} from '@bbartolome/scriba-contracts/compile-export';
import {
  PROJECT_ERROR_CODES,
  PROJECT_ERROR_STATUS,
  type FileEntry,
} from '@bbartolome/scriba-contracts/project-store';
import { ModuleError } from '../platform/platform.module';
import {
  EntitiesService,
  FilesService,
  ProjectStoreService,
} from '../project-store/project-store.module';
import { ManuscriptService } from './manuscript.service';
import {
  bannedPhrasesCheck,
  entityLinksCheck,
} from './preflight-links-phrases';
import {
  orphanScenesCheck,
  unsupportedClaimsCheck,
} from './preflight-claims-orphans';
import {
  placeholdersCheck,
  type LinkTarget,
  type PreflightFile,
  type PreflightInput,
  type PreflightRunner,
} from './preflight-checks';

const NO_ACTIVE_MESSAGE = 'No project is active. Activate a project first.';

// The registered checks, in the order `checks` lists them (P9). CEX-06 and CEX-07 append to it.
const PREFLIGHT_RUNNERS: PreflightRunner[] = [
  placeholdersCheck,
  unsupportedClaimsCheck,
  orphanScenesCheck,
  entityLinksCheck,
  bannedPhrasesCheck,
];

// The status of a check (P8): any error fails it, else any warning warns it, else it passes.
function statusOf(findings: PreflightFinding[]): PreflightCheck['status'] {
  if (findings.some((finding) => finding.severity === 'error')) return 'fail';
  if (findings.some((finding) => finding.severity === 'warning')) return 'warn';
  return 'pass';
}

// Preflight over the assembled manuscript files (S1 to S10). It is model-free and writes nothing (S6, S7).
@Injectable()
export class PreflightService {
  constructor(
    private readonly store: ProjectStoreService,
    private readonly files: FilesService,
    private readonly manuscript: ManuscriptService,
    private readonly entities: EntitiesService,
  ) {}

  // Runs every registered check on the active project (P11 to P13, P16). `now` is the time of the run.
  run(now: Date): PreflightResult {
    const projectId = this.activeProjectId();
    const view = this.manuscript.view();
    const files: PreflightFile[] = view.entries.map((entry) => {
      const read = this.files.read(projectId, entry.path);
      return {
        path: entry.path,
        part: entry.part,
        content: read.content,
        hash: read.hash,
      };
    });
    const { graphs, paths } = this.manuscript.storyGraphs(projectId);
    const storyGraphs = graphs.map((graph, index) => ({
      path: paths[index] ?? '',
      graph,
    }));
    const readText = (path: string): string | undefined => {
      try {
        return this.files.read(projectId, path).content;
      } catch {
        return undefined;
      }
    };
    const input: PreflightInput = {
      projectId,
      view,
      files,
      storyGraphs,
      readText,
      resolveIds: (ids) => this.entities.resolve(projectId, ids),
      targetOf: this.targetOf(projectId),
    };
    const checks: PreflightCheck[] = PREFLIGHT_RUNNERS.map((runner) => {
      const findings: PreflightFinding[] = runner
        .run(input)
        .map((finding) => ({ check: runner.id, ...finding }));
      return { id: runner.id, status: statusOf(findings), findings };
    });
    return { ranAt: now.toISOString(), revision: view.revision, checks };
  }

  // What a project-relative path is (P7). Each parent folder is listed once per run. A missing path gives `missing`,
  // a path the store refuses gives `refused` (D7), and a listed entry of kind `file` gives `file`.
  private targetOf(projectId: string): (path: string) => LinkTarget {
    const listings = new Map<string, FileEntry[]>();
    return (path) => {
      const slash = path.lastIndexOf('/');
      const parent = slash < 0 ? '.' : path.slice(0, slash);
      const name = path.slice(slash + 1);
      try {
        let entries = listings.get(parent);
        if (entries === undefined) {
          entries = this.files.list(projectId, { path: parent }).entries;
          listings.set(parent, entries);
        }
        const entry = entries.find(
          (candidate) => candidate.path.split('/').pop() === name,
        );
        return entry?.kind === 'file' ? 'file' : 'missing';
      } catch (error) {
        if (
          error instanceof ModuleError &&
          error.code === PROJECT_ERROR_CODES.NOT_FOUND
        ) {
          return 'missing';
        }
        if (error instanceof ModuleError) return 'refused';
        throw error;
      }
    };
  }

  // The active project's id (P13): a copy of AssemblyService's check, with its message.
  private activeProjectId(): string {
    const projectId = this.store.activeId();
    if (projectId === null) {
      throw new ModuleError(
        PROJECT_ERROR_CODES.NO_ACTIVE,
        PROJECT_ERROR_STATUS.PROJECT_NO_ACTIVE,
        NO_ACTIVE_MESSAGE,
      );
    }
    return projectId;
  }
}
