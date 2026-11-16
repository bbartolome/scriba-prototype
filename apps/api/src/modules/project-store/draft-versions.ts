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
