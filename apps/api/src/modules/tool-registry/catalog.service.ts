import { Inject, Injectable } from '@nestjs/common';
import { parse } from 'yaml';
import {
  TOOL_ERROR_CODES,
  TOOL_ERROR_STATUS,
  toolSpecSchema,
  type ToolDetail,
  type ToolOrigin,
  type ToolSpec,
  type ToolValidateRequest,
  type ToolValidateResult,
  type ToolViews,
} from '@bbartolome/scriba-contracts/tool-registry';
import { ModuleError } from '../platform/platform.module';
import { emitViews } from './emit';
import { ToolSpecError } from './inputs';
import {
  compileTool,
  createAjv,
  validateArguments,
  type CompiledTool,
} from './validate';

// The injection token of the tool sources. TRG-06 replaces the provider; the module keeps the token.
export const TOOL_SOURCE = 'TOOL_SOURCE';

// One source of tool specs: the YAML text of a spec and where it comes from.
export interface ToolSourceEntry {
  origin: ToolOrigin;
  source: string;
}

// A tool loaded and computed once: its spec, its source, its three views and its validators.
export interface LoadedTool {
  spec: ToolSpec;
  source: string;
  origin: ToolOrigin;
  views: ToolViews;
  compiled: CompiledTool;
}

// Serves the tools of the sources. Everything is computed at construction, so a read never parses YAML.
@Injectable()
export class CatalogService {
  private readonly tools = new Map<string, LoadedTool>();

  constructor(@Inject(TOOL_SOURCE) sources: ToolSourceEntry[]) {
    const ajv = createAjv();
    for (const { origin, source } of sources) {
      const spec = toolSpecSchema.parse(parse(source));
      if (this.tools.has(spec.name)) {
        throw new ToolSpecError(
          `More than one source defines the tool "${spec.name}".`,
        );
      }
      this.tools.set(spec.name, {
        spec,
        source,
        origin,
        views: emitViews(spec),
        compiled: compileTool(spec, ajv),
      });
    }
  }

  // The loaded tool, or TOOL_NOT_FOUND.
  entry(name: string): LoadedTool {
    const tool = this.tools.get(name);
    if (tool === undefined) {
      throw new ModuleError(
        TOOL_ERROR_CODES.NOT_FOUND,
        TOOL_ERROR_STATUS.TOOL_NOT_FOUND,
        `No tool named "${name}".`,
      );
    }
    return tool;
  }

  // The detail of one tool. Lint is TRG-07's, so it is empty here.
  detail(name: string): ToolDetail {
    const tool = this.entry(name);
    return {
      spec: tool.spec,
      source: tool.source,
      origin: tool.origin,
      lint: [],
      views: tool.views,
    };
  }

  // Checks the arguments of one call against the tool's inputs.
  validate(name: string, request: ToolValidateRequest): ToolValidateResult {
    return validateArguments(this.entry(name), request);
  }
}
