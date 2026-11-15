import type { AgentToolFamily } from '@bbartolome/scriba-contracts/agent-loop';
import { ModuleError } from '../../platform/platform.module';
import {
  expectedSummary,
  issuesFromAjv,
  readableMessage,
} from './readable-error';
import {
  ToolArgumentError,
  type CompiledTool,
  type DispatchResult,
  type ToolCallInput,
  type ToolFunctionSchema,
  type ToolIssue,
} from './tool-types';

// The answers of the dispatcher. A call that is not offered is answered once and never counted (S8).
const NOT_OFFERED = 'This tool is not available in this agent run.';
const WITHDRAWN = 'This tool is unavailable for the rest of this agent run.';
const FAILED = 'The tool failed. Try again or use another tool.';

// The third consecutive invalid call withdraws the tool for the rest of the run (D4, S6).
const WITHDRAW_AT = 3;

export interface ToolRunOptions {
  runId: string;
  projectId: string;
  enabledFamilies: AgentToolFamily[];
  tools: CompiledTool[];
}

// The arguments as the loop receives them. An empty or whitespace-only string is an empty object (S4).
function parseArguments(raw: string): { parsed: boolean; value: unknown } {
  if (raw.trim() === '') return { parsed: true, value: {} };
  try {
    return { parsed: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { parsed: false, value: raw };
  }
}

// The issues of one call's arguments. An empty list means the arguments passed the schema.
function argumentIssues(
  tool: CompiledTool,
  parsed: { parsed: boolean; value: unknown },
): ToolIssue[] {
  if (!parsed.parsed) return [{ path: '', message: 'is not valid JSON' }];
  if (tool.validate(parsed.value)) return [];
  return issuesFromAjv(tool.validate.errors);
}

// The per-run state of the tool dispatcher: the counts of consecutive invalid calls, the withdrawn names, the project
// and the families of one agent run (S14). It holds no Nest code.
export class ToolRun {
  readonly runId: string;
  readonly projectId: string;
  private readonly offered = new Map<string, CompiledTool>();
  private readonly invalidCounts = new Map<string, number>();
  private readonly withdrawn = new Set<string>();

  constructor(options: ToolRunOptions) {
    this.runId = options.runId;
    this.projectId = options.projectId;
    const families = new Set<AgentToolFamily>(options.enabledFamilies);
    for (const tool of options.tools) {
      if (families.has(tool.definition.family)) {
        this.offered.set(tool.definition.name, tool);
      }
    }
  }

  // The family of an offered tool, or undefined for a name that is not offered in this run.
  familyOf(name: string): AgentToolFamily | undefined {
    return this.offered.get(name)?.definition.family;
  }

  // The function schemas the model is offered: the enabled tools that are not withdrawn (S13).
  schemas(): ToolFunctionSchema[] {
    return [...this.offered.values()]
      .filter((tool) => !this.withdrawn.has(tool.definition.name))
      .map((tool) => ({
        type: 'function',
        function: {
          name: tool.definition.name,
          description: tool.definition.description,
          parameters: tool.definition.schema,
        },
      }));
  }

  // Runs one call, one at a time (D8). The answer is the outcome the loop sends to the model and the card (S9).
  async dispatch(
    call: ToolCallInput,
    signal?: AbortSignal,
  ): Promise<DispatchResult> {
    const parsed = parseArguments(call.arguments);
    const tool = this.offered.get(call.name);
    if (tool === undefined) {
      return {
        arguments: parsed.value,
        valid: false,
        outcome: { kind: 'error', message: NOT_OFFERED, attempt: 1 },
      };
    }
    const name = tool.definition.name;
    const issues = argumentIssues(tool, parsed);

    if (this.withdrawn.has(name)) {
      return {
        arguments: parsed.value,
        valid: issues.length === 0,
        outcome: {
          kind: 'error',
          message: WITHDRAWN,
          attempt: WITHDRAW_AT,
          withdrawn: true,
        },
      };
    }
    if (issues.length > 0) {
      return this.invalid(tool, parsed.value, issues);
    }

    try {
      const result = await tool.definition.handler(
        { run: this, callId: call.callId, signal },
        parsed.value,
      );
      this.invalidCounts.set(name, 0);
      return {
        arguments: parsed.value,
        valid: true,
        outcome: {
          kind: 'result',
          summary: result.summary,
          output: result.output,
          modelText: result.modelText ?? JSON.stringify(result.output),
        },
      };
    } catch (error) {
      // A refusal from the Project store is one issue at path `path`. Both built-in tools have one argument, `path`
      // (S18). A handler's own refusal carries its issues (S17).
      if (error instanceof ModuleError) {
        return this.invalid(tool, parsed.value, [
          { path: '/path', message: error.message },
        ]);
      }
      if (error instanceof ToolArgumentError) {
        return this.invalid(tool, parsed.value, error.issues);
      }
      // Any other failure is not an invalid call: it neither counts nor resets (O4).
      const count = this.invalidCounts.get(name) ?? 0;
      return {
        arguments: parsed.value,
        valid: true,
        outcome: {
          kind: 'error',
          message: FAILED,
          attempt: Math.max(1, count),
        },
      };
    }
  }

  // Counts one invalid call and answers it. The third consecutive one withdraws the tool (S6).
  private invalid(
    tool: CompiledTool,
    value: unknown,
    issues: ToolIssue[],
  ): DispatchResult {
    const name = tool.definition.name;
    const count = (this.invalidCounts.get(name) ?? 0) + 1;
    this.invalidCounts.set(name, count);
    const summary = expectedSummary(name, tool.definition.schema);
    if (count < WITHDRAW_AT) {
      return {
        arguments: value,
        valid: false,
        outcome: {
          kind: 'error',
          message: readableMessage(issues, summary),
          attempt: count,
        },
      };
    }
    this.withdrawn.add(name);
    return {
      arguments: value,
      valid: false,
      outcome: {
        kind: 'error',
        message: readableMessage(issues, summary, WITHDRAWN),
        attempt: WITHDRAW_AT,
        withdrawn: true,
      },
    };
  }
}
