import { lstatSync, realpathSync, statSync, type Stats } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  PROJECT_ERROR_CODES,
  PROJECT_ERROR_STATUS,
  RESERVED_PATH_PREFIXES,
} from '@bbartolome/scriba-contracts/project-store';
import { ModuleError } from '../platform/platform.module';

// The one path check of the Project store. Every endpoint and every in-process caller goes through resolveProjectPath.

// The result of a check. realPath is for the caller's file-system calls only: it must never go into a message, a log or a response.
export interface ResolvedProjectPath {
  relativePath: string; // canonical project-relative POSIX form, '' for the root
  realPath: string; // absolute real location: the target, or its nearest existing ancestor plus the missing segments
  isRoot: boolean;
  exists: boolean; // true when the whole target exists
}

// Every message the check can return. Fixed strings only; the input path is never echoed.
export const PATH_MESSAGES = {
  EMPTY: 'The path must be a non-empty project-relative string.',
  NUL: 'The path must not contain a NUL byte.',
  BACKSLASH: 'The path must use forward slashes, not backslashes.',
  ABSOLUTE: 'The path must be relative to the project, not absolute.',
  DOTDOT: 'The path must not contain a ".." segment.',
  EMPTY_SEGMENT: 'The path must not contain an empty segment.',
  TOO_LONG: 'A name in the path is too long.',
  OUTSIDE:
    'The path leads outside the project, or through a link that cannot be resolved.',
  RESERVED:
    'The path is reserved for the app and is not available through the file API.',
  ROOT_NOT_FOUND: 'The project folder was not found.',
} as const;

type PathMessage = (typeof PATH_MESSAGES)[keyof typeof PATH_MESSAGES];

type PathErrorCode =
  | typeof PROJECT_ERROR_CODES.PATH_INVALID
  | typeof PROJECT_ERROR_CODES.PATH_OUTSIDE
  | typeof PROJECT_ERROR_CODES.PATH_RESERVED
  | typeof PROJECT_ERROR_CODES.NOT_FOUND;

// The only way to build a path error: one contract code, one fixed message, the contract's status, no details.
export function fail(code: PathErrorCode, message: PathMessage): ModuleError {
  return new ModuleError(code, PROJECT_ERROR_STATUS[code], message);
}

// Any other file-system error. It carries the errno code only: no path and no cause.
function unexpected(error: unknown): Error {
  const code = errnoOf(error) ?? 'unknown';
  return new Error(`The project path could not be checked (${code}).`);
}

function errnoOf(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException).code;
}

// True when the path, lower-cased, is a reserved folder or lies inside one. Matching is by whole segment, so
// `.scribe/x` is not reserved (P6, P7).
export function isReservedPath(relativePath: string): boolean {
  const lower = relativePath.toLowerCase();
  return RESERVED_PATH_PREFIXES.some((prefix) => {
    const folder = prefix.slice(0, -1);
    return lower === folder || lower.startsWith(`${folder}/`);
  });
}

// Containment on real paths, at a separator boundary (P13).
function inside(rootReal: string, target: string): boolean {
  return target === rootReal || target.startsWith(rootReal + sep);
}

// The real project root. A root that does not exist, or is not a folder, is PROJECT_NOT_FOUND (P1).
function realRoot(projectRoot: string): string {
  let real: string;
  try {
    real = realpathSync.native(projectRoot);
  } catch (error) {
    const code = errnoOf(error);
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      throw fail(PROJECT_ERROR_CODES.NOT_FOUND, PATH_MESSAGES.ROOT_NOT_FOUND);
    }
    throw unexpected(error);
  }
  if (!statSync(real).isDirectory()) {
    throw fail(PROJECT_ERROR_CODES.NOT_FOUND, PATH_MESSAGES.ROOT_NOT_FOUND);
  }
  return real;
}

