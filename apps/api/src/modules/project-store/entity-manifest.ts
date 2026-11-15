import { readdirSync, readFileSync, statSync, type Stats } from 'node:fs';
import { basename } from 'node:path';
import { Injectable } from '@nestjs/common';
import { parseDocument } from 'yaml';
import {
  ENTITY_ID_PATTERN,
  FILE_SIZE_CAP_BYTES,
  entityBaseSchema,
} from '@bbartolome/scriba-contracts/project-store';
import { ModuleError } from '../platform/platform.module';
import { decodeText } from './files.service';
import type { ResolvedProjectPath } from './path-safety';
import { ProjectStoreService } from './project-store.service';

// The two folders whose Markdown files are the entities of a project (P2).
const ENTITY_ROOTS = ['entities', 'sources'] as const;

const FENCE = '---';
const ENTITY_SUFFIX = '.md';
const BOM = '﻿';

// The fixed reason of each way a file is an invalid entity (P4, P14). No reason echoes an input value.
export const ENTITY_MESSAGES = {
  NOT_TEXT: 'The file is not UTF-8 text.',
  TOO_LARGE: 'The file is larger than the 5 MiB limit.',
  NOT_CLOSED: 'The front matter opens with --- but has no closing --- line.',
  NOT_YAML: 'The front matter is not valid YAML.',
  NOT_MAPPING: 'The front matter must be a mapping of keys to values.',
  NO_TYPE: 'An entity in entities/ needs a type in its front matter.',
  TYPE_INVALID: 'The type in the front matter must be a non-empty string.',
  ID_INVALID:
    'The id in the front matter must use lowercase letters, digits and hyphens.',
  NAME_INVALID:
    'The file name, used as the id, must use lowercase letters, digits and hyphens.',
  LINKS_INVALID: 'The links in the front matter must be a list of entity ids.',
  BASE_INVALID: 'The front matter does not match the entity base shape.',
} as const;

export type EntityReason =
  (typeof ENTITY_MESSAGES)[keyof typeof ENTITY_MESSAGES];

// One regular file of the manifest: its project-relative path, its mtime in milliseconds and its size (S11, P15).
export interface ManifestEntry {
  path: string;
  mtimeMs: number;
  size: number;
}

// One valid entity: its effective id, its type, and its title when the front matter gives one (P4, P6).
export interface EntityRecord {
  id: string;
  type: string;
  path: string;
  title?: string;
}

// One invalid entity: its path and the reason (P6).
export interface InvalidRecord {
  path: string;
  reason: EntityReason;
}

// The manifest of a project folder: every regular file, then the entities and the invalid entities (P2, P6).
export interface ManifestSnapshot {
  entries: ManifestEntry[];
  entities: EntityRecord[];
  invalid: InvalidRecord[];
}

// The front-matter result of one entity candidate (P4).
type ParseResult =
  | { valid: true; id: string; type: string; title?: string }
  | { valid: false; reason: EntityReason };

// A file the walk found, with the real path it is read from (P2).
interface FoundFile extends ManifestEntry {
  realPath: string;
}

// The cached result of one entity candidate, kept with the stat it was parsed at (P3).
interface CacheSlot {
  mtimeMs: number;
  size: number;
  result: ParseResult;
}

const invalid = (reason: EntityReason): ParseResult => ({
  valid: false,
  reason,
});

function errnoOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  return typeof error.code === 'string' ? error.code : undefined;
}

// The stat of a path, or undefined when the path does not exist any more.
function statOf(path: string): Stats | undefined {
  try {
    return statSync(path);
  } catch (error) {
    if (errnoOf(error) === 'ENOENT') return undefined;
    throw error;
  }
}

