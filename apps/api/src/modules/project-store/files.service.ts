import { createHash } from 'node:crypto';
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { Injectable } from '@nestjs/common';
import { parseDocument } from 'yaml';
import {
  MODULE_SLUGS,
  PLATFORM_ERROR_CODES,
  PLATFORM_ERROR_STATUS,
} from '@bbartolome/scriba-contracts/platform';
import {
  FILE_SIZE_CAP_BYTES,
  PROJECT_ERROR_CODES,
  PROJECT_ERROR_STATUS,
  type FileDelete,
  type FileEdit,
  type FileEntry,
  type FileList,
  type FileMove,
  type FileRead,
  type FileWrite,
  type FileWriteResult,
} from '@bbartolome/scriba-contracts/project-store';
import { EventsPublisher, ModuleError } from '../platform/platform.module';
import { writeFileAtomic } from './atomic-write';
import { fail, PATH_MESSAGES, type ResolvedProjectPath } from './path-safety';
import type { DiscoveredProject } from './project-discovery';
import { ProjectStoreService } from './project-store.service';
import { requireOkProject } from './project-status';
import { readYamlState } from './project-yaml';
import { PROJECT_MESSAGES, ProjectsService } from './projects.service';

const PROJECT_YAML = 'project.yaml';

// Every message of the file API. Fixed strings only; no input value is echoed.
export const FILE_MESSAGES = {
  NO_FILE: 'No file was found at that path.',
  NO_FOLDER: 'No folder was found at that path.',
  NOT_TEXT: 'The file is not UTF-8 text.',
  TOO_LARGE: 'The file is larger than the 5 MiB limit.',
  CONFLICT: 'The file changed since it was read. Read it again before saving.',
  NO_MATCH: 'The text to replace was not found in the file.',
  AMBIGUOUS: 'The text to replace occurs more than once in the file.',
  EMPTY_OLD: 'The text to replace must not be empty.',
  NOT_A_FILE:
    'The path names a folder, or runs through a file, so no file can be written there.',
  EXISTS: 'A file or folder already exists at the new path.',
  LOG_PATH: 'A log line goes only to a file inside logs/.',
  LINE_BREAK: 'A log line must be one line, with no line break in it.',
  OWNER: 'The owner must be the slug of a module.',
} as const;

type ProjectErrorCode =
  (typeof PROJECT_ERROR_CODES)[keyof typeof PROJECT_ERROR_CODES];

// One refusal: a contract code with its contract status, and a fixed message.
export function refuse(
  code: ProjectErrorCode,
  message: string,
  details?: unknown,
): ModuleError {
  return new ModuleError(code, PROJECT_ERROR_STATUS[code], message, details);
}

export function notAFile(): ModuleError {
  return refuse(PROJECT_ERROR_CODES.PATH_INVALID, FILE_MESSAGES.NOT_A_FILE);
}

function tooNew(): ModuleError {
  return refuse(PROJECT_ERROR_CODES.SCHEMA_TOO_NEW, PROJECT_MESSAGES.TOO_NEW);
}

// The hash of bytes, in the contract's form: sha256: and the lower-case hex digest (S5).
export function hashOf(bytes: Buffer): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

// The text of bytes, or undefined when a byte is 0x00 or the bytes are not valid UTF-8 (P6). A BOM is kept as
// U+FEFF, so the text and the bytes round-trip (S16).
export function decodeText(bytes: Buffer): string | undefined {
  if (bytes.includes(0)) return undefined;
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
      bytes,
    );
  } catch {
    return undefined;
  }
}

// Only project.yaml at the root has a registered maximum version (P13). PST-23 extends this one function.
export function isRootProjectYaml(relativePath: string): boolean {
  return relativePath === PROJECT_YAML;
}

function isTooNewText(text: string): boolean {
  return readYamlState(text).status === 'too-new';
}

// The number of places where needle occurs, overlapping ones included. Counting stops at two (P8).
function countMatches(text: string, needle: string): number {
  let count = 0;
  let from = 0;
  while (count < 2) {
    const at = text.indexOf(needle, from);
    if (at === -1) break;
    count++;
    from = at + 1;
  }
  return count;
}

function errnoOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  return typeof error.code === 'string' ? error.code : undefined;
}

