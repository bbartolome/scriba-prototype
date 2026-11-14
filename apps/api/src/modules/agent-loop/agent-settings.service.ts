import { Injectable } from '@nestjs/common';
import {
  AGENT_SETTINGS_DEFAULTS,
  agentSettingsSchema,
  type AgentSettings,
  type AgentSettingsUpdate,
} from '@bbartolome/scriba-contracts/agent-loop';
import { SettingsService } from '../platform/platform.module';

// Reads and writes the agent section of settings.yaml. Nothing is cached: each read sees the file as it is now.
@Injectable()
export class AgentSettingsService {
  constructor(private readonly settings: SettingsService) {}

  // The current settings. The loop reads this at the start of each agent run.
  current(): AgentSettings {
    const stored = this.settings.read('agent');
    if (stored === undefined) return AGENT_SETTINGS_DEFAULTS;
    return agentSettingsSchema.parse(stored);
  }

  // Field-level merge onto the current settings, then validated and written. Unknown stored keys are kept.
  update(body: AgentSettingsUpdate): AgentSettings {
    const base = this.current();
    const next = agentSettingsSchema.parse({
      ...base,
      stepCap: body.stepCap ?? base.stepCap,
      research: { ...base.research, ...body.research },
    });
    this.settings.write('agent', next);
    return next;
  }
}
