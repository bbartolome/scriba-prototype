import { accessSync, constants, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { BootError } from './boot-error';
import type { ScribaEnv } from './env';

// Makes sure `${SCRIBA_BOOKS_DIR}/.scriba` exists and is writable by this process. Runs before Nest.
// The container cannot see the host path, so the host line appears only when SCRIBA_LIBRARY is set.
export function ensureAppState(env: ScribaEnv): void {
  const container = join(env.SCRIBA_BOOKS_DIR, '.scriba');
  try {
    mkdirSync(container, { recursive: true });
    accessSync(container, constants.W_OK);
  } catch {
    const lines = [
      `Cannot write to the app-state folder ${container} as UID ${process.getuid!()}, GID ${process.getgid!()}.`,
    ];
    if (env.SCRIBA_LIBRARY !== undefined) {
      lines.push(`Host path: ${join(env.SCRIBA_LIBRARY, '.scriba')}`);
    }
    throw new BootError(lines.join('\n'));
  }
}
