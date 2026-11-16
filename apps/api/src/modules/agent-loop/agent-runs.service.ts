import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  AGENT_ERROR_CODES,
  AGENT_ERROR_STATUS,
  type AgentErrorCode,
  type AgentRunState,
  type AgentStartRequest,
  type AgentStartResponse,
  type AgentToolFamily,
} from '@bbartolome/scriba-contracts/agent-loop';
import type { ProjectSwitchedData } from '@bbartolome/scriba-contracts/project-store';
import { EventsPublisher, ModuleError } from '../platform/platform.module';
import {
  FilesService,
  ProjectStoreService,
  ProjectsService,
} from '../project-store/project-store.module';
import { ModelResolver } from '../providers/providers.module';
import { buildProjectSummary } from './agent-prompt';
import { AgentRun } from './agent-run';
import { AgentSettingsService } from './agent-settings.service';
import { AgentToolsService } from './agent-tools.service';
import { AgentTranscriptsService } from './transcript-reader';
import { runStateOfTranscript } from './transcript-run-state';
import { TranscriptWriter, transcriptPathOf } from './transcript-writer';

// The runs of one project: the active one, and the most recent one that ended (D2).
interface ProjectSlots {
  active?: AgentRun;
  ended?: AgentRun;
}

function refusal(code: AgentErrorCode, message: string): ModuleError {
  return new ModuleError(code, AGENT_ERROR_STATUS[code], message);
}

// The agent-run registry: start, stop, the one active run per project, and the project-switch stop (D1 to D5).
@Injectable()
export class AgentRunsService {
  private readonly slots = new Map<string, ProjectSlots>();

  constructor(
    private readonly store: ProjectStoreService,
    private readonly projects: ProjectsService,
    private readonly files: FilesService,
    private readonly resolver: ModelResolver,
    private readonly settings: AgentSettingsService,
    private readonly tools: AgentToolsService,
    private readonly events: EventsPublisher,
    private readonly transcripts: AgentTranscriptsService,
  ) {
    // Registered once. The handler never throws: a throw would fail the switch (PST-04 D8 and D9).
    this.store.onProjectSwitched((event) => this.onProjectSwitched(event));
  }

  // Checks the start in the order of D1, registers the run, publishes run-started, and answers. The model work starts
  // after the answer. Nothing is awaited before the registration, so two starts cannot both pass the active check.
  start(body: AgentStartRequest): AgentStartResponse {
    const projectId = this.store.activeId();
    if (projectId === null) {
      throw refusal(
        AGENT_ERROR_CODES.NO_ACTIVE_PROJECT,
        'No project is active. Activate a project first.',
      );
    }
    if (this.slotOf(projectId).active !== undefined) {
      throw refusal(
        AGENT_ERROR_CODES.RUN_ACTIVE,
        'An agent run is already active in this project.',
      );
    }
    const settings = this.settings.current();
    if (!this.resolver.hasChoice({ projectId })) {
      throw refusal(
        AGENT_ERROR_CODES.NO_PROVIDER,
        'No model provider is set up. Add a provider and choose an app default first.',
      );
    }

    const runId = randomUUID();
    const conversationId = body.conversationId ?? randomUUID();
    const startedAt = new Date();
    const enabledFamilies: AgentToolFamily[] = settings.research.enabled
      ? ['project', 'narrative', 'research']
      : ['project', 'narrative'];
    const transcript = new TranscriptWriter({
      files: this.files,
      projectId,
      path: transcriptPathOf(startedAt, runId),
      runId,
      conversationId,
      libraryRoot: this.store.libraryRoot,
    });
    const run = new AgentRun(
      {
        runId,
        conversationId,
        projectId,
        intent: body.intent,
        cap: settings.stepCap,
        enabledFamilies,
        tools: this.tools.startRun({ runId, projectId, enabledFamilies }),
        transcript,
      },
      {
        resolver: this.resolver,
        events: this.events,
        summarize: (id) => buildProjectSummary(this.projects, this.files, id),
        released: (ended) => this.release(ended),
        transcripts: this.transcripts,
      },
    );
    this.slotOf(projectId).active = run;
    run.begin();
    void run.execute();
    return { runId, conversationId };
  }

  // The state of the active project's run (AGL-05). The active run, else the project's most recent ended run, is served
  // from memory as the run's own state (D1, D9). Else the latest transcript run of the project is rebuilt from its file
  // (D1, D4). Else there is no run (D3). Nothing is written and no slot changes (D2, D10). A project with no active
  // project is refused before any read (D8).
  current(): AgentRunState | null {
    const projectId = this.store.activeId();
    if (projectId === null) {
      throw refusal(
        AGENT_ERROR_CODES.NO_ACTIVE_PROJECT,
        'No project is active. Activate a project first.',
      );
    }
    const slot = this.slots.get(projectId);
    const run = slot?.active ?? slot?.ended;
    if (run !== undefined) return run.state;
    const runs = this.transcripts.runs(projectId);
    const latest = runs[runs.length - 1];
    return latest === undefined ? null : runStateOfTranscript(latest);
  }

  // Asks the run to stop. A run that is not in any slot is not found; a run that has ended or is already ending is a
  // no-op, so a second stop is answered the same way (D4).
  stop(runId: string): void {
    const run = this.find(runId);
    if (run === undefined) {
      throw refusal(
        AGENT_ERROR_CODES.RUN_NOT_FOUND,
        'No agent run has that id.',
      );
    }
    run.requestEnd('stopped');
  }

  // The run with this id: the active run or the most recent ended run of any project. A run in neither slot is unknown.
  private find(runId: string): AgentRun | undefined {
    for (const slot of this.slots.values()) {
      if (slot.active?.runId === runId) return slot.active;
      if (slot.ended?.runId === runId) return slot.ended;
    }
    return undefined;
  }

  // A switch stops the run of the project being left (D5). Only the active run of `from` is asked to end.
  private onProjectSwitched(event: ProjectSwitchedData): void {
    try {
      if (event.from === null) return;
      this.slots.get(event.from)?.active?.requestEnd('project-switched');
    } catch {
      // Nothing here may throw: a throw would fail the switch.
    }
  }

  // Called by the run as it ends, before its run-ended is published: the slot is freed and the run is kept as the
  // project's most recent ended run.
  private release(run: AgentRun): void {
    const slot = this.slotOf(run.projectId);
    if (slot.active === run) slot.active = undefined;
    slot.ended = run;
  }

  private slotOf(projectId: string): ProjectSlots {
    let slot = this.slots.get(projectId);
    if (slot === undefined) {
      slot = {};
      this.slots.set(projectId, slot);
    }
    return slot;
  }
}
