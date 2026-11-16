import { Injectable } from '@nestjs/common';
import {
  TOOL_ERROR_CODES,
  TOOL_ERROR_STATUS,
  type OutputKind,
  type ResolvedEntity,
  type ToolCallRequest,
  type ToolCallResult,
  type ToolRenderRequest,
  type ToolRenderResult,
} from '@bbartolome/scriba-contracts/tool-registry';
import { ModuleError } from '../platform/platform.module';
import { ProjectStoreService } from '../project-store/project-store.module';
import {
  ModelResolver,
  streamChat,
  type ChatMessage,
  type ResolvedModel,
} from '../providers/providers.module';
import { CatalogService } from './catalog.service';
import type { LoadedTool } from './packs';
import {
  parseTemplate,
  renderTemplate,
  TemplateRenderError,
  type ToolCatalogEntry,
} from './template';

// The one system message of each output kind. It fixes the return format; the rendered prompt is the user message.
export const OUTPUT_SYSTEM_MESSAGES: Record<OutputKind, string> = {
  draft:
    'Write the answer as Markdown prose. Return only the text of the answer, with no preface and no closing remarks.',
  entity:
    'Return one Markdown file: YAML front matter between two lines of ---, then the Markdown body. Return nothing outside the file.',
  claims:
    'Return one claim per line. No numbering, no bullets, no blank lines and no other text.',
  graph: 'Return only a JSON document, with no prose before or after it.',
  check:
    'Return only the findings, one per line, each naming the problem and where it occurs. If there are none, return the single line: No findings.',
};

// A style field has no kind of its own in the spec. Its kind is the style-profile kind (TRG-12 design choice C5).
const STYLE_PROFILE_KIND = 'style-profile';

// The fenced JSON that a graph reply may wrap its document in.
const GRAPH_FENCE = /^```[^\n]*\n([\s\S]*)\n```$/;

interface Prepared {
  tool: LoadedTool;
  prompt: string;
  // The entity IDs of the entity-typed fields, de-duplicated, in property order. Style references are not here.
  sources: string[];
}

// Runs one tool: renders its prompt, and calls the model with it for the calls of execute. Renders and calls share
// the same steps (TRG-12 decisions). The executor never writes files.
@Injectable()
export class ExecutorService {
  constructor(
    private readonly catalog: CatalogService,
    private readonly store: ProjectStoreService,
    private readonly resolver: ModelResolver,
  ) {}

  // The prompt a call would send, with no model call.
  render(name: string, request: ToolRenderRequest): ToolRenderResult {
    return { prompt: this.prepare(name, request).prompt };
  }

  // Renders the prompt, calls the model of the active project, and returns the output and its sources. A signal that
  // aborts stops the model request.
  async execute(
    name: string,
    request: ToolCallRequest,
    signal?: AbortSignal,
  ): Promise<ToolCallResult> {
    const { tool, prompt, sources } = this.prepare(name, request);
    const kind = tool.spec.output;
    let target: ResolvedModel;
    try {
      target = await this.resolver.resolve({
        projectId: this.store.activeId() ?? undefined,
      });
    } catch (error) {
      modelFailure(error);
    }
    const messages: ChatMessage[] = [
      { role: 'system', content: OUTPUT_SYSTEM_MESSAGES[kind] },
      { role: 'user', content: prompt },
    ];
    let text = '';
    try {
      for await (const event of streamChat(target, { messages, signal })) {
        if (event.type === 'text-delta') text += event.text;
      }
    } catch (error) {
      modelFailure(error);
    }
    return {
      output: { kind, content: finish(kind, text) },
      sourcesUsed: sources,
    };
  }

