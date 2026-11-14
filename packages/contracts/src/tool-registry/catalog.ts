import { z } from 'zod';
import { BUILTIN_ORIGINS, TOOL_ORIGINS } from './constants.js';
import { toolErrorCodeSchema } from './errors.js';
import { lintCountsSchema, lintResultSchema } from './lint.js';
import { entityTypeSchema, outputKindSchema, toolSpecSchema } from './spec.js';
import { modelFunctionSchema, toolViewsSchema } from './views.js';

// The origin of a tool: a built-in pack or the user pack.
export const toolOriginSchema = z.enum(TOOL_ORIGINS);
export type ToolOrigin = z.infer<typeof toolOriginSchema>;

// The origin of a built-in tool, which a user copy can override.
export const builtinOriginSchema = z.enum(BUILTIN_ORIGINS);
export type BuiltinOrigin = z.infer<typeof builtinOriginSchema>;

// The error of a summary: a code and a message.
export const toolErrorInfoSchema = z.object({
  code: toolErrorCodeSchema,
  message: z.string(),
});
export type ToolErrorInfo = z.infer<typeof toolErrorInfoSchema>;

// One row of the tool list. For a file that cannot be parsed or is refused, `output` is null, `description`
// is '', `enabled` is false and `error` is set; `valid` is the validity. Two rows can share a name (a user
// copy and its built-in), so the key is the pair of name and origin.
export const toolSummarySchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  output: outputKindSchema.nullable(),
  enabled: z.boolean(),
  origin: toolOriginSchema,
  overrides: builtinOriginSchema.optional(),
  valid: z.boolean(),
  lintCounts: lintCountsSchema,
  error: toolErrorInfoSchema.optional(),
});
export type ToolSummary = z.infer<typeof toolSummarySchema>;

// The query of the tool list: an optional genre pack.
export const toolListQuerySchema = z.object({
  genrePack: z.string().min(1).optional(),
});
export type ToolListQuery = z.infer<typeof toolListQuerySchema>;

// The tool list.
export const toolListSchema = z.object({
  tools: toolSummarySchema.array(),
});
export type ToolList = z.infer<typeof toolListSchema>;

// The detail of one tool. `spec` and `views` are null for an invalid tool; `source` and `lint` are always present.
export const toolDetailSchema = z.object({
  spec: toolSpecSchema.nullable(),
  source: z.string(),
  origin: toolOriginSchema,
  lint: lintResultSchema,
  views: toolViewsSchema.nullable(),
});
export type ToolDetail = z.infer<typeof toolDetailSchema>;

// The model function schemas of the enabled, valid tools.
export const functionListSchema = z.object({
  functions: modelFunctionSchema.array(),
});
export type FunctionList = z.infer<typeof functionListSchema>;

// The entity types of both packs and the user pack.
export const entityTypeListSchema = z.object({
  entityTypes: entityTypeSchema.array(),
});
export type EntityTypeList = z.infer<typeof entityTypeListSchema>;

// The save request: the YAML source of the tool.
export const toolSaveRequestSchema = z.object({
  source: z.string(),
});
export type ToolSaveRequest = z.infer<typeof toolSaveRequestSchema>;

// The enabled request: the author's switch.
export const toolEnabledRequestSchema = z.object({
  enabled: z.boolean(),
});
export type ToolEnabledRequest = z.infer<typeof toolEnabledRequestSchema>;
