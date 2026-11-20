import { Module } from '@nestjs/common';
import { CompileExportModule } from '../compile-export/compile-export.module';
import { PlatformModule, SettingsService } from '../platform/platform.module';
import { ProjectStoreModule } from '../project-store/project-store.module';
import { ProvidersModule } from '../providers/providers.module';
import { ToolRegistryModule } from '../tool-registry/tool-registry.module';
import { AgentConversationsController } from './agent-conversations.controller';
import { AgentRunsController } from './agent-runs.controller';
import { AgentRunsService } from './agent-runs.service';
import { AgentSettingsController } from './agent-settings.controller';
import { AGENT_SETTINGS_SECTION_DEF } from './agent-settings.section';
import { AgentSettingsService } from './agent-settings.service';
import { AgentToolsService } from './agent-tools.service';
import { GroundingEngine } from './grounding-engine';
import { AgentTranscriptsService } from './transcript-reader';

// Modules outside agent-loop import these from this entry file only.
export { AgentSettingsService } from './agent-settings.service';
export { AgentToolsService } from './agent-tools.service';
export { GroundingEngine, GroundingFailure } from './grounding-engine';
export type { ToolRun } from './tools/tool-run';
export type {
  DispatchResult,
  ToolIssue,
  ToolOutcome,
} from './tools/tool-types';
export type {
  AgentSettings,
  AgentSettingsUpdate,
} from '@bbartolome/scriba-contracts/agent-loop';

const AGENT_SETTINGS_REGISTRATION = 'AGENT_SETTINGS_REGISTRATION';

// Agent loop: the agent section of settings.yaml, its settings API, the tool dispatcher, the run loop with its start and
// stop commands, the run transcripts in logs/agent-runs, and the conversation history rebuilt from them. Grounding: its
// engine is registered here and wired into the runs by AgentRunsService (the checks after drafts, the on-demand run).
@Module({
  imports: [
    PlatformModule,
    ProjectStoreModule,
    ProvidersModule,
    ToolRegistryModule,
    CompileExportModule,
  ],
  controllers: [
    AgentSettingsController,
    AgentRunsController,
    AgentConversationsController,
  ],
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
    AgentToolsService,
    GroundingEngine,
    AgentTranscriptsService,
    AgentRunsService,
  ],
  exports: [AgentSettingsService, AgentToolsService, GroundingEngine],
})
export class AgentLoopModule {}
