import { Injectable } from '@nestjs/common';
import {
  PROJECT_ERROR_CODES,
  PROJECT_ERROR_STATUS,
  type EntityList,
  type EntityResolution,
} from '@bbartolome/scriba-contracts/project-store';
import { ModuleError } from '../platform/platform.module';
import { EntityManifest } from './entity-manifest';
import type { DiscoveredProject } from './project-discovery';
import { ProjectStoreService } from './project-store.service';
import { PROJECT_MESSAGES, ProjectsService } from './projects.service';

// The entity list and the entity resolution of the Project store. Both are reads: they never write, publish an
// event or touch .scriba/ (P8). Each runs the active check and the lookup of the project (S8), then the manifest.
@Injectable()
export class EntitiesService {
  constructor(
    private readonly store: ProjectStoreService,
    private readonly projects: ProjectsService,
    private readonly manifest: EntityManifest,
  ) {}

  // Every valid entity, sorted by path, with the type filter applied to them; then every invalid file (P6).
  list(projectId: string, query: { type?: string }): EntityList {
    const project = this.projectFor(projectId);
    const snapshot = this.manifest.snapshot(project.root);
    const entities = snapshot.entities.filter(
      (entity) => query.type === undefined || entity.type === query.type,
    );
    return { entities, invalid: snapshot.invalid };
  }

  // The resolution of each id, in request order (P5). An id given twice is answered once. An id with no valid
  // entity, or with two or more, is an error; a duplicate lists its paths and is never guessed.
  resolve(projectId: string, ids: string[]): EntityResolution {
    const project = this.projectFor(projectId);
    const { entities } = this.manifest.snapshot(project.root);
    const resolved: EntityResolution['resolved'] = [];
    const errors: EntityResolution['errors'] = [];
    for (const id of new Set(ids)) {
      const matches = entities.filter((entity) => entity.id === id);
      if (matches.length === 0) {
        errors.push({ id, code: 'unknown' });
        continue;
      }
      if (matches.length > 1) {
        errors.push({
          id,
          code: 'duplicate',
          paths: matches.map((match) => match.path),
        });
        continue;
      }
      const [match] = matches;
      // A file that is gone, over the cap or not text at the read is unknown, as an invalid file is (R6).
      const content = this.manifest.readText(project.root, match.path);
      if (content === undefined) {
        errors.push({ id, code: 'unknown' });
        continue;
      }
      resolved.push({ id, type: match.type, path: match.path, content });
    }
    return { resolved, errors };
  }

  // The active check, then the lookup (S8). A project that is not active is refused before the folder is looked up.
  private projectFor(projectId: string): DiscoveredProject {
    this.store.requireActive(projectId);
    const project = this.projects.find(projectId);
    if (project === undefined) {
      throw new ModuleError(
        PROJECT_ERROR_CODES.NOT_FOUND,
        PROJECT_ERROR_STATUS.PROJECT_NOT_FOUND,
        PROJECT_MESSAGES.NOT_FOUND,
      );
    }
    return project;
  }
}
