import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  MANUSCRIPT_PART_ROUTE,
  MANUSCRIPT_REORDER_ROUTE,
  MANUSCRIPT_ROUTE,
  MANUSCRIPT_STATUS_ROUTE,
  manuscriptPartRequestSchema,
  manuscriptReorderRequestSchema,
  manuscriptStatusRequestSchema,
  type ManuscriptPartRequest,
  type ManuscriptReorderRequest,
  type ManuscriptStatusRequest,
  type ManuscriptView,
} from '@bbartolome/scriba-contracts/compile-export';
import { ZodValidationPipe } from '../platform/platform.module';
import { ManuscriptService } from './manuscript.service';
import { ManuscriptWriteService } from './manuscript-write.service';

// The compile-export manuscript routes, behind Setup & auth's guard. The GET never mutates; each write is a POST
// whose body is checked by its contract schema (P4, step 1).
@Controller()
export class ManuscriptController {
  constructor(
    private readonly manuscript: ManuscriptService,
    private readonly writes: ManuscriptWriteService,
  ) {}

  @Get(MANUSCRIPT_ROUTE)
  view(): ManuscriptView {
    return this.manuscript.view();
  }

  @Post(MANUSCRIPT_REORDER_ROUTE)
  @HttpCode(200)
  reorder(
    @Body(new ZodValidationPipe(manuscriptReorderRequestSchema))
    body: ManuscriptReorderRequest,
  ): ManuscriptView {
    return this.writes.reorder(body);
  }

  @Post(MANUSCRIPT_STATUS_ROUTE)
  @HttpCode(200)
  setStatus(
    @Body(new ZodValidationPipe(manuscriptStatusRequestSchema))
    body: ManuscriptStatusRequest,
  ): ManuscriptView {
    return this.writes.setStatus(body);
  }

  @Post(MANUSCRIPT_PART_ROUTE)
  @HttpCode(200)
  setPart(
    @Body(new ZodValidationPipe(manuscriptPartRequestSchema))
    body: ManuscriptPartRequest,
  ): ManuscriptView {
    return this.writes.setPart(body);
  }
}
