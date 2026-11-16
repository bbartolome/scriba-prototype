import {
  Body,
  Controller,
  HttpCode,
  Module,
  Post,
  type Type,
} from '@nestjs/common';
import {
  AgentLoopModule,
  GroundingEngine,
  GroundingFailure,
} from '../src/modules/agent-loop/agent-loop.module';
import { WriteOverlay } from '../src/modules/agent-loop/tools/write-overlay';
import { PlatformModule } from '../src/modules/platform/platform.module';

// A test-only HTTP harness for the grounding engine until AGL-17 exists. It is never in the composed app.
// The reply is the GroundingResult on success, or {failure} with the readable text of a GroundingFailure.
export function agentLoopGroundingKitModule(): Type<unknown> {
  @Controller('api/agent-loop-test')
  class AgentLoopGroundingKitController {
    constructor(private readonly engine: GroundingEngine) {}

    @Post('grounding')
    @HttpCode(200)
    async check(
      @Body()
      body: {
        projectId: string;
        runId: string;
        targetPath: string;
        overlay?: Record<string, string>;
      },
    ): Promise<unknown> {
      let overlay: WriteOverlay | undefined;
      if (body.overlay !== undefined) {
        overlay = new WriteOverlay();
        for (const [path, content] of Object.entries(body.overlay)) {
          overlay.put(path, content, 'kit-overlay');
        }
      }
      try {
        return await this.engine.check({
          projectId: body.projectId,
          runId: body.runId,
          targetPath: body.targetPath,
          overlay,
        });
      } catch (error) {
        if (error instanceof GroundingFailure) {
          return { failure: error.message };
        }
        throw error;
      }
    }
  }

  @Module({
    imports: [PlatformModule, AgentLoopModule],
    controllers: [AgentLoopGroundingKitController],
  })
  class AgentLoopGroundingKitModule {}

  return AgentLoopGroundingKitModule;
}
