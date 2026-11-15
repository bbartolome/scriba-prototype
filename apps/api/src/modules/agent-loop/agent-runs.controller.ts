import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  AGENT_RUNS_ROUTE,
  AGENT_RUN_STOP_ROUTE,
  agentStartRequestSchema,
  agentStopRequestSchema,
  type AgentStartRequest,
  type AgentStartResponse,
  type AgentStopRequest,
} from '@bbartolome/scriba-contracts/agent-loop';
import { ZodValidationPipe } from '../platform/platform.module';
import { AgentRunsService } from './agent-runs.service';

// The agent-run commands, behind Setup & auth's guard. Start answers at once; the run's progress comes over /events.
@Controller()
export class AgentRunsController {
  constructor(private readonly runs: AgentRunsService) {}

  @Post(AGENT_RUNS_ROUTE)
  @HttpCode(200)
  start(
    @Body(new ZodValidationPipe(agentStartRequestSchema))
    body: AgentStartRequest,
  ): AgentStartResponse {
    return this.runs.start(body);
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
