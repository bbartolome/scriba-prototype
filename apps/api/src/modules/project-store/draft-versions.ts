import { existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { ownFolder } from './own-folder';
import type { DiscoveredProject } from './project-discovery';
import { writeText } from './files.service';

// A top-level file of drafts/, such as drafts/ch01.md. Only these have versions on apply (PST-16 D5, module line 75).
export function isTopLevelDraft(relativePath: string): boolean {
  return /^drafts\/[^/]+$/.test(relativePath);
}

// The compact ISO-8601 basic form with milliseconds: YYYYMMDDTHHMMSSmmmZ, the same as the start of a pending id.
export function compactStamp(now: Date): string {
  return now.toISOString().replace(/[-:.]/g, '');
}

// The file name of one version: the stamp and the extension. A name that is taken gets -n between the stamp and
// the extension, with n from 2 (PST-16 D5, plan choice). A name with no extension gets no extension.
export function versionNameFor(
  stamp: string,
  ext: string,
  taken: (name: string) => boolean,
): string {
  let name = `${stamp}${ext}`;
  for (let n = 2; taken(name); n++) {
    name = `${stamp}-${n}${ext}`;
  }
  return name;
}

// The folder of the versions of one draft, drafts/.versions/<draft file name>/. With create false, a missing folder
// is undefined. The folders are checked by their real paths inside the project (PST-16 D18).
export function versionFolderOf(
  project: DiscoveredProject,
  draftPath: string,
  create: boolean,
): string | undefined {
  return ownFolder(
    project,
    ['drafts', '.versions', basename(draftPath)],
    create,
  );
}

// Saves the bytes that an apply replaces, as a new version of the draft, and returns the version id (its file
// name). The version is written before the target, so the replaced text is kept when the target write fails.
export function saveVersion(
  project: DiscoveredProject,
  draftPath: string,
  bytes: Buffer,
  now: Date,
): string {
  const folder = versionFolderOf(project, draftPath, true) as string;
  const name = versionNameFor(
    compactStamp(now),
    extname(basename(draftPath)),
    (candidate) => existsSync(join(folder, candidate)),
  );
  writeText(join(folder, name), bytes);
  return name;
}

// The form of a version id, which is its file name: the stamp, a -n when the name was taken, and the extension
// (PST-18 D14). Every name that saveVersion writes matches it.
export const VERSION_ID_PATTERN = /^\d{8}T\d{9}Z(?:-\d+)?(?:\.[^./\\\0]+)?$/;

// True when id has the form of a version file name. A value that does not match names no version.
export function isVersionId(id: string): boolean {
  return VERSION_ID_PATTERN.test(id);
}

// The time of a version, from the first 19 characters of its id, in ISO-8601 with milliseconds (PST-18 D4).
export function createdAtOf(id: string): string {
  const stamp = id.slice(0, 19);
  return `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}.${stamp.slice(15, 18)}Z`;
}

// The n of a version id, where no suffix counts as 1 (PST-18 D4).
function sequenceOf(id: string): number {
  const match = /^\d{8}T\d{9}Z-(\d+)/.exec(id);
  return match === null ? 1 : Number(match[1]);
}

// Orders two version ids newest first: by stamp, then by n (PST-18 D4). Returns a negative number when a comes first.
export function compareNewestFirst(a: string, b: string): number {
  const stampA = a.slice(0, 19);
  const stampB = b.slice(0, 19);
  if (stampA !== stampB) return stampA < stampB ? 1 : -1;
  return sequenceOf(b) - sequenceOf(a);
}