// The bytes and mtime of the file at target (P6, steps 3 and 4). A missing path or a non-file is refused, and so is
// a file over the cap, before any byte is read.
export function readFileAt(target: ResolvedProjectPath): {
  bytes: Buffer;
  mtime: string;
} {
  const stats = target.exists ? statSync(target.realPath) : undefined;
  if (stats === undefined || !stats.isFile()) {
    throw refuse(PROJECT_ERROR_CODES.NOT_FOUND, FILE_MESSAGES.NO_FILE);
  }
  if (stats.size > FILE_SIZE_CAP_BYTES) {
    throw refuse(PROJECT_ERROR_CODES.FILE_TOO_LARGE, FILE_MESSAGES.TOO_LARGE);
  }
  return {
    bytes: readFileSync(target.realPath),
    mtime: stats.mtime.toISOString(),
  };
}

// The atomic write (P14). A folder in the way, or a file above the target, is a path error; any other errno is an
// unexpected error that carries the errno code only.
function writeText(target: string, text: string): void {
  let failure: string | undefined;
  try {
    writeFileAtomic(target, text);
  } catch (error) {
    failure = errnoOf(error) ?? 'unknown';
  }
  if (failure === undefined) return;
  if (failure === 'ENOTDIR' || failure === 'EEXIST' || failure === 'EISDIR') {
    throw notAFile();
  }
  throw new Error(`The project file could not be written (${failure}).`);
}

// True when path is the folder itself or lies inside it, at a separator boundary (P11 step 5).
function isInside(folder: string, path: string): boolean {
  return path === folder || path.startsWith(folder + sep);
}

// The folders above file (P5 step 6, P11 step 7). A folder in the way is a path error; any other errno is a plain
// error with the errno only.
function mkdirParent(file: string): void {
  try {
    mkdirSync(dirname(file), { recursive: true });
  } catch (error) {
    const code = errnoOf(error) ?? 'unknown';
    if (code === 'ENOTDIR' || code === 'EEXIST' || code === 'EISDIR') {
      throw notAFile();
    }
    throw new Error(`The project folder could not be created (${code}).`, {
      cause: error,
    });
  }
}

// True when the last byte of a non-empty file is a line feed. One byte is read (P11 step 8).
function endsWithLf(file: string): boolean {
  const size = statSync(file).size;
  const fd = openSync(file, 'r');
  try {
    const last = Buffer.alloc(1);
    readSync(fd, last, 0, 1, size - 1);
    return last[0] === 0x0a;
  } finally {
    closeSync(fd);
  }
}

// The framing the yaml writer does not keep (P9, N2): a BOM that the original began with is put back, and when the
// original holds CRLF, every line feed of the output becomes CRLF.
function keepFraming(original: string, text: string): string {
  const framed = original.includes('\r\n') ? text.replace(/\n/g, '\r\n') : text;
  return original.startsWith('\uFEFF') ? `\uFEFF${framed}` : framed;
}

// The unlink of the entry the path names (P3 step 6). Any errno is a plain error with the errno only.
function removeEntry(entry: string): void {
  try {
    unlinkSync(entry);
  } catch (error) {
    const code = errnoOf(error) ?? 'unknown';
    throw new Error(`The project file could not be deleted (${code}).`, {
      cause: error,
    });
  }
}

// The file API of the Project store: list, read, write and edit. Every call runs the active check and the lookup
// of the project (S2), then the one path check (S3). The HTTP handlers and the in-process callers use these methods.
@Injectable()
export class FilesService {
  constructor(
    private readonly store: ProjectStoreService,
    private readonly projects: ProjectsService,
    private readonly events: EventsPublisher,
  ) {}

  // The entries of a folder (P5). The folder is the project root for '.'.
  list(
    projectId: string,
    query: { path: string; recursive?: boolean },
  ): FileList {
    const project = this.projectFor(projectId);
    const folder = this.store.resolvePath(project.root, query.path);
    if (!folder.exists || !statSync(folder.realPath).isDirectory()) {
      throw refuse(PROJECT_ERROR_CODES.NOT_FOUND, FILE_MESSAGES.NO_FOLDER);
    }
    const entries: FileEntry[] = [];
    this.collect(
      project.root,
      folder.realPath,
      folder.relativePath,
      query.recursive === true,
      entries,
    );
    return {
      entries: entries.sort((a, b) =>
        a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
      ),
    };
  }

