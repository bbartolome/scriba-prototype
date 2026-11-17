import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  draftRestoreSchema,
  draftVersionReadQuerySchema,
  PROJECT_VERSION_RESTORE_ROUTE,
  PROJECT_VERSION_ROUTE,
  PROJECT_VERSIONS_ROUTE,
  type DraftRestore,
  type DraftVersionList,
  type DraftVersionRead,
  type DraftVersionReadQuery,
} from '@bbartolome/scriba-contracts/project-store';
import { ZodValidationPipe } from '../platform/platform.module';
import { DraftVersionsService } from './draft-versions.service';

// The query of the list: only the draft's path.
const draftVersionListQuerySchema = draftVersionReadQuerySchema.pick({
  draftPath: true,
});

// The versions of a top-level draft, behind Setup & auth's guard. The two GETs only read. The POST is an author
// action that saves the current text as a version and then writes the restored text.
@Controller()
export class DraftVersionsController {
  constructor(private readonly versions: DraftVersionsService) {}

  @Get(PROJECT_VERSIONS_ROUTE)
  list(
    @Param('projectId') projectId: string,
    @Query(new ZodValidationPipe(draftVersionListQuerySchema))
    query: { draftPath: string },
  ): DraftVersionList {
    return this.versions.list(projectId, query.draftPath);
  }

  @Get(PROJECT_VERSION_ROUTE)
  read(
    @Param('projectId') projectId: string,
    @Query(new ZodValidationPipe(draftVersionReadQuerySchema))
    query: DraftVersionReadQuery,
  ): DraftVersionRead {
    return this.versions.read(projectId, query.draftPath, query.id);
  }

  @Post(PROJECT_VERSION_RESTORE_ROUTE)
  @HttpCode(200)
  restore(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(draftRestoreSchema)) body: DraftRestore,
  ): DraftVersionRead {
    return this.versions.restore(projectId, body);
  }
}
