import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  AGENT_SETTINGS_ROUTE,
  agentSettingsUpdateSchema,
  type AgentSettings,
  type AgentSettingsUpdate,
} from '@bbartolome/scriba-contracts/agent-loop';
import { ZodValidationPipe } from '../platform/platform.module';
import { AgentSettingsService } from './agent-settings.service';

// The agent settings HTTP API, behind Setup & auth's guard. GET reads and never mutates; POST is the command.
// The body goes through the contract's update schema, so a bad value is refused before the service runs.
@Controller()
export class AgentSettingsController {
  constructor(private readonly settings: AgentSettingsService) {}

  @Get(AGENT_SETTINGS_ROUTE)
  current(): AgentSettings {
    return this.settings.current();
  }

  @Post(AGENT_SETTINGS_ROUTE)
  @HttpCode(200)
  update(
    @Body(new ZodValidationPipe(agentSettingsUpdateSchema))
    body: AgentSettingsUpdate,
  ): AgentSettings {
    return this.settings.update(body);
  }
}
