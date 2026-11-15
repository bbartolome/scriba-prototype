import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  PROJECT_START_FROM_SAMPLE_ROUTE,
  SAMPLES_ROUTE,
  startFromSampleRequestSchema,
  type ProjectSummary,
  type Sample,
  type StartFromSampleRequest,
} from '@bbartolome/scriba-contracts/project-store';
import { ZodValidationPipe } from '../platform/platform.module';
import { SamplesService } from './samples.service';

// The sample list (a GET that never mutates) and Start from sample (a POST), behind Setup & auth's guard. The POST
// answers the summary of the new project, as New does, and does not activate it.
@Controller()
export class SamplesController {
  constructor(private readonly samples: SamplesService) {}

  @Get(SAMPLES_ROUTE)
  list(): Sample[] {
    return this.samples.list();
  }

  @Post(PROJECT_START_FROM_SAMPLE_ROUTE)
  @HttpCode(201)
  start(
    @Body(new ZodValidationPipe(startFromSampleRequestSchema))
    body: StartFromSampleRequest,
  ): ProjectSummary {
    return this.samples.start(body);
  }
}
