import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import {
  PROJECT_ERROR_CODES,
  PROJECT_ERROR_STATUS,
  type SearchRequest,
  type SearchResult,
} from '@bbartolome/scriba-contracts/project-store';
import { ModuleError } from '../platform/platform.module';
import { EntityManifest } from './entity-manifest';
import type { DiscoveredProject } from './project-discovery';
import { ProjectStoreService } from './project-store.service';
import { PROJECT_MESSAGES, ProjectsService } from './projects.service';
import {
  buildMatchQuery,
  chunkText,
  indexFileName,
  openIndex,
} from './search-index';

// The result count of a search that gives no limit (P15).
const DEFAULT_LIMIT = 20;

// The folder prefix of each scope, as a file path starts with it (P15).
const SCOPE_PREFIXES = { sources: 'sources/', entities: 'entities/' } as const;

// The SQL test that a passage is in one of the scope folders (P15). An absent or empty scope means both.
function scopeClause(scope: SearchRequest['scope']): string {
  const roots: readonly ('sources' | 'entities')[] =
    scope === undefined || scope.length === 0 ? ['sources', 'entities'] : scope;
  return roots
    .map(
      (root) =>
        `substr(path, 1, ${SCOPE_PREFIXES[root].length}) = '${SCOPE_PREFIXES[root]}'`,
    )
    .join(' OR ');
}

// Deletes the passages and the file row of one path, inside the caller's transaction (P9 a and b).
function deleteFile(db: DatabaseSync, path: string): void {
  db.prepare('DELETE FROM passages WHERE path = ?').run(path);
  db.prepare('DELETE FROM files WHERE path = ?').run(path);
}

// The FTS5 keyword search of a project's sources/ and entities/ (P9 to P16). The index is disposable: it is
// brought up to date with the disk before each query and when a project is activated, and rebuilt on request.
@Injectable()
export class SearchService implements OnApplicationBootstrap {
  constructor(
    private readonly store: ProjectStoreService,
    private readonly projects: ProjectsService,
    private readonly manifest: EntityManifest,
  ) {
    // The activation refresh (P13). A handler must not throw, because a throw fails the switch (S13), so every
    // error is ignored here; a failed refresh is repaired by the next query.
    this.store.onProjectSwitched((event) => {
      try {
        const project = this.projects.find(event.to);
        if (project === undefined) return;
        this.withIndex(project, (db) => this.refresh(db, project.root));
      } catch {
        // Ignored on purpose: see the comment above.
      }
    });
  }

  // The startup prune (P12). Every entry of the index folder whose name is not the index name of a library entry
  // (its .db file or the .db-journal) is removed. Nothing is removed when the library cannot be read.
  onApplicationBootstrap(): void {
    const folder = join(this.store.libraryRoot, '.scriba', 'index');
    if (!existsSync(folder)) return;
    let kept: Set<string>;
    try {
      kept = new Set(
        readdirSync(this.store.libraryRoot)
          .filter((name) => !name.startsWith('.'))
          .flatMap((name) => {
            const file = indexFileName(name);
            return [file, `${file}-journal`];
          }),
      );
    } catch {
      return;
    }
    for (const entry of readdirSync(folder)) {
      if (!kept.has(entry)) {
        rmSync(join(folder, entry), { recursive: true, force: true });
      }
    }
  }

  // The ranked passages of a query, best first (P10). A project that is not active is refused (S12).
  search(projectId: string, request: SearchRequest): SearchResult {
    const project = this.projectFor(projectId);
    return this.withIndex(project, (db) => {
      this.refresh(db, project.root);
      const match = buildMatchQuery(request.query);
      if (match === '') return [];
      const rows = db
        .prepare(
          `SELECT path, char_offset, snippet(passages, 0, '', '', '…', 12) AS snippet, -bm25(passages) AS score
           FROM passages
           WHERE passages MATCH ? AND (${scopeClause(request.scope)})
           ORDER BY bm25(passages), path, char_offset
           LIMIT ?`,
        )
        .all(match, request.limit ?? DEFAULT_LIMIT);
      return rows.map((row) => ({
        path: String(row.path),
        offset: Number(row.char_offset),
        snippet: String(row.snippet),
        score: Number(row.score),
      }));
    });
  }

  // The full rebuild (P14): the index file is deleted and filled again. Only the POST route calls it.
  rebuild(projectId: string): void {
    const project = this.projectFor(projectId);
    const file = this.indexFile(project);
    rmSync(file, { force: true });
    rmSync(`${file}-journal`, { force: true });
    this.withIndex(project, (db) => this.refresh(db, project.root));
  }

  // Brings the index up to date with the manifest (P9). A stored file that is gone is removed. A file whose
  // stored (mtime, size) differs from the disk, or that has no row, is read and indexed again. One transaction.
  private refresh(db: DatabaseSync, projectRoot: string): void {
    const { entries } = this.manifest.snapshot(projectRoot);
    const onDisk = new Set(entries.map((entry) => entry.path));
    const stored = new Map<string, { mtime: number; size: number }>();
    for (const row of db.prepare('SELECT path, mtime, size FROM files').all()) {
      stored.set(String(row.path), {
        mtime: Number(row.mtime),
        size: Number(row.size),
      });
    }
    db.exec('BEGIN');
    try {
      for (const path of stored.keys()) {
        if (!onDisk.has(path)) deleteFile(db, path);
      }
      const insertPassage = db.prepare(
        'INSERT INTO passages (body, path, char_offset) VALUES (?, ?, ?)',
      );
      const insertFile = db.prepare(
        'INSERT INTO files (path, mtime, size) VALUES (?, ?, ?)',
      );
      for (const entry of entries) {
        const row = stored.get(entry.path);
        if (
          row !== undefined &&
          row.mtime === entry.mtimeMs &&
          row.size === entry.size
        ) {
          continue;
        }
        deleteFile(db, entry.path);
        // A file that is gone, over the cap or not text has no passages (P3).
        const text = this.manifest.readText(projectRoot, entry.path);
        for (const passage of text === undefined ? [] : chunkText(text)) {
          insertPassage.run(passage.body, entry.path, passage.offset);
        }
        insertFile.run(entry.path, entry.mtimeMs, entry.size);
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  // The index file of a project, inside .scriba/index of the library (P1). The name comes from a discovered id.
  private indexFile(project: DiscoveredProject): string {
    return join(
      this.store.libraryRoot,
      '.scriba',
      'index',
      indexFileName(project.id),
    );
  }

  // Runs work on the index of a project. The file is opened for this call only, and closed after it (P5).
  private withIndex<T>(
    project: DiscoveredProject,
    work: (db: DatabaseSync) => T,
  ): T {
    const db = openIndex(this.indexFile(project));
    try {
      return work(db);
    } finally {
      db.close();
    }
  }

  // The active check, then the lookup (S12). The same order and errors as EntitiesService.projectFor.
  private projectFor(projectId: string): DiscoveredProject {
    this.store.requireActive(projectId);
    const project = this.projects.find(projectId);
    if (project === undefined) {
      throw new ModuleError(
        PROJECT_ERROR_CODES.NOT_FOUND,
        PROJECT_ERROR_STATUS.PROJECT_NOT_FOUND,
        PROJECT_MESSAGES.NOT_FOUND,
      );
    }
    return project;
  }
}
