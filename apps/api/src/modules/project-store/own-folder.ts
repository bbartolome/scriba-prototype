import { existsSync, mkdirSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { PROJECT_ERROR_CODES } from '@bbartolome/scriba-contracts/project-store';
import { fail, PATH_MESSAGES } from './path-safety';
import type { DiscoveredProject } from './project-discovery';

// A folder that the module owns, at segments inside the project root (for example ['.scriba', 'pending']). Each
// folder on the way must resolve, by its real path, to the same place under the project's real root, so a link
// cannot lead out of the project (P13). A folder that is missing is undefined when create is false, and is created
// when create is true. A mkdir failure carries the errno only.
export function ownFolder(
  project: DiscoveredProject,
  segments: readonly string[],
  create: boolean,
): string | undefined {
  const realRoot = realpathSync.native(project.root);
  let current = project.root;
  for (let depth = 1; depth <= segments.length; depth++) {
    current = join(current, segments[depth - 1] as string);
    if (!existsSync(current)) {
      if (!create) return undefined;
      try {
        mkdirSync(current);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code ?? 'unknown';
        throw new Error(`The project folder could not be created (${code}).`, {
          cause: error,
        });
      }
    }
    const expected = join(realRoot, ...segments.slice(0, depth));
    if (realpathSync.native(current) !== expected) {
      throw fail(PROJECT_ERROR_CODES.PATH_OUTSIDE, PATH_MESSAGES.OUTSIDE);
    }
  }
  return current;
}
