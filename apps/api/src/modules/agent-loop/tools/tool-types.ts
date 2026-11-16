import type { ValidateFunction } from 'ajv';
import type {
  AgentReservedToolName,
  AgentToolFamily,
} from '@bbartolome/scriba-contracts/agent-loop';
import type { ToolRun } from './tool-run';

// One problem with the arguments of a call. path is a JSON Pointer into the arguments, and '' is the whole set (D13).
// It has the shape of the registry's issues, so built-in and registry errors share one renderer.
export interface ToolIssue {
  path: string;
  message: string;
}

// Thrown by a handler when an argument value is refused, for example an unknown entity id or a text that does not
// match. The loop counts it as an invalid call (S7 (d)).
export class ToolArgumentError extends Error {
  readonly issues: ToolIssue[];

  constructor(issues: ToolIssue[]) {
    super('The tool arguments are not valid.');
    this.name = 'ToolArgumentError';
    this.issues = issues;
  }
}

export interface ToolSchemaProperty {
  type: 'string' | 'boolean' | 'number' | 'integer' | 'array';
  description: string;
  // For an array property: the type of each item, and the values an item may take.
  items?: { type: 'string'; enum: readonly string[] };
  minimum?: number;
  minLength?: number;
}

// The JSON Schema of a tool's arguments. Extra keys are refused (S1).
export type ToolArgumentSchema = {
  type: 'object';
  properties: Record<string, ToolSchemaProperty>;
  required: string[];
  additionalProperties: false;
};

export interface ToolContext {
  run: ToolRun;
  callId: string;
  signal?: AbortSignal;
}

// The entities a narrative call drew on: the IDs it passed, and the sources the executor reports (TRG-12 C6).
export interface CallCitations {
  entityIds: string[];
  sourcesUsed: string[];
}

export interface ToolHandlerResult {
  summary: string;
  output: unknown;
  // The text the model receives. When it is left out, the model text is JSON.stringify(output) (S10).
  modelText?: string;
  citations?: CallCitations;
  // The text a routed output proposes, and its path. The run puts it in the overlay (AGL-13 P3).
  written?: WrittenText;
}

// A routed output: the path it is aimed at and the text it proposes.
export interface WrittenText {
  path: string;
  content: string;
}

export interface ToolDefinition {
  name: AgentReservedToolName;
  family: AgentToolFamily;
  description: string;
  schema: ToolArgumentSchema;
  // The arguments are the parsed value, and they have passed the schema when the handler runs.
  handler: (ctx: ToolContext, args: unknown) => Promise<ToolHandlerResult>;
}

// A registry tool offered to a narrative run (AGL-09). Its name is a plain string, because registry names are not
// reserved names. Its arguments are checked by the executor, so it has no validator here.
export interface NarrativeToolDefinition {
  name: string;
  family: 'narrative';
  description: string;
  schema: ToolArgumentSchema;
  handler: (ctx: ToolContext, args: unknown) => Promise<ToolHandlerResult>;
}

// A definition with its argument validator, compiled once by the service. A narrative definition has none.
export interface CompiledTool {
  definition: ToolDefinition | NarrativeToolDefinition;
  validate?: ValidateFunction;
}

// One call as the loop passes it: the arguments are the raw string the provider sent (S15).
export interface ToolCallInput {
  callId: string;
  name: string;
  arguments: string;
}

export type ToolOutcome =
  | {
      kind: 'result';
      summary: string;
      output: unknown;
      modelText: string;
      citations?: CallCitations;
      written?: WrittenText;
    }
  | { kind: 'error'; message: string; attempt: number; withdrawn?: boolean };

// The answer of one dispatch (S9). arguments is the parsed value when the JSON parsed, and the raw string otherwise.
export interface DispatchResult {
  arguments: unknown;
  valid: boolean;
  outcome: ToolOutcome;
}

// The function schema the model is offered (S13). It has the shape of ToolSchema in providers/client/types.ts, which
// is not imported, because agent-loop imports other modules only through their entry files (D10).
export interface ToolFunctionSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: ToolArgumentSchema;
  };
}
