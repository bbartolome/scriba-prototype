import { Injectable } from '@nestjs/common';
import Ajv from 'ajv';
import type { AgentToolFamily } from '@bbartolome/scriba-contracts/agent-loop';
import { FilesService } from '../project-store/project-store.module';
import { builtinTools } from './tools/builtin-tools';
import { ToolRun } from './tools/tool-run';
import type { CompiledTool } from './tools/tool-types';

export interface StartRunOptions {
  runId: string;
  projectId: string;
  enabledFamilies: AgentToolFamily[];
}

// The tool dispatcher of the agent loop. It compiles each built-in tool's argument schema once, and starts one
// ToolRun per agent run.
@Injectable()
export class AgentToolsService {
  private readonly tools: CompiledTool[];

  constructor(files: FilesService) {
    // No coercion and no defaults: a string "yes" for a boolean is refused, and nothing is filled in (S1, D14).
    const ajv = new Ajv({ allErrors: true, strict: true });
    this.tools = builtinTools(files).map((definition) => ({
      definition,
      validate: ajv.compile(definition.schema),
    }));
  }

  // The state of one agent run. The loop calls this once per run (S14).
  startRun(options: StartRunOptions): ToolRun {
    return new ToolRun({ ...options, tools: this.tools });
  }
}