// A symlink on the path. Its real target must lie inside the real root, even when the rest of the path comes
// back into the project (P8). A dangling or looping link cannot be shown to be inside, so it is refused.
function resolvedLink(rootReal: string, link: string): string {
  let real: string;
  try {
    real = realpathSync.native(link);
  } catch (error) {
    const code = errnoOf(error);
    if (
      code === 'ENOENT' ||
      code === 'ELOOP' ||
      code === 'ENOTDIR' ||
      code === 'ENAMETOOLONG'
    ) {
      throw fail(PROJECT_ERROR_CODES.PATH_OUTSIDE, PATH_MESSAGES.OUTSIDE);
    }
    throw unexpected(error);
  }
  if (!inside(rootReal, real)) {
    throw fail(PROJECT_ERROR_CODES.PATH_OUTSIDE, PATH_MESSAGES.OUTSIDE);
  }
  return real;
}

// Checks a project-relative path against the project root. Syntax, then reserved (lexical), then the root, then
// a walk that resolves each segment, then reserved again on the real location (P5).
export function resolveProjectPath(
  projectRoot: string,
  path: string,
): ResolvedProjectPath {
  // 1. Syntax. A non-string (a number from a JSON body) is refused here too.
  if (typeof path !== 'string' || path === '') {
    throw fail(PROJECT_ERROR_CODES.PATH_INVALID, PATH_MESSAGES.EMPTY);
  }
  if (path.includes('\0')) {
    throw fail(PROJECT_ERROR_CODES.PATH_INVALID, PATH_MESSAGES.NUL);
  }
  if (path.includes('\\')) {
    throw fail(PROJECT_ERROR_CODES.PATH_INVALID, PATH_MESSAGES.BACKSLASH);
  }
  if (path.startsWith('/')) {
    throw fail(PROJECT_ERROR_CODES.PATH_INVALID, PATH_MESSAGES.ABSOLUTE);
  }
  const segments: string[] = [];
  for (const part of path.split('/')) {
    if (part === '..') {
      throw fail(PROJECT_ERROR_CODES.PATH_INVALID, PATH_MESSAGES.DOTDOT);
    }
    if (part === '') {
      throw fail(PROJECT_ERROR_CODES.PATH_INVALID, PATH_MESSAGES.EMPTY_SEGMENT);
    }
    if (part !== '.') segments.push(part);
  }
  const relativePath = segments.join('/');

  // 2. Reserved, lexical: refused before the disk is touched.
  if (isReservedPath(relativePath)) {
    throw fail(PROJECT_ERROR_CODES.PATH_RESERVED, PATH_MESSAGES.RESERVED);
  }

  // 3. The real root.
  const rootReal = realRoot(projectRoot);

  // 4. Walk the segments. `current` never holds a symlink: it grows by a segment that lstat shows is not a link, or
  // by the fully resolved real path of a link.
  let current = rootReal;
  let consumed = 0;
  for (const segment of segments) {
    const next = join(current, segment);
    let stats: Stats;
    try {
      stats = lstatSync(next);
    } catch (error) {
      const code = errnoOf(error);
      if (code === 'ENOENT' || code === 'ENOTDIR') break;
      if (code === 'ENAMETOOLONG') {
        throw fail(PROJECT_ERROR_CODES.PATH_INVALID, PATH_MESSAGES.TOO_LONG);
      }
      if (code === 'ELOOP') {
        throw fail(PROJECT_ERROR_CODES.PATH_OUTSIDE, PATH_MESSAGES.OUTSIDE);
      }
      throw unexpected(error);
    }
    current = stats.isSymbolicLink() ? resolvedLink(rootReal, next) : next;
    consumed++;
  }

  // 5. The result. Segments after the first missing one do not exist.
  const remaining = segments.slice(consumed);
  const realPath = join(current, ...remaining);

  // 6. Reserved, real: a link inside the project that points into a reserved folder is refused.
  const realRelative = relative(rootReal, realPath).split(sep).join('/');
  if (isReservedPath(realRelative)) {
    throw fail(PROJECT_ERROR_CODES.PATH_RESERVED, PATH_MESSAGES.RESERVED);
  }

  // 7.
  return {
    relativePath,
    realPath,
    isRoot: relativePath === '',
    exists: remaining.length === 0,
  };
}
