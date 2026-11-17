import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  RUN_CURRENT_ROUTE,
  RUNS_ROUTE,
  runStartRequestSchema,
  type CurrentRun,
  type RunStartRequest,
  type RunStartResult,
} from '@bbartolome/scriba-contracts/graph-runner';
import { ZodValidationPipe } from '../platform/platform.module';
import { RunsService } from './runs.service';

// The run routes, behind Setup & auth's guard. The start is a POST; the current run is a GET and never mutates.
@Controller()
export class RunsController {
  constructor(private readonly runs: RunsService) {}

  @Post(RUNS_ROUTE)
  @HttpCode(200)
  start(
    @Body(new ZodValidationPipe(runStartRequestSchema))
    body: RunStartRequest,
  ): RunStartResult {
    return this.runs.start(body);
  }

  @Get(RUN_CURRENT_ROUTE)
  current(): CurrentRun {
    return this.runs.current();
  }
}