  // The text of a file with its hash and mtime (P6). It only reads.
  read(projectId: string, path: string): FileRead {
    const project = this.projectFor(projectId);
    const target = this.store.resolvePath(project.root, path);
    const { bytes, mtime } = readFileAt(target);
    const content = decodeText(bytes);
    if (content === undefined) {
      throw refuse(PROJECT_ERROR_CODES.NOT_TEXT, FILE_MESSAGES.NOT_TEXT);
    }
    if (isRootProjectYaml(target.relativePath) && isTooNewText(content)) {
      throw tooNew();
    }
    return { path: target.relativePath, content, hash: hashOf(bytes), mtime };
  }

  // The save of a whole file (P7). A stale baseHash is refused; the rest are the checks of commit.
  write(projectId: string, request: FileWrite): FileWriteResult {
    const project = this.projectFor(projectId);
    const target = this.store.resolvePath(project.root, request.path);
    if (target.exists && statSync(target.realPath).isDirectory()) {
      throw notAFile();
    }
    const disk = target.exists ? readFileSync(target.realPath) : undefined;
    if (disk !== undefined && isRootProjectYaml(target.relativePath)) {
      const text = decodeText(disk);
      if (text !== undefined && isTooNewText(text)) throw tooNew();
    }
    if (
      request.baseHash !== undefined &&
      (disk === undefined || hashOf(disk) !== request.baseHash)
    ) {
      throw refuse(PROJECT_ERROR_CODES.WRITE_CONFLICT, FILE_MESSAGES.CONFLICT);
    }
    return this.commit(project, target, request.content);
  }

  // The replacement of one exact match of `old` (P8). Zero or several matches are refused.
  edit(projectId: string, request: FileEdit): FileWriteResult {
    const project = this.projectFor(projectId);
    const target = this.store.resolvePath(project.root, request.path);
    if (request.old === '') {
      throw new ModuleError(
        PLATFORM_ERROR_CODES.VALIDATION_FAILED,
        PLATFORM_ERROR_STATUS.PLATFORM_VALIDATION_FAILED,
        FILE_MESSAGES.EMPTY_OLD,
      );
    }
    const { bytes } = readFileAt(target);
    const text = decodeText(bytes);
    if (text === undefined) {
      throw refuse(PROJECT_ERROR_CODES.NOT_TEXT, FILE_MESSAGES.NOT_TEXT);
    }
    if (isRootProjectYaml(target.relativePath) && isTooNewText(text)) {
      throw tooNew();
    }
    const matches = countMatches(text, request.old);
    if (matches === 0) {
      throw refuse(PROJECT_ERROR_CODES.EDIT_NO_MATCH, FILE_MESSAGES.NO_MATCH);
    }
    if (matches > 1) {
      throw refuse(PROJECT_ERROR_CODES.EDIT_AMBIGUOUS, FILE_MESSAGES.AMBIGUOUS);
    }
    const at = text.indexOf(request.old);
    return this.commit(
      project,
      target,
      text.slice(0, at) + request.new + text.slice(at + request.old.length),
    );
  }

  // The delete of one file (P3). The entry is the path as named, so a link is removed and its target is not (P2).
  // A folder is never deleted; project.yaml at the root is reserved (P4).
  delete(projectId: string, request: FileDelete): void {
    const project = this.projectFor(projectId);
    const target = this.store.resolvePath(project.root, request.path);
    if (isRootProjectYaml(target.relativePath)) {
      throw fail(PROJECT_ERROR_CODES.PATH_RESERVED, PATH_MESSAGES.RESERVED);
    }
    if (!target.exists || statSync(target.realPath).isDirectory()) {
      throw refuse(PROJECT_ERROR_CODES.NOT_FOUND, FILE_MESSAGES.NO_FILE);
    }
    if (
      request.baseHash !== undefined &&
      hashOf(readFileSync(target.realPath)) !== request.baseHash
    ) {
      throw refuse(PROJECT_ERROR_CODES.WRITE_CONFLICT, FILE_MESSAGES.CONFLICT);
    }
    removeEntry(join(project.root, target.relativePath));
    this.events.publish({
      module: 'project-store',
      type: 'files-changed',
      data: { projectId: project.id, paths: [target.relativePath] },
    });
  }