// The bytes of a path, or undefined when the file does not exist any more.
function bytesOf(path: string): Buffer | undefined {
  try {
    return readFileSync(path);
  } catch (error) {
    if (errnoOf(error) === 'ENOENT') return undefined;
    throw error;
  }
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// The reason of the first Zod issue of the entity base (P4 g). A type that is absent gives NO_TYPE.
function baseReason(
  issuePath: PropertyKey[],
  front: Record<string, unknown>,
): EntityReason {
  switch (issuePath[0]) {
    case 'type':
      return 'type' in front
        ? ENTITY_MESSAGES.TYPE_INVALID
        : ENTITY_MESSAGES.NO_TYPE;
    case 'id':
      return ENTITY_MESSAGES.ID_INVALID;
    case 'links':
      return ENTITY_MESSAGES.LINKS_INVALID;
    default:
      return ENTITY_MESSAGES.BASE_INVALID;
  }
}

// The entity manifest (P1, P2, P3). It walks entities/ and sources/, keeps the front-matter results of the
// Markdown files in memory, and diffs them against the disk on every call, so a host edit shows up with no
// rebuild. It is a reusable component: PST-13 injects the same provider and reads the same entries.
@Injectable()
export class EntityManifest {
  private cacheRoot: string | undefined;
  private cache = new Map<string, CacheSlot>();

  constructor(private readonly store: ProjectStoreService) {}

  // The manifest of a project folder, whose root is the absolute project root. Reads only (P8).
  snapshot(projectRoot: string): ManifestSnapshot {
    if (this.cacheRoot !== projectRoot) {
      this.cache = new Map();
      this.cacheRoot = projectRoot;
    }
    const found = this.walk(projectRoot);
    const next = new Map<string, CacheSlot>();
    const entities: EntityRecord[] = [];
    const invalidFiles: InvalidRecord[] = [];
    for (const file of found) {
      if (!file.path.endsWith(ENTITY_SUFFIX)) continue;
      const previous = this.cache.get(file.path);
      const reused =
        previous !== undefined &&
        previous.mtimeMs === file.mtimeMs &&
        previous.size === file.size;
      const result = reused ? previous.result : this.parse(file);
      // A file that vanished between the walk and the read is left out.
      if (result === undefined) continue;
      next.set(file.path, {
        mtimeMs: file.mtimeMs,
        size: file.size,
        result,
      });
      if (result.valid) {
        const record: EntityRecord = {
          id: result.id,
          type: result.type,
          path: file.path,
        };
        if (result.title !== undefined) record.title = result.title;
        entities.push(record);
      } else {
        invalidFiles.push({ path: file.path, reason: result.reason });
      }
    }
    // Replacing the cache drops the entries whose path has gone (P3).
    this.cache = next;
    return {
      entries: found.map(({ path, mtimeMs, size }) => ({
        path,
        mtimeMs,
        size,
      })),
      entities,
      invalid: invalidFiles,
    };
  }

  // The text of an entity file, read now (P5). Undefined when the path is refused, the file is gone, larger than
  // the cap, or not UTF-8 text. The cache holds no content; this is the only read of it.
  readText(projectRoot: string, path: string): string | undefined {
    let target: ResolvedProjectPath;
    try {
      target = this.store.resolvePath(projectRoot, path);
    } catch (error) {
      if (error instanceof ModuleError) return undefined;
      throw error;
    }
    if (!target.exists) return undefined;
    const stats = statOf(target.realPath);
    if (stats === undefined || !stats.isFile()) return undefined;
    if (stats.size > FILE_SIZE_CAP_BYTES) return undefined;
    const bytes = bytesOf(target.realPath);
    return bytes === undefined ? undefined : decodeText(bytes);
  }

  // Every regular file under the two roots, sorted by path (P2). A root that does not exist, or is not a
  // folder, contributes nothing; a root the path check refuses throws that refusal.
  private walk(projectRoot: string): FoundFile[] {
    const found: FoundFile[] = [];
    for (const root of ENTITY_ROOTS) {
      const target = this.store.resolvePath(projectRoot, root);
      if (!target.exists) continue;
      const stats = statOf(target.realPath);
      if (stats === undefined || !stats.isDirectory()) continue;
      this.collect(projectRoot, target.realPath, root, found);
    }
    return found.sort((a, b) =>
      a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
    );
  }

  // Adds the regular files of one real folder (P2). realDir is the folder's real path and relDir its
  // project-relative path. A dot-entry, and an entry the path check refuses, is skipped. A folder is entered only
  // when its dirent is a real directory, not a link, so a loop cannot run.
  private collect(
    projectRoot: string,
    realDir: string,
    relDir: string,
    out: FoundFile[],
  ): void {
    for (const dirent of readdirSync(realDir, { withFileTypes: true })) {
      if (dirent.name.startsWith('.')) continue;
      const relativePath = `${relDir}/${dirent.name}`;
      let target: ResolvedProjectPath;
      try {
        target = this.store.resolvePath(projectRoot, relativePath);
      } catch (error) {
        if (error instanceof ModuleError) continue;
        throw error;
      }
      if (!target.exists) continue;
      const stats = statOf(target.realPath);
      if (stats === undefined) continue;
      if (stats.isDirectory()) {
        if (dirent.isDirectory()) {
          this.collect(projectRoot, target.realPath, relativePath, out);
        }
      } else if (stats.isFile()) {
        out.push({
          path: relativePath,
          mtimeMs: stats.mtimeMs,
          size: stats.size,
          realPath: target.realPath,
        });
      }
    }
  }

  // The front-matter result of one entity candidate, in the order of P4 (a) to (i). Undefined when the file
  // vanished between the walk and the read.
  private parse(file: FoundFile): ParseResult | undefined {
    if (file.size > FILE_SIZE_CAP_BYTES)
      return invalid(ENTITY_MESSAGES.TOO_LARGE);
    const bytes = bytesOf(file.realPath);
    if (bytes === undefined) return undefined;
    const decoded = decodeText(bytes);
    if (decoded === undefined) return invalid(ENTITY_MESSAGES.NOT_TEXT);
    const text = decoded.startsWith(BOM) ? decoded.slice(1) : decoded;

    const lines = text.split('\n').map((line) => line.replace(/\r$/, ''));
    let front: unknown = {};
    if (lines[0] === FENCE) {
      const close = lines.indexOf(FENCE, 1);
      if (close === -1) return invalid(ENTITY_MESSAGES.NOT_CLOSED);
      const document = parseDocument(lines.slice(1, close).join('\n'));
      if (document.errors.length > 0) return invalid(ENTITY_MESSAGES.NOT_YAML);
      front = document.toJS() ?? {};
    }
    if (!isMapping(front)) return invalid(ENTITY_MESSAGES.NOT_MAPPING);

    if (file.path.startsWith('sources/') && !('type' in front)) {
      front.type = 'source';
    }
    const checked = entityBaseSchema.safeParse(front);
    if (!checked.success) {
      const [issue] = checked.error.issues;
      return invalid(baseReason(issue.path, front));
    }

    const stem = basename(file.path, ENTITY_SUFFIX);
    const id = checked.data.id ?? stem;
    if (!ENTITY_ID_PATTERN.test(id))
      return invalid(ENTITY_MESSAGES.NAME_INVALID);

    const title = [front.title, front.name].find(
      (value): value is string => typeof value === 'string' && value !== '',
    );
    return { valid: true, id, type: checked.data.type, title };
  }
}
