import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROJECT_ERROR_CODES } from '@bbartolome/scriba-contracts/project-store';
import { writeFileAtomic } from './atomic-write';
import { fail, PATH_MESSAGES } from './path-safety';
import type { ProjectStoreService } from './project-store.service';

// The layout folders of a new project. Compile & export creates snapshots/ on first use, and the rest appear lazily.
export const LAYOUT_FOLDERS = [
  'sources',
  'entities',
  'drafts',
  'graphs',
  'logs',
] as const;

const GITIGNORE = '.gitignore';
const SCRIBA_LINE = '.scriba/';

// The folder name of a title (P11): ASCII letters and digits, lower-cased, runs of anything else as one hyphen,
// at most 64 characters. Undefined when nothing is left, so the author must name the folder.
export function slugFromTitle(title: string): string | undefined {
  const slug = title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '');
  return slug === '' ? undefined : slug;
}

// Reserves a folder of the library with a plain mkdir (P10c). True when this call made it; false when a folder,
// a file or a dangling link of that name already exists. Errors carry no path.
export function reserveProjectFolder(
  libraryRoot: string,
  name: string,
): boolean {
  try {
    mkdirSync(join(libraryRoot, name));
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EEXIST') return false;
    if (code === 'ENAMETOOLONG') {
      throw fail(PROJECT_ERROR_CODES.PATH_INVALID, PATH_MESSAGES.TOO_LONG);
    }
    throw unexpected(error);
  }
}

// Adds the .scriba/ line to the project's .gitignore (P14). Nothing is written when a line already holds it.
// A missing .gitignore is created with the line alone.
export function appendGitignoreLine(
  store: ProjectStoreService,
  root: string,
): void {
  const target = store.resolvePath(root, GITIGNORE);
  const text = target.exists ? readFileSync(target.realPath, 'utf8') : '';
  if (text.split(/\r?\n/).some((line) => line.trim() === SCRIBA_LINE)) return;
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lineEnding = text !== '' && !text.endsWith('\n') ? eol : '';
  writeFileAtomic(target.realPath, `${text}${lineEnding}${SCRIBA_LINE}${eol}`);
}

// Any other file-system error. It carries the errno code only: no path and no cause.
function unexpected(error: unknown): Error {
  const code = (error as NodeJS.ErrnoException).code ?? 'unknown';
  return new Error(`The project folder could not be created (${code}).`);
}
