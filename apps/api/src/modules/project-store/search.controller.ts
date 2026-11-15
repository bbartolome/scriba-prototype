import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import {
  PROJECT_REBUILD_ROUTE,
  PROJECT_SEARCH_ROUTE,
  searchRequestSchema,
  type SearchRequest,
  type SearchResult,
} from '@bbartolome/scriba-contracts/project-store';
import { ZodValidationPipe } from '../platform/platform.module';
import { SearchService } from './search.service';

// The keyword search and the full rebuild of a project's index, behind Setup & auth's guard. Both are POSTs,
// because the search may refresh the index and the rebuild rewrites it (module line 46).
@Controller()
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Post(PROJECT_SEARCH_ROUTE)
  @HttpCode(200)
  query(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(searchRequestSchema)) body: SearchRequest,
  ): SearchResult {
    return this.search.search(projectId, body);
  }

  @Post(PROJECT_REBUILD_ROUTE)
  @HttpCode(204)
  rebuild(@Param('projectId') projectId: string): void {
    this.search.rebuild(projectId);
  }
}
