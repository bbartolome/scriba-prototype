import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import {
  PROJECT_PENDING_ACCEPT_ROUTE,
  PROJECT_PENDING_REJECT_ROUTE,
  PROJECT_PENDING_ROUTE,
  pendingDecisionSchema,
  pendingListQuerySchema,
  type PendingChange,
  type PendingDecision,
  type PendingList,
  type PendingListQuery,
} from '@bbartolome/scriba-contracts/project-store';
import { ZodValidationPipe } from '../platform/platform.module';
import { PendingService } from './pending.service';

// The queue of open pending changes, and the accept and reject of one change, behind Setup & auth's guard.
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

  // The body is optional: an accept with no body applies the proposal (PST-16 D21).
  @Post(PROJECT_PENDING_ACCEPT_ROUTE)
  @HttpCode(200)
  accept(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(pendingDecisionSchema.optional()))
    body: PendingDecision | undefined,
  ): PendingChange {
    return this.pending.accept(projectId, id, body ?? {});
  }

  @Post(PROJECT_PENDING_REJECT_ROUTE)
  @HttpCode(200)
  reject(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): PendingChange {
    return this.pending.reject(projectId, id);
  }
}
