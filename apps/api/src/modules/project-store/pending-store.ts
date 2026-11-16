import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  PROJECT_ERROR_CODES,
  pendingChangeSchema,
  type PendingChange,
} from '@bbartolome/scriba-contracts/project-store';
import { writeFileAtomic } from './atomic-write';
import type { DiscoveredProject } from './project-discovery';
import { fail, PATH_MESSAGES } from './path-safety';

const STATE_DIR = '.scriba';
const PENDING_DIR = 'pending';

// The folder of the open changes of one project, .scriba/pending/. With create false, a missing folder is
// undefined and nothing is created (GETs never mutate). The folders are checked to lie inside the project's own
// .scriba (P13), as stateDir does.
export function pendingFolder(
  project: DiscoveredProject,
  create: boolean,
): string | undefined {
  const realRoot = realpathSync.native(project.root);
  const scriba = join(project.root, STATE_DIR);
  if (
    existsSync(scriba) &&
    realpathSync.native(scriba) !== join(realRoot, STATE_DIR)
  ) {
    throw fail(PROJECT_ERROR_CODES.PATH_OUTSIDE, PATH_MESSAGES.OUTSIDE);
  }
  const folder = join(scriba, PENDING_DIR);
  if (!existsSync(folder)) {
    if (!create) return undefined;
    try {
      mkdirSync(folder, { recursive: true });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? 'unknown';
      throw new Error(`The project folder could not be created (${code}).`, {
        cause: error,
      });
    }
  }
  if (realpathSync.native(folder) !== join(realRoot, STATE_DIR, PENDING_DIR)) {
    throw fail(PROJECT_ERROR_CODES.PATH_OUTSIDE, PATH_MESSAGES.OUTSIDE);
  }
  return folder;
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
