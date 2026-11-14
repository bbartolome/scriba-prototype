import { Inject, Injectable } from '@nestjs/common';
import { SCRIBA_ENV, type ScribaEnv } from '../platform/platform.module';
import { resolveProjectPath, type ResolvedProjectPath } from './path-safety';

// The in-process API of the Project store. Other modules inject it through the module's entry file.
@Injectable()
export class ProjectStoreService {
  constructor(@Inject(SCRIBA_ENV) private readonly env: ScribaEnv) {}

  // The library root as configured (SCRIBA_BOOKS_DIR), not realpathed.
  get libraryRoot(): string {
    return this.env.SCRIBA_BOOKS_DIR;
  }

  // The one path check. Reserved paths are refused.
  resolvePath(projectRoot: string, path: string): ResolvedProjectPath {
    return resolveProjectPath(projectRoot, path);
  }
}
