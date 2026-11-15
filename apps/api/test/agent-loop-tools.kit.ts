import { randomUUID } from 'node:crypto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Module,
  NotFoundException,
  Param,
  Post,
  type Type,
} from '@nestjs/common';
import {
  AgentLoopModule,
  AgentToolsService,
  type DispatchResult,
  type ToolRun,
} from '../src/modules/agent-loop/agent-loop.module';
import { PlatformModule } from '../src/modules/platform/platform.module';

// A test-only HTTP harness for the tool dispatcher. Each run is one ToolRun, kept in a map inside this kit, with the
// project family enabled. The kit has no guard, and it is never in the composed app.
export function agentLoopToolsKitModule(): Type<unknown> {
  const runs = new Map<string, ToolRun>();

  function runOf(runId: string): ToolRun {
    const run = runs.get(runId);
    if (run === undefined) throw new NotFoundException('No such run.');
    return run;
  }

  @Controller('api/agent-loop-test')
  class AgentLoopToolsKitController {
    constructor(private readonly tools: AgentToolsService) {}

    @Post('runs')
    @HttpCode(200)
    startRun(@Body() body: { projectId: string }): { runId: string } {
      const runId = randomUUID();
      runs.set(
        runId,
        this.tools.startRun({
          runId,
          projectId: body.projectId,
          enabledFamilies: ['project'],
        }),
      );
      return { runId };
    }

    // The arguments are passed as the raw string the provider would send.
    @Post('runs/:runId/calls')
    @HttpCode(200)
    dispatch(
      @Param('runId') runId: string,
      @Body() body: { callId: string; name: string; arguments: string },
    ): Promise<DispatchResult> {
      return runOf(runId).dispatch({
        callId: body.callId,
        name: body.name,
        arguments: body.arguments,
      });
    }

    @Get('runs/:runId/tools')
    offered(@Param('runId') runId: string): { tools: string[] } {
      return {
        tools: runOf(runId).schemas().map((schema) => schema.function.name),
      };
    }
  }

  @Module({
    imports: [PlatformModule, AgentLoopModule],
    controllers: [AgentLoopToolsKitController],
  })
  class AgentLoopToolsKitModule {}

  return AgentLoopToolsKitModule;
}
