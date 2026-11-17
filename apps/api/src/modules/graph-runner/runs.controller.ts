import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  RUN_CURRENT_ROUTE,
  RUN_STOP_ROUTE,
  RUNS_ROUTE,
  runStartRequestSchema,
  runStopRequestSchema,
  type CurrentRun,
  type RunStartRequest,
  type RunStartResult,
  type RunStopRequest,
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

  @Post(RUN_STOP_ROUTE)
  @HttpCode(200)
  stop(
    @Body(new ZodValidationPipe(runStopRequestSchema))
    body: RunStopRequest,
  ): Record<string, never> {
    this.runs.stop(body.runId);
    return {};
  }
}
