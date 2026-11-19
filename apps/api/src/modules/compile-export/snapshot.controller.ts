import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  SNAPSHOTS_ROUTE,
  snapshotCreateRequestSchema,
  type SnapshotCreateRequest,
  type SnapshotList,
  type SnapshotSummary,
} from '@bbartolome/scriba-contracts/compile-export';
import { ZodValidationPipe } from '../platform/platform.module';
import { SnapshotService } from './snapshot.service';

// The snapshot routes, behind Setup & auth's guard. The GET never mutates; each POST is checked by its contract
// schema (P1, P11).
@Controller()
export class SnapshotController {
  constructor(private readonly snapshots: SnapshotService) {}

  @Get(SNAPSHOTS_ROUTE)
  list(): SnapshotList {
    return { snapshots: this.snapshots.list() };
  }

  @Post(SNAPSHOTS_ROUTE)
  @HttpCode(200)
  create(
    @Body(new ZodValidationPipe(snapshotCreateRequestSchema))
    body: SnapshotCreateRequest,
  ): SnapshotSummary {
    return this.snapshots.create(body.label);
  }
}
