import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  pendingChangeSchema,
  type PendingChange,
} from '@bbartolome/scriba-contracts/project-store';
import { writeFileAtomic } from './atomic-write';
import type { DiscoveredProject } from './project-discovery';
import { ownFolder } from './own-folder';

const STATE_DIR = '.scriba';
const PENDING_DIR = 'pending';
const RESOLVED_DIR = 'resolved';

// The form of a pending id that newPendingId makes: the UTC time, a dash, six hex digits (PST-16 D3).
export const PENDING_ID_PATTERN = /^\d{8}T\d{9}Z-[0-9a-f]{6}$/;

// True when id has the form of a pending id. Ids of any other form never reach a path.
export function isPendingId(id: string): boolean {
  return PENDING_ID_PATTERN.test(id);
}

// The folder of the open changes of one project, .scriba/pending/. With create false, a missing folder is
// undefined and nothing is created (GETs never mutate). The folders lie inside the project's own .scriba (P13).
export function pendingFolder(
  project: DiscoveredProject,
  create: boolean,
): string | undefined {
  return ownFolder(project, [STATE_DIR, PENDING_DIR], create);
}

// The folder of the resolved changes, .scriba/pending/resolved/ (PST-16 D2). The same rules as pendingFolder.
export function resolvedFolder(
  project: DiscoveredProject,
  create: boolean,
): string | undefined {
  return ownFolder(project, [STATE_DIR, PENDING_DIR, RESOLVED_DIR], create);
}

// A time-based id: the UTC time as YYYYMMDDTHHMMSSmmmZ, then - and six lower-case hex characters (PST-16 form).
export function newPendingId(now: Date): string {
  return `${now.toISOString().replace(/[-:.]/g, '')}-${randomBytes(3).toString('hex')}`;
}

// The open changes of a folder, in id order. A file that does not parse as a change is an error that names
// neither the file nor its content.
export function readOpenChanges(folder: string | undefined): PendingChange[] {
  if (folder === undefined) return [];
  const names = readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();
  return names.map((name) => {
    const parsed = pendingChangeSchema.safeParse(
      JSON.parse(readFileSync(join(folder, name), 'utf8')) as unknown,
    );
    if (!parsed.success) {
      throw new Error('A pending change file could not be read.');
    }
    return parsed.data;
  });
}

// One open or resolved change of a folder, by id, or undefined when the file is missing. The file is parsed the
// same way as readOpenChanges.
export function readChange(
  folder: string | undefined,
  id: string,
): PendingChange | undefined {
  if (folder === undefined) return undefined;
  const path = join(folder, `${id}.json`);
  if (!existsSync(path)) return undefined;
  const parsed = pendingChangeSchema.safeParse(
    JSON.parse(readFileSync(path, 'utf8')) as unknown,
  );
  if (!parsed.success) {
    throw new Error('A pending change file could not be read.');
  }
  return parsed.data;
}

// Writes one change as pretty-printed JSON with a final LF, atomically.
export function writeChange(folder: string, change: PendingChange): void {
  writeFileAtomic(
    join(folder, `${change.id}.json`),
    JSON.stringify(change, null, 2) + '\n',
  );
}

// A registration pattern as a regular expression: * matches any run of characters except /, everything else is
// literal, and the whole path must match.
export function patternToRegExp(pattern: string): RegExp {
  const body = pattern
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^/]*');
  return new RegExp(`^${body}$`);
}