  // The rename of one file (P5). The entry is renamed as named, so a link keeps its target (P2). A missing parent
  // folder of the new path is created; an existing file or folder at the new path is refused.
  move(projectId: string, request: FileMove): void {
    const project = this.projectFor(projectId);
    const from = this.store.resolvePath(project.root, request.from);
    const to = this.store.resolvePath(project.root, request.to);
    if (
      isRootProjectYaml(from.relativePath) ||
      isRootProjectYaml(to.relativePath)
    ) {
      throw fail(PROJECT_ERROR_CODES.PATH_RESERVED, PATH_MESSAGES.RESERVED);
    }
    if (!from.exists || statSync(from.realPath).isDirectory()) {
      throw refuse(PROJECT_ERROR_CODES.NOT_FOUND, FILE_MESSAGES.NO_FILE);
    }
    if (to.exists) {
      throw refuse(PROJECT_ERROR_CODES.FILE_EXISTS, FILE_MESSAGES.EXISTS);
    }
    mkdirParent(to.realPath);
    try {
      renameSync(join(project.root, from.relativePath), to.realPath);
    } catch (error) {
      const code = errnoOf(error) ?? 'unknown';
      if (code === 'ENOTDIR' || code === 'EEXIST' || code === 'EISDIR') {
        throw notAFile();
      }
      throw new Error(`The project file could not be moved (${code}).`, {
        cause: error,
      });
    }
    this.events.publish({
      module: 'project-store',
      type: 'files-changed',
      data: {
        projectId: project.id,
        paths: [from.relativePath, to.relativePath],
      },
    });
  }

