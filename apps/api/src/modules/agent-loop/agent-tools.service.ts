import { Injectable } from '@nestjs/common';
import Ajv from 'ajv';
import {
  AGENT_RESERVED_TOOL_NAMES,
  type AgentToolFamily,
} from '@bbartolome/scriba-contracts/agent-loop';
import {
  EntitiesService,
  FilesService,
  SearchService,
} from '../project-store/project-store.module';
import {
  CatalogService,
  ExecutorService,
} from '../tool-registry/tool-registry.module';
import { builtinTools } from './tools/builtin-tools';
import {
  narrativeDefinition,
  readProjectNarrativeSettings,
} from './tools/narrative-tools';
import { ToolRun } from './tools/tool-run';
import type { CompiledTool } from './tools/tool-types';

export interface StartRunOptions {
  runId: string;
  projectId: string;
  enabledFamilies: AgentToolFamily[];
}

// The tool dispatcher of the agent loop. It compiles each built-in tool's argument schema once, and starts one
// ToolRun per agent run. A run with the narrative family also offers the enabled registry tools (AGL-09).
@Injectable()
export class AgentToolsService {
  private readonly tools: CompiledTool[];

  constructor(
    private readonly files: FilesService,
    search: SearchService,
    private readonly catalog: CatalogService,
    private readonly executor: ExecutorService,
    private readonly entities: EntitiesService,
  ) {
    // No coercion and no defaults: a string "yes" for a boolean is refused, and nothing is filled in (S1, D14).
    const ajv = new Ajv({ allErrors: true, strict: true });
    this.tools = builtinTools(files, search).map((definition) => ({
      definition,
      validate: ajv.compile(definition.schema),
    }));
  }

  // The state of one agent run. The loop calls this once per run (S14).
  startRun(options: StartRunOptions): ToolRun {
    if (!options.enabledFamilies.includes('narrative')) {
      return new ToolRun({ ...options, tools: this.tools });
    }
    const settings = readProjectNarrativeSettings(
      this.files,
      options.projectId,
    );
    const reserved = new Set<string>(AGENT_RESERVED_TOOL_NAMES);
    const rejectedNames: string[] = [];
    const narrative: CompiledTool[] = [];
    const { functions } = this.catalog.functions(settings.genrePack);
    for (const fn of functions) {
      const name = fn.function.name;
      if (reserved.has(name)) {
        rejectedNames.push(name);
        continue;
      }
      const fields = this.catalog.entry(name).views.form.fields;
      narrative.push({
        definition: narrativeDefinition(
          { executor: this.executor, entities: this.entities },
          fn,
          fields,
          settings.styleProfile,
        ),
      });
    }
    return new ToolRun({
      ...options,
      tools: [...this.tools, ...narrative],
      rejectedNames,
    });
  }
}
