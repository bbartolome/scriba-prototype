import type { ServerResponse } from 'node:http';
import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import {
  AGENT_GROUNDING_ROUTE,
  AGENT_RUNS_ROUTE,
  AGENT_RUN_CURRENT_ROUTE,
  AGENT_RUN_STOP_ROUTE,
  agentStartRequestSchema,
  agentStopRequestSchema,
  groundingRequestSchema,
  type AgentStartRequest,
  type AgentStartResponse,
  type AgentStopRequest,
  type GroundingRequest,
} from '@bbartolome/scriba-contracts/agent-loop';
import { ZodValidationPipe } from '../platform/platform.module';
import { AgentRunsService } from './agent-runs.service';

// The agent-run commands and the run state read, behind Setup & auth's guard. Start answers at once; the run's progress
// comes over /events.
@Controller()
export class AgentRunsController {
  constructor(private readonly runs: AgentRunsService) {}

  // The active run's state, or the JSON null when there is none (AGL-05 D3). The body is serialized in the same call as
  // the read, so no event can change the state between them. A refusal is thrown before anything is written (D7).
  @Get(AGENT_RUN_CURRENT_ROUTE)
  current(@Res() response: ServerResponse): void {
    const body = JSON.stringify(this.runs.current());
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(body);
  }

  @Post(AGENT_RUNS_ROUTE)
  @HttpCode(200)
  start(
    @Body(new ZodValidationPipe(agentStartRequestSchema))
    body: AgentStartRequest,
  ): AgentStartResponse {
    return this.runs.start(body);
  }

  // The on-demand grounding check of one file (AGL-17). It answers the start reply; the check's events come over /events.
  @Post(AGENT_GROUNDING_ROUTE)
  @HttpCode(200)
  checkGrounding(
    @Body(new ZodValidationPipe(groundingRequestSchema))
    body: GroundingRequest,
  ): AgentStartResponse {
    return this.runs.checkGrounding(body);
  }

  @Post(AGENT_RUN_STOP_ROUTE)
  @HttpCode(200)
  stop(
    @Body(new ZodValidationPipe(agentStopRequestSchema))
    body: AgentStopRequest,
  ): Record<string, never> {
    this.runs.stop(body.runId);
    return {};
  }
}