  // The in-process edit of the root project.yaml (P8, P9). A named top-level key is set, or removed when its value is
  // null or undefined, through the YAML document API, so comments, key order and the other keys survive. The result
  // is checked and written by commit, and an invalid one is refused before any write.
  updateProjectYaml(
    projectId: string,
    patch: Record<string, unknown>,
  ): FileWriteResult {
    const project = this.projectFor(projectId);
    const target = this.store.resolvePath(project.root, PROJECT_YAML);
    const { bytes } = readFileAt(target);
    const text = decodeText(bytes);
    if (text === undefined) {
      throw refuse(PROJECT_ERROR_CODES.NOT_TEXT, FILE_MESSAGES.NOT_TEXT);
    }
    if (isTooNewText(text)) throw tooNew();
    const doc = parseDocument(text);
    if (doc.errors.length > 0) {
      const state = readYamlState(text);
      throw refuse(
        PROJECT_ERROR_CODES.INVALID,
        PROJECT_MESSAGES.INVALID,
        state.status === 'invalid' ? state.issues : undefined,
      );
    }
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === undefined) doc.delete(key);
      else doc.set(key, value);
    }
    return this.commit(
      project,
      target,
      keepFraming(text, doc.toString({ lineWidth: 0 })),
    );
  }

  // The in-process append of one line to a file under logs/ (P10, P11). The project must be ok, active or not (S2).
  // Nothing is published.
  appendLog(projectId: string, path: string, line: string): void {
    const project = requireOkProject(this.projects.find(projectId));
    if (/[\r\n]/.test(line)) {
      throw new ModuleError(
        PLATFORM_ERROR_CODES.VALIDATION_FAILED,
        PLATFORM_ERROR_STATUS.PLATFORM_VALIDATION_FAILED,
        FILE_MESSAGES.LINE_BREAK,
      );
    }
    const target = this.store.resolvePath(project.root, path);
    if (!target.relativePath.startsWith('logs/')) {
      throw refuse(PROJECT_ERROR_CODES.PATH_INVALID, FILE_MESSAGES.LOG_PATH);
    }
    const logs = join(project.root, 'logs');
    if (
      existsSync(logs) &&
      !isInside(realpathSync.native(logs), target.realPath)
    ) {
      throw refuse(PROJECT_ERROR_CODES.PATH_INVALID, FILE_MESSAGES.LOG_PATH);
    }
    if (target.exists && statSync(target.realPath).isDirectory()) {
      throw notAFile();
    }
    mkdirParent(target.realPath);
    const needsBreak =
      existsSync(target.realPath) &&
      statSync(target.realPath).size > 0 &&
      !endsWithLf(target.realPath);
    try {
      appendFileSync(target.realPath, `${needsBreak ? '\n' : ''}${line}\n`);
    } catch (error) {
      const code = errnoOf(error) ?? 'unknown';
      if (code === 'ENOTDIR' || code === 'EEXIST' || code === 'EISDIR') {
        throw notAFile();
      }
      throw new Error(`The log line could not be written (${code}).`, {
        cause: error,
      });
    }
  }

  // The metadata folder of one module, .scriba/<owner>/ (P12). The folder is created when missing and checked to lie
  // inside the project's own .scriba; the file API refuses it (S3). Answers the path as the project names it.
  stateDir(projectId: string, owner: string): string {
    const project = this.projectFor(projectId);
    if (!MODULE_SLUGS.some((slug) => slug === owner)) {
      throw new ModuleError(
        PLATFORM_ERROR_CODES.VALIDATION_FAILED,
        PLATFORM_ERROR_STATUS.PLATFORM_VALIDATION_FAILED,
        FILE_MESSAGES.OWNER,
      );
    }
    const rootReal = realpathSync.native(project.root);
    const scriba = join(project.root, '.scriba');
    if (
      existsSync(scriba) &&
      realpathSync.native(scriba) !== join(rootReal, '.scriba')
    ) {
      throw fail(PROJECT_ERROR_CODES.PATH_OUTSIDE, PATH_MESSAGES.OUTSIDE);
    }
    const folder = join(scriba, owner);
    try {
      mkdirSync(folder, { recursive: true });
    } catch (error) {
      const code = errnoOf(error) ?? 'unknown';
      throw new Error(`The project folder could not be created (${code}).`, {
        cause: error,
      });
    }
    if (realpathSync.native(folder) !== join(rootReal, '.scriba', owner)) {
      throw fail(PROJECT_ERROR_CODES.PATH_OUTSIDE, PATH_MESSAGES.OUTSIDE);
    }
    return folder;
  }

  // The active check, then the lookup (S2). A project that is not active is refused before the folder is looked up.
  private projectFor(projectId: string): DiscoveredProject {
    this.store.requireActive(projectId);
    const project = this.projects.find(projectId);
    if (project === undefined) {
      throw refuse(PROJECT_ERROR_CODES.NOT_FOUND, PROJECT_MESSAGES.NOT_FOUND);
    }
    return project;
  }

  // The last steps of a write (P7, steps 6 to 10): the size cap, the project.yaml schema, the atomic write, the
  // files-changed event, then the answer. The hash covers the bytes that are stored.
  private commit(
    project: DiscoveredProject,
    target: ResolvedProjectPath,
    content: string,
  ): FileWriteResult {
    const bytes = Buffer.from(content, 'utf8');
    if (bytes.length > FILE_SIZE_CAP_BYTES) {
      throw refuse(PROJECT_ERROR_CODES.FILE_TOO_LARGE, FILE_MESSAGES.TOO_LARGE);
    }
    if (isRootProjectYaml(target.relativePath)) {
      const state = readYamlState(content);
      if (state.status === 'too-new') throw tooNew();
      if (state.status === 'invalid') {
        throw refuse(
          PROJECT_ERROR_CODES.INVALID,
          PROJECT_MESSAGES.INVALID,
          state.issues,
        );
      }
    }
    writeText(target.realPath, content);
    const mtime = statSync(target.realPath).mtime.toISOString();
    this.events.publish({
      module: 'project-store',
      type: 'files-changed',
      data: { projectId: project.id, paths: [target.relativePath] },
    });
    return { path: target.relativePath, hash: hashOf(bytes), mtime };
  }

  // Adds the entries of one real folder to out (P5). realDir is the folder's real path and relDir its
  // project-relative path. A dot-entry and an entry that the path check refuses are skipped. A folder is entered
  // only when it is a real folder, not a link, so a loop cannot run.
  private collect(
    root: string,
    realDir: string,
    relDir: string,
    recursive: boolean,
    out: FileEntry[],
  ): void {
    for (const dirent of readdirSync(realDir, { withFileTypes: true })) {
      if (dirent.name.startsWith('.')) continue;
      const relativePath =
        relDir === '' ? dirent.name : `${relDir}/${dirent.name}`;
      let target: ResolvedProjectPath;
      try {
        target = this.store.resolvePath(root, relativePath);
      } catch (error) {
        if (error instanceof ModuleError) continue;
        throw error;
      }
      if (!target.exists) continue;
      const stats = statSync(target.realPath);
      const mtime = stats.mtime.toISOString();
      if (stats.isDirectory()) {
        out.push({ path: relativePath, kind: 'dir', size: 0, mtime });
        if (recursive && dirent.isDirectory()) {
          this.collect(root, target.realPath, relativePath, recursive, out);
        }
      } else if (stats.isFile()) {
        out.push({ path: relativePath, kind: 'file', size: stats.size, mtime });
      }
    }
  }
}
