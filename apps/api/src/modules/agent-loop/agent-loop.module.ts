import { Module } from '@nestjs/common';
import { PlatformModule, SettingsService } from '../platform/platform.module';
import { AgentSettingsController } from './agent-settings.controller';
import { AGENT_SETTINGS_SECTION_DEF } from './agent-settings.section';
import { AgentSettingsService } from './agent-settings.service';

// Modules outside agent-loop import these from this entry file only.
export { AgentSettingsService } from './agent-settings.service';
export type {
  AgentSettings,
  AgentSettingsUpdate,
} from '@bbartolome/scriba-contracts/agent-loop';

const AGENT_SETTINGS_REGISTRATION = 'AGENT_SETTINGS_REGISTRATION';

// Agent loop: the agent section of settings.yaml and its settings API. The loop itself lands in later units.
@Module({
  imports: [PlatformModule],
  controllers: [AgentSettingsController],
  providers: [
    {
      provide: AGENT_SETTINGS_REGISTRATION,
      inject: [SettingsService],
      useFactory: (settings: SettingsService): true => {
        settings.register(AGENT_SETTINGS_SECTION_DEF);
        return true;
      },
    },
    AgentSettingsService,
  ],
  exports: [AgentSettingsService],
})
export class AgentLoopModule {}
