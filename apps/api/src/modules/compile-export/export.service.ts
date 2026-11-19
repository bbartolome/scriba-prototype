import { randomBytes } from 'node:crypto';
import { lstatSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  COMPILE_ERROR_STATUS,
  EXPORT_DOWNLOAD_ROUTE,
  type ExportFormat,
  type ExportResult,
  type PreflightResult,
  type PreflightSummary,
} from '@bbartolome/scriba-contracts/compile-export';
import {
  PROJECT_ERROR_CODES,
  PROJECT_ERROR_STATUS,
} from '@bbartolome/scriba-contracts/project-store';
import { EventsPublisher, ModuleError } from '../platform/platform.module';
import {
  FilesService,
  ProjectStoreService,
  ProjectsService,
} from '../project-store/project-store.module';
import { AssemblyService } from './assembly.service';
import {
  DEFAULT_PANDOC_TUNING,
  PANDOC_TUNING,
  type PandocTuning,
} from './export-tuning';
import { ManuscriptService } from './manuscript.service';
import { PreflightService } from './preflight.service';
import { runPandoc } from './pandoc-runner';
import { slugOf, stampOf } from './snapshot-names';

// Fixed messages of this module. No input value is echoed.
const NO_ACTIVE_MESSAGE = 'No project is active. Activate a project first.';
const BUSY_MESSAGE = 'An export of this project is already running.';
const EMPTY_MESSAGE = 'The manuscript has no files to export.';
const NOT_EXPORTED_MESSAGE = 'No export of this format exists yet.';
const OUTSIDE_MESSAGE = 'The export folder is outside the project.';

// The content type of each format (D21).
const CONTENT_TYPES: Record<ExportFormat, string> = {
  md: 'text/markdown; charset=utf-8',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  epub: 'application/epub+zip',
  pdf: 'application/pdf',
};

// What the download GET needs to stream a file.
export interface ExportFile {
  path: string;
  fileName: string;
  bytes: number;
  type: string;
}

// The counts of a preflight run (D13).
export function summaryOf(result: PreflightResult): PreflightSummary {
  const counts = { errors: 0, warnings: 0, infos: 0 };
  for (const check of result.checks) {
    for (const finding of check.findings) {
      if (finding.severity === 'error') counts.errors += 1;
      else if (finding.severity === 'warning') counts.warnings += 1;
      else counts.infos += 1;
    }
  }
  return {
    ranAt: result.ranAt,
    revision: result.revision,
    ...counts,
  };
}

// Compile & export: the export run and the download of its file (P1 to P13). The active project only.
@Injectable()
export class ExportService {
  // The projects with an export running. A second export of one of them is refused (D10).
  private readonly busy = new Set<string>();
  private readonly tuning: PandocTuning;

  constructor(
    private readonly store: ProjectStoreService,
    private readonly projects: ProjectsService,
    private readonly files: FilesService,
    private readonly manuscript: ManuscriptService,
    private readonly assembly: AssemblyService,
    private readonly preflight: PreflightService,
    private readonly events: EventsPublisher,
    @Optional() @Inject(PANDOC_TUNING) tuning?: Partial<PandocTuning>,
  ) {
    this.tuning = { ...DEFAULT_PANDOC_TUNING, ...tuning };
  }