  // Steps 1 to 4 of a call, then the render. Every refusal here is thrown before the model is called.
  private prepare(name: string, request: ToolRenderRequest): Prepared {
    // 1. The tool exists, is valid and is enabled.
    const tool = this.catalog.entry(name);
    if (!this.catalog.enabledOf(tool)) {
      throw new ModuleError(
        TOOL_ERROR_CODES.DISABLED,
        TOOL_ERROR_STATUS.TOOL_DISABLED,
        `The tool "${name}" is disabled.`,
      );
    }

    // 2. The arguments pass Ajv in full mode, and every entity ID is well formed.
    const checked = this.catalog.validate(name, {
      arguments: request.arguments,
      mode: 'full',
    });

    // 3. Every entity the arguments name is resolved in the request, and has a kind the field takes. The first entry
    // of each ref is the one kept, so the kind check and the render see the same entity (design choice C10).
    const entities = firstOfEachRef(request.entities);
    for (const ref of checked.entityRefs) {
      const entity = entities.find((candidate) => candidate.ref === ref.id);
      if (entity === undefined) {
        throw new ModuleError(
          TOOL_ERROR_CODES.ENTITY_UNRESOLVED,
          TOOL_ERROR_STATUS.TOOL_ENTITY_UNRESOLVED,
          `Entity "${ref.id}" for "${ref.field}" is not among the resolved entities of the request.`,
        );
      }
      const kinds = ref.style
        ? [STYLE_PROFILE_KIND]
        : tool.compiled.fields.find((field) => field.key === ref.field)?.hints[
            'x-scriba-entity-kinds'
          ];
      if (kinds !== undefined && !kinds.includes(entity.type)) {
        const takes = kinds.map((kind) => `"${kind}"`).join(', ');
        throw new ModuleError(
          TOOL_ERROR_CODES.ENTITY_KIND_MISMATCH,
          TOOL_ERROR_STATUS.TOOL_ENTITY_KIND_MISMATCH,
          `Entity "${ref.id}" for "${ref.field}" is of kind "${entity.type}", but the field takes ${takes}.`,
        );
      }
    }
    const sources = unique(
      checked.entityRefs.filter((ref) => !ref.style).map((ref) => ref.id),
    );

    // 4. The template parses, and renders with the arguments, the entities and the tool catalogue.
    const parsed = parseTemplate(tool.spec.prompt);
    if (!parsed.ok) {
      throw invalidTool(
        name,
        parsed.diagnostics[0]?.message ?? 'the template does not parse',
      );
    }
    const toolCatalog: ToolCatalogEntry[] = this.catalog
      .list()
      .tools.filter((row) => row.valid && row.enabled)
      .map((row) => ({
        name: row.name,
        description: row.description,
        ports: this.catalog.ports(row.name),
      }));
    let prompt: string;
    try {
      prompt = renderTemplate(parsed.ast, {
        args: checked.arguments,
        entities,
        toolCatalog,
      });
    } catch (error) {
      if (error instanceof TemplateRenderError) {
        throw invalidTool(name, error.message);
      }
      throw error;
    }
    return { tool, prompt, sources };
  }
}

// A TOOL_INVALID error for a tool whose prompt cannot be rendered. A tool that passes lint cannot reach it.
function invalidTool(name: string, reason: string): ModuleError {
  return new ModuleError(
    TOOL_ERROR_CODES.INVALID,
    TOOL_ERROR_STATUS.TOOL_INVALID,
    `The prompt of the tool "${name}" cannot be rendered: ${reason}.`,
  );
}

// Maps a resolver or provider error to TOOL_MODEL_ERROR and keeps its message. Any other error is rethrown.
function modelFailure(error: unknown): never {
  if (error instanceof ModuleError && error.code.startsWith('PROVIDER_')) {
    throw new ModuleError(
      TOOL_ERROR_CODES.MODEL_ERROR,
      TOOL_ERROR_STATUS.TOOL_MODEL_ERROR,
      error.message,
    );
  }
  throw error;
}

// The model's final text, trimmed. A graph reply wrapped in one enclosing code fence is unwrapped. Not parsed further.
function finish(kind: OutputKind, text: string): string {
  const trimmed = text.trim();
  if (kind === 'graph') {
    const fenced = GRAPH_FENCE.exec(trimmed);
    if (fenced !== null) return (fenced[1] ?? '').trim();
  }
  return trimmed;
}

// The entries of a list with only the first entry of each ref kept.
function firstOfEachRef(entities: ResolvedEntity[]): ResolvedEntity[] {
  const seen = new Set<string>();
  return entities.filter((entity) => {
    if (seen.has(entity.ref)) return false;
    seen.add(entity.ref);
    return true;
  });
}

// The values of a list with each value once, the first occurrence kept.
function unique(values: string[]): string[] {
  return [...new Set(values)];
}
