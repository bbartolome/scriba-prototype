import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  PROJECT_PENDING_ROUTE,
  pendingListQuerySchema,
  type PendingList,
  type PendingListQuery,
} from '@bbartolome/scriba-contracts/project-store';
import { ZodValidationPipe } from '../platform/platform.module';
import { PendingService } from './pending.service';

// The queue of open pending changes, behind Setup & auth's guard. It only reads.
@Controller()
export class PendingController {
  constructor(private readonly pending: PendingService) {}

  @Get(PROJECT_PENDING_ROUTE)
  list(
    @Param('projectId') projectId: string,
    @Query(new ZodValidationPipe(pendingListQuerySchema))
    query: PendingListQuery,
  ): PendingList {
    return this.pending.list(projectId, query);
  }
}
