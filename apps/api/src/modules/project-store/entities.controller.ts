import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  PROJECT_ENTITIES_ROUTE,
  PROJECT_ENTITY_RESOLVE_ROUTE,
  entityListQuerySchema,
  entityResolveQuerySchema,
  type EntityList,
  type EntityListQuery,
  type EntityResolution,
  type EntityResolveQuery,
} from '@bbartolome/scriba-contracts/project-store';
import { ZodValidationPipe } from '../platform/platform.module';
import { EntitiesService } from './entities.service';

// The entity list and the entity resolution, behind Setup & auth's guard. Both are GETs and only read.
@Controller()
export class EntitiesController {
  constructor(private readonly entities: EntitiesService) {}

  @Get(PROJECT_ENTITIES_ROUTE)
  list(
    @Param('projectId') projectId: string,
    @Query(new ZodValidationPipe(entityListQuerySchema)) query: EntityListQuery,
  ): EntityList {
    return this.entities.list(projectId, query);
  }

  @Get(PROJECT_ENTITY_RESOLVE_ROUTE)
  resolve(
    @Param('projectId') projectId: string,
    @Query(new ZodValidationPipe(entityResolveQuerySchema))
    query: EntityResolveQuery,
  ): EntityResolution {
    return this.entities.resolve(projectId, query.ids);
  }
}
