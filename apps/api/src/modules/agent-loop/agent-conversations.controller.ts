import { Controller, Get, Param } from '@nestjs/common';
import {
  AGENT_CONVERSATION_ROUTE,
  AGENT_CONVERSATIONS_ROUTE,
  AGENT_ERROR_CODES,
  AGENT_ERROR_STATUS,
  type ConversationHistory,
  type ConversationList,
} from '@bbartolome/scriba-contracts/agent-loop';
import { ModuleError } from '../platform/platform.module';
import { ProjectStoreService } from '../project-store/project-store.module';
import { AgentTranscriptsService } from './transcript-reader';

// The conversations of the active project, rebuilt from its transcripts (D15), behind Setup & auth's guard. GET only:
// nothing here writes. The history lists the finished turns; an unknown conversation has none.
@Controller()
export class AgentConversationsController {
  constructor(
    private readonly store: ProjectStoreService,
    private readonly transcripts: AgentTranscriptsService,
  ) {}

  @Get(AGENT_CONVERSATIONS_ROUTE)
  list(): ConversationList {
    const projectId = this.activeProject();
    return { conversations: this.transcripts.conversations(projectId) };
  }

  @Get(AGENT_CONVERSATION_ROUTE)
  history(
    @Param('conversationId') conversationId: string,
  ): ConversationHistory {
    const projectId = this.activeProject();
    return {
      conversationId,
      turns: this.transcripts.turns(projectId, conversationId),
    };
  }

  // The active project's id, checked before any read (D15).
  private activeProject(): string {
    const projectId = this.store.activeId();
    if (projectId === null) {
      throw new ModuleError(
        AGENT_ERROR_CODES.NO_ACTIVE_PROJECT,
        AGENT_ERROR_STATUS[AGENT_ERROR_CODES.NO_ACTIVE_PROJECT],
        'No project is active. Activate a project first.',
      );
    }
    return projectId;
  }
}
