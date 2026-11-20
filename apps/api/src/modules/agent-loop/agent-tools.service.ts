import { Inject, Injectable, Optional } from '@nestjs/common';
import Ajv, { type ValidateFunction } from 'ajv';
import {
  AGENT_RESERVED_TOOL_NAMES,
  type AgentToolFamily,
} from '@bbartolome/scriba-contracts/agent-loop';
import {
  EntitiesService,
  FilesService,
  ProjectsService,
  ProjectStoreService,
  SearchService,
} from '../project-store/project-store.module';
import {
  CatalogService,
  ExecutorService,
} from '../tool-registry/tool-registry.module';
import { builtinTools } from './tools/builtin-tools';
import {
  DEFAULT_FETCH_POLICY,
  FETCH_POLICY,
  type FetchPolicy,
} from './tools/fetch-page';
import {
  narrativeDefinition,
  readProjectNarrativeSettings,
} from './tools/narrative-tools';
import { ToolRun } from './tools/tool-run';
import { WEB_SEARCH_SCHEMA, webSearchDefinition } from './tools/web-search';
import type { CompiledTool } from './tools/tool-types';

export interface StartRunOptions {
  runId: string;
  projectId: string;
  enabledFamilies: AgentToolFamily[];
  // The author's search endpoint, from the research settings of the run (AGL-21).
  searchEndpoint?: string;
}

// The tool dispatcher of the agent loop. It compiles each built-in tool's argument schema once, and starts one
// ToolRun per agent run. A run with the narrative family also offers the enabled registry tools (AGL-09).
@Injectable()
export class AgentToolsService {
  private readonly tools: CompiledTool[];
  private readonly webSearchValidate: ValidateFunction;

  constructor(
    private readonly files: FilesService,
    search: SearchService,
    private readonly catalog: CatalogService,
    private readonly executor: ExecutorService,
    private readonly entities: EntitiesService,
    private readonly store: ProjectStoreService,
    private readonly projects: ProjectsService,
    // The fetch limits and the test allowance (AGL-22, plan P17). The composed app binds none, so production uses the
    // default policy, which has no allowance.
    @Optional() @Inject(FETCH_POLICY) fetchPolicy?: FetchPolicy,
  ) {
    // No coercion and no defaults: a string "yes" for a boolean is refused, and nothing is filled in (S1, D14).
    const ajv = new Ajv({ allErrors: true, strict: true });
    this.tools = builtinTools(
      files,
      search,
      store,
      projects,
      fetchPolicy ?? DEFAULT_FETCH_POLICY,
    ).map((definition) => ({
      definition,
      validate: ajv.compile(definition.schema),
    }));
    this.webSearchValidate = ajv.compile(WEB_SEARCH_SCHEMA);
  }

  // The state of one agent run. The loop calls this once per run (S14).
  startRun(options: StartRunOptions): ToolRun {
    const rejectedNames: string[] = [];
    const extra: CompiledTool[] = [];
    if (options.enabledFamilies.includes('narrative')) {
      const settings = readProjectNarrativeSettings(
        this.files,
        options.projectId,
      );
      const reserved = new Set<string>(AGENT_RESERVED_TOOL_NAMES);
      const { functions } = this.catalog.functions(settings.genrePack);
      for (const fn of functions) {
        const name = fn.function.name;
        if (reserved.has(name)) {
          rejectedNames.push(name);
          continue;
        }
        const fields = this.catalog.entry(name).views.form.fields;
        extra.push({
          definition: narrativeDefinition(
            {
              executor: this.executor,
              entities: this.entities,
              files: this.files,
              store: this.store,
              projects: this.projects,
            },
            fn,
            fields,
            settings.styleProfile,
            this.catalog.entry(name).spec.output,
          ),
        });
      }
    }
    // web_search is offered only when the research family is on and the author has set an endpoint (AGL-21).
    if (
      options.enabledFamilies.includes('research') &&
      options.searchEndpoint !== undefined
    ) {
      extra.push({
        definition: webSearchDefinition(options.searchEndpoint),
        validate: this.webSearchValidate,
      });
    }
    return new ToolRun({
      ...options,
      tools: [...this.tools, ...extra],
      rejectedNames,
    });
  }
}
