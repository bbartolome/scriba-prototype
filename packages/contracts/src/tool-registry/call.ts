import { z } from 'zod';
import { entityRefSchema, projectPathSchema } from '../project-store/index.js';
import { VALIDATE_MODES } from './constants.js';
import { entityKindSchema, outputKindSchema } from './spec.js';

// The arguments of a call: values the model or the form passes, checked against `inputs` by Ajv.
export const toolArgumentsSchema = z.record(z.string(), z.unknown());
export type ToolArguments = z.infer<typeof toolArgumentsSchema>;

// An entity resolved for a call: its id, its kind, its project path and its content.
export const resolvedEntitySchema = z.object({
  ref: entityRefSchema,
  type: entityKindSchema,
  path: projectPathSchema,
  content: z.string(),
});
export type ResolvedEntity = z.infer<typeof resolvedEntitySchema>;

// An entity-valued argument to resolve: the field it fills, the entity id, and whether the field is a style field.
export const entityToResolveSchema = z.object({
  field: z.string().min(1),
  id: entityRefSchema,
  style: z.boolean(),
});
export type EntityToResolve = z.infer<typeof entityToResolveSchema>;

// The modes of a validate request.
export const validateModeSchema = z.enum(VALIDATE_MODES);
export type ValidateMode = z.infer<typeof validateModeSchema>;

// The validate request: the arguments and the mode, which is required.
export const toolValidateRequestSchema = z.object({
  arguments: toolArgumentsSchema,
  mode: validateModeSchema,
});
export type ToolValidateRequest = z.infer<typeof toolValidateRequestSchema>;

// The validate result: the arguments with defaults applied, and the entity references they name.
export const toolValidateResultSchema = z.object({
  arguments: toolArgumentsSchema,
  entityRefs: entityToResolveSchema.array(),
});
export type ToolValidateResult = z.infer<typeof toolValidateResultSchema>;

// The call request: the arguments and the resolved entities.
export const toolCallRequestSchema = z.object({
  arguments: toolArgumentsSchema,
  entities: resolvedEntitySchema.array(),
});
export type ToolCallRequest = z.infer<typeof toolCallRequestSchema>;

// Render and execute share one request shape, so the render path is the call path (TRG-12 line 20).
export const toolRenderRequestSchema = toolCallRequestSchema;
export type ToolRenderRequest = z.infer<typeof toolRenderRequestSchema>;

// The render result: the prompt the model would receive.
export const toolRenderResultSchema = z.object({
  prompt: z.string(),
});
export type ToolRenderResult = z.infer<typeof toolRenderResultSchema>;

// The output of a tool: its kind and its content.
export const toolOutputSchema = z.object({
  kind: outputKindSchema,
  content: z.string(),
});
export type ToolOutput = z.infer<typeof toolOutputSchema>;

// The call result: the output and the ids of the entities it drew on.
export const toolCallResultSchema = z.object({
  output: toolOutputSchema,
  sourcesUsed: entityRefSchema.array(),
});
export type ToolCallResult = z.infer<typeof toolCallResultSchema>;
