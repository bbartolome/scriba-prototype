import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { compactStamp, versionNameFor } from './draft-versions';
import { writeText } from './files.service';
import { ownFolder } from './own-folder';
import type { DiscoveredProject } from './project-discovery';

// Saves the disk bytes that an accept anyway replaces, under <project>/<segments>/<stamp>[-n]/<path>, and returns
// the name of the backup folder (PST-17 D3, D11). The default folder is .scriba/backups; a migration passes
// .scriba/project-store/backups (PST-23 C11). Each backup claims a new folder, so two backups never overwrite each
// other.
export function saveBackup(
  project: DiscoveredProject,
  relativePath: string,
  bytes: Buffer,
  now: Date,
  segments: readonly string[] = ['.scriba', 'backups'],
): string {
  const root = ownFolder(project, segments, true) as string;
  const name = versionNameFor(compactStamp(now), '', (candidate) =>
    existsSync(join(root, candidate)),
  );
  writeText(join(root, name, relativePath), bytes);
  return name;
}
