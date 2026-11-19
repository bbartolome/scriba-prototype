import { Injectable } from '@nestjs/common';
import { parse, stringify } from 'yaml';
import {
  snapshotManifestSchema,
  type SnapshotManifest,
  type SnapshotSummary,
} from '@bbartolome/scriba-contracts/compile-export';
import {
  PROJECT_ERROR_CODES,
  PROJECT_ERROR_STATUS,
} from '@bbartolome/scriba-contracts/project-store';
import {
  BUILD_INFO,
  EventsPublisher,
  ModuleError,
} from '../platform/platform.module';
import {
  FilesService,
  ProjectStoreService,
} from '../project-store/project-store.module';
import { ManuscriptService } from './manuscript.service';
import { extrasOf, materialise, rowsOf } from './order-write';
import { freeName, labelOfFolder, slugOf, stampOf } from './snapshot-names';

// Fixed messages of the snapshots. No input value is echoed (P14).
const NO_ACTIVE_MESSAGE = 'No project is active. Activate a project first.';

// The folder of the snapshots and the manifest file of each one (P1).
const SNAPSHOTS = 'snapshots';
const MANIFEST = 'snapshot.yaml';
const DRAFTS = 'drafts';

// One snapshot folder found under snapshots/ (P8).
interface Folder {
  id: string;
  mtime: string;
}

// The snapshot store: the list, the create and the restore of the manuscript snapshots (P1, P8 to P12). A read
// writes nothing; a create writes only its own folder, the manifest last (P4).
@Injectable()
export class SnapshotService {
  constructor(
    private readonly store: ProjectStoreService,
    private readonly files: FilesService,
    private readonly manuscript: ManuscriptService,
    private readonly events: EventsPublisher,
  ) {}

  // GET: every snapshot, newest first (P8). A missing snapshots/ folder is an empty list, and nothing is created.
  list(): SnapshotSummary[] {
    const projectId = this.activeProjectId();
    const summaries = this.folders(projectId).map((folder) =>
      this.summaryOf(projectId, folder),
    );
    return summaries.sort(
      (a, b) =>
        Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
        (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
    );
  }

  // POST create: a snapshot of the top-level manuscript files and the manifest (P1, P3 to P6, P12, P13).
  create(label: string): SnapshotSummary {
    const projectId = this.activeProjectId();
    const view = this.manuscript.view();
    const now = new Date();
    const slug = slugOf(label);
    const taken = new Set(this.folders(projectId).map((folder) => folder.id));
    const id = freeName(`${slug}-${stampOf(now)}`, taken);
    const folder = `${SNAPSHOTS}/${id}`;

    // P5: each member is copied under its own name, byte for byte (BOM kept).
    for (const entry of view.entries) {
      const name = entry.path.slice(`${DRAFTS}/`.length);
      const { content } = this.files.read(projectId, entry.path);
      this.files.write(projectId, { path: `${folder}/${name}`, content });
    }

    // P4: the manifest is checked, then written last, so an interrupted create is never a valid snapshot.
    const manifest: SnapshotManifest = snapshotManifestSchema.parse({
      schemaVersion: 1,
      label: slug,
      createdAt: now.toISOString(),
      appVersion: BUILD_INFO.version,
      order: materialise(
        rowsOf(view.entries),
        extrasOf(this.manuscript.orderField()),
      ),
      words: { body: view.totals.body, total: view.totals.manuscript },
    });
    this.files.write(projectId, {
      path: `${folder}/${MANIFEST}`,
      content: stringify(manifest),
    });

    const snapshot: SnapshotSummary = {
      id,
      label: slug,
      createdAt: manifest.createdAt,
      fileCount: view.entries.length,
      words: manifest.words,
    };
    this.events.publish({
      module: 'compile-export',
      type: 'snapshot-created',
      data: { projectId, snapshot },
    });
    return snapshot;
  }

  // The snapshot folders directly under snapshots/ (P8). The root is listed first, because a missing folder is
  // refused by the file listing.
  private folders(projectId: string): Folder[] {
    const root = this.files.list(projectId, { path: '.' });
    const folder = root.entries.find(
      (entry) => entry.path === SNAPSHOTS && entry.kind === 'dir',
    );
    if (folder === undefined) return [];
    return this.files
      .list(projectId, { path: SNAPSHOTS })
      .entries.filter((entry) => entry.kind === 'dir')
      .map((entry) => ({
        id: entry.path.slice(`${SNAPSHOTS}/`.length),
        mtime: entry.mtime,
      }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  // The summary of one folder: from its manifest when that is readable, else unreadable (P7, P8).
  private summaryOf(projectId: string, folder: Folder): SnapshotSummary {
    const manifest = this.manifestOf(projectId, folder.id);
    if (manifest === undefined) {
      return {
        id: folder.id,
        label: labelOfFolder(folder.id),
        createdAt: folder.mtime,
        fileCount: this.memberNames(projectId, folder.id).length,
        words: null,
        unreadable: true,
      };
    }
    return {
      id: folder.id,
      label: manifest.label,
      createdAt: manifest.createdAt,
      fileCount: this.memberNames(projectId, folder.id).length,
      words: manifest.words,
    };
  }

  // The manifest of a folder, or undefined when it is missing, does not parse, or names a file the folder lacks
  // (P7). Only reads.
  private manifestOf(
    projectId: string,
    id: string,
  ): SnapshotManifest | undefined {
    const folder = `${SNAPSHOTS}/${id}`;
    const hasManifest = this.files
      .list(projectId, { path: folder })
      .entries.some((entry) => entry.path === `${folder}/${MANIFEST}`);
    if (!hasManifest) return undefined;
    let manifest: SnapshotManifest;
    try {
      const text = this.files.read(projectId, `${folder}/${MANIFEST}`).content;
      manifest = snapshotManifestSchema.parse(parse(text));
    } catch {
      return undefined;
    }
    const names = new Set(this.memberNames(projectId, id));
    const complete = manifest.order.every((entry) => {
      const name = entry.path.slice(`${DRAFTS}/`.length);
      return entry.path === `${DRAFTS}/${name}` && names.has(name);
    });
    return complete ? manifest : undefined;
  }

  // The names of the top-level .md files of a folder (P6). The folder is listed, never created.
  private memberNames(projectId: string, id: string): string[] {
    return this.files
      .list(projectId, { path: `${SNAPSHOTS}/${id}` })
      .entries.filter(
        (entry) => entry.kind === 'file' && entry.path.endsWith('.md'),
      )
      .map((entry) => entry.path.slice(`${SNAPSHOTS}/${id}/`.length))
      .filter((name) => !name.includes('/') && !name.startsWith('.'));
  }

  // The active project's id (P1, as the manuscript service).
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