  // Runs preflight, assembles the Markdown and writes the file of `format` (D11). The preflight summary is attached
  // and never blocks the export.
  async export(format: ExportFormat): Promise<ExportResult> {
    const projectId = this.activeProjectId();
    if (this.busy.has(projectId)) {
      throw new ModuleError(
        'COMPILE_EXPORT_BUSY',
        COMPILE_ERROR_STATUS.COMPILE_EXPORT_BUSY,
        BUSY_MESSAGE,
      );
    }
    this.busy.add(projectId);
    let partial: string | undefined;
    try {
      const now = new Date();
      const preflight = summaryOf(this.preflight.run(now));
      const view = this.manuscript.view();
      if (view.entries.length === 0) {
        throw new ModuleError(
          'COMPILE_EMPTY_MANUSCRIPT',
          COMPILE_ERROR_STATUS.COMPILE_EMPTY_MANUSCRIPT,
          EMPTY_MESSAGE,
        );
      }
      const markdown = this.assembly.assemble(now);
      const project = this.projectOf(projectId);
      const root = project.root;
      // An unset title gives the empty slug, which slugOf turns into `snapshot`. The assembly has already read it.
      const title = project.summary.title ?? '';
      const stamp = stampOf(now);
      const fileName = `${slugOf(title)}-${stamp.slice(0, 8)}-${stamp.slice(9, 13)}.${format}`;
      const exportsDir = this.exportsFolder(projectId);
      await mkdir(exportsDir, { recursive: true });
      partial = join(
        exportsDir,
        `.${randomBytes(8).toString('hex')}.${format}`,
      );

      let warnings: string[] = [];
      let bytes: number;
      if (format === 'md') {
        await writeFile(partial, markdown, 'utf8');
        bytes = Buffer.byteLength(markdown, 'utf8');
      } else {
        warnings = await runPandoc(
          this.tuning,
          format,
          markdown,
          root,
          partial,
        );
        bytes = (await stat(partial)).size;
      }

      const target = join(exportsDir, fileName);
      await rename(partial, target);
      partial = undefined;
      await this.keepOnly(exportsDir, format, fileName);
      this.events.publish({
        module: 'compile-export',
        type: 'export-finished',
        data: { projectId, format, fileName },
      });
      return {
        format,
        fileName,
        bytes,
        downloadUrl: EXPORT_DOWNLOAD_ROUTE.replace(':format', format),
        preflight,
        warnings,
      };
    } catch (error) {
      if (partial !== undefined) await rm(partial, { force: true });
      throw error;
    } finally {
      this.busy.delete(projectId);
    }
  }

  // The newest export file of `format` in the active project, read without any write (D19, D20).
  download(format: ExportFormat): ExportFile {
    const projectId = this.activeProjectId();
    const project = this.projectOf(projectId);
    const exportsDir = this.existingExportsFolder(projectId, project.root);
    const candidates = readdirSync(exportsDir)
      .filter((name) => !name.startsWith('.') && name.endsWith(`.${format}`))
      .map((name) => {
        const path = join(exportsDir, name);
        return { name, path, stats: lstatSync(path) };
      })
      .filter((candidate) => candidate.stats.isFile())
      .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs);
    const newest = candidates[0];
    if (newest === undefined) {
      throw new NotFoundException(NOT_EXPORTED_MESSAGE);
    }
    return {
      path: newest.path,
      fileName: newest.name,
      bytes: newest.stats.size,
      type: CONTENT_TYPES[format],
    };
  }

  // The exports folder of the project. The module folder is created by the file API's stateDir (D11, step 6).
  private exportsFolder(projectId: string): string {
    return join(this.files.stateDir(projectId, 'compile-export'), 'exports');
  }

  // The exports folder when it exists, checked to lie inside the project (D19). Nothing is created.
  private existingExportsFolder(projectId: string, root: string): string {
    const folder = join(root, '.scriba', 'compile-export', 'exports');
    try {
      statSync(folder);
    } catch {
      throw new NotFoundException(NOT_EXPORTED_MESSAGE);
    }
    const expected = join(
      realpathSync.native(root),
      '.scriba',
      'compile-export',
      'exports',
    );
    if (realpathSync.native(folder) !== expected) {
      throw new ModuleError(
        PROJECT_ERROR_CODES.PATH_OUTSIDE,
        PROJECT_ERROR_STATUS.PROJECT_PATH_OUTSIDE,
        OUTSIDE_MESSAGE,
      );
    }
    return folder;
  }

  // Keeps the file just written and deletes the older ones of the same format (D17).
  private async keepOnly(
    exportsDir: string,
    format: ExportFormat,
    fileName: string,
  ): Promise<void> {
    const names = await readdir(exportsDir);
    await Promise.all(
      names
        .filter(
          (name) =>
            name !== fileName &&
            !name.startsWith('.') &&
            name.endsWith(`.${format}`),
        )
        .map((name) => rm(join(exportsDir, name), { force: true })),
    );
  }

  // The active project's id, refused with the project store's code when none is active (P13).
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

  // The discovered project of an id. The active project is always listed, so a miss is refused as not found.
  private projectOf(projectId: string) {
    const project = this.projects.find(projectId);
    if (project === undefined) {
      throw new ModuleError(
        PROJECT_ERROR_CODES.NOT_FOUND,
        PROJECT_ERROR_STATUS.PROJECT_NOT_FOUND,
        'The project was not found.',
      );
    }
    return project;
  }
}
