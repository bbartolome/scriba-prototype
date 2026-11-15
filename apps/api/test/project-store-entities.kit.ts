import { join } from 'node:path';
import {
  Body,
  Controller,
  HttpCode,
  Module,
  Post,
  type Type,
} from '@nestjs/common';
import {
  PROJECT_ENTITIES_ROUTE,
  PROJECT_ENTITY_RESOLVE_ROUTE,
  type EntityList,
  type EntityResolution,
} from '@bbartolome/scriba-contracts/project-store';
import { PlatformModule } from '../src/modules/platform/platform.module';
import {
  EntitiesService,
  EntityManifest,
  ProjectStoreModule,
  ProjectStoreService,
} from '../src/modules/project-store/project-store.module';
import type { TestApp } from './create-test-app';
import { send, type Reply } from './guard-request';
import { LOOPBACK_HOST } from './invariant-sweep';

// The URL of an entity route, with its query. A query value that is an array repeats its key (the ids of a
// resolution). The :projectId of the template is replaced.
export function entityUrl(
  template: string,
  projectId: string,
  query: Record<string, string | string[]> = {},
): string {
  const path = template.replace(':projectId', projectId);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      params.append(key, item);
    }
  }
  const search = params.toString();
  return search === '' ? path : `${path}?${search}`;
}

// One GET of the list route, with the loopback Host and the session cookie when one is given.
export function listEntities(
  app: TestApp,
  cookie: string | undefined,
  projectId: string,
  type?: string,
): Promise<Reply> {
  const query: Record<string, string> = {};
  if (type !== undefined) query.type = type;
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie,
    path: entityUrl(PROJECT_ENTITIES_ROUTE, projectId, query),
  });
}

// One GET of the resolution route, with `ids` repeated, with the loopback Host and the session cookie when given.
export function resolveEntities(
  app: TestApp,
  cookie: string | undefined,
  projectId: string,
  ids: string[],
): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    cookie,
    path: entityUrl(PROJECT_ENTITY_RESOLVE_ROUTE, projectId, { ids }),
  });
}

// A test module that calls the in-process provider with the request body unchecked (P17). It has no guard, as
// filesKitModule has none. Its routes sit under api/project-store-test, not under the API's routes.
export function entitiesKitModule(): Type<unknown> {
  @Controller('api/project-store-test')
  class EntitiesKitController {
    constructor(
      private readonly entities: EntitiesService,
      private readonly manifest: EntityManifest,
      private readonly store: ProjectStoreService,
    ) {}

    @Post('entities/list')
    @HttpCode(200)
    list(@Body() body: { projectId: string; type?: string }): EntityList {
      return this.entities.list(body.projectId, { type: body.type });
    }

    @Post('entities/resolve')
    @HttpCode(200)
    resolve(
      @Body() body: { projectId: string; ids: string[] },
    ): EntityResolution {
      return this.entities.resolve(body.projectId, body.ids);
    }

    // The paths of every file the manifest holds for a project folder of the library.
    @Post('entities/manifest')
    @HttpCode(200)
    manifestPaths(@Body() body: { projectId: string }): string[] {
      const root = join(this.store.libraryRoot, body.projectId);
      return this.manifest.snapshot(root).entries.map((entry) => entry.path);
    }
  }

  @Module({
    imports: [PlatformModule, ProjectStoreModule],
    controllers: [EntitiesKitController],
  })
  class EntitiesKitModule {}

  return EntitiesKitModule;
}
