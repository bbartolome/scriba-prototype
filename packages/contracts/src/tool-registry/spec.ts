import { z } from 'zod';
import {
  CONTROL_TYPES,
  ENTITY_FOLDERS,
  ENTITY_KIND_PATTERN,
  HINT_KEYS,
  OUTPUT_KINDS,
  PORT_TYPES,
  TOOL_DESCRIPTION_MAX_LENGTH,
  TOOL_NAME_PATTERN,
} from './constants.js';

// The output kinds of a tool: exactly five.
export const outputKindSchema = z.enum(OUTPUT_KINDS);
export type OutputKind = z.infer<typeof outputKindSchema>;

// The element types of a port: exactly three.
export const portTypeSchema = z.enum(PORT_TYPES);
export type PortType = z.infer<typeof portTypeSchema>;

// The form controls: exactly eight.
export const controlTypeSchema = z.enum(CONTROL_TYPES);
export type ControlType = z.infer<typeof controlTypeSchema>;

// The four hint keys.
export const hintKeySchema = z.enum(HINT_KEYS);
export type HintKey = z.infer<typeof hintKeySchema>;

// The x-scriba-* hints of an inputs property, each optional. Strict: an unknown hint is refused.
export const toolHintsSchema = z.strictObject({
  'x-scriba-type': portTypeSchema.optional(),
  'x-scriba-port': z.boolean().optional(),
  'x-scriba-entity-kinds': z.array(z.string().min(1)).optional(),
  'x-scriba-control': controlTypeSchema.optional(),
});
export type ToolHints = z.infer<typeof toolHintsSchema>;

// A tool name: lower snake case, 1 to 64 characters, starting with a letter.
export const toolNameSchema = z.string().regex(TOOL_NAME_PATTERN);
export type ToolName = z.infer<typeof toolNameSchema>;

// A tool description: one line, not empty, at most 200 characters.
export const toolDescriptionSchema = z
  .string()
  .min(1)
  .max(TOOL_DESCRIPTION_MAX_LENGTH)
  .regex(/^[^\r\n]*$/);

// A JSON Schema object, typed loosely: lint checks the structure of inputs, and this schema refuses only a non-object.
export const jsonSchemaObjectSchema = z.record(z.string(), z.unknown());
export type JsonSchemaObject = z.infer<typeof jsonSchemaObjectSchema>;

// The tool-spec envelope. Strict: a stray top-level key is refused. schemaVersion is an integer of at least 1, and the loader compares it with the supported version.
export const toolSpecSchema = z.strictObject({
  schemaVersion: z.number().int().min(1),
  name: toolNameSchema,
  description: toolDescriptionSchema,
  inputs: jsonSchemaObjectSchema,
  output: outputKindSchema,
  enabled: z.boolean(),
  prompt: z.string(),
});
export type ToolSpec = z.infer<typeof toolSpecSchema>;

// An entity kind: lower kebab-case.
export const entityKindSchema = z.string().regex(ENTITY_KIND_PATTERN);
export type EntityKind = z.infer<typeof entityKindSchema>;

// The folder an entity type stores its entities in.
export const entityFolderSchema = z.enum(ENTITY_FOLDERS);
export type EntityFolder = z.infer<typeof entityFolderSchema>;

// The entity-type envelope. Strict like the tool spec; `fields` is loose, because each kind has its own.
export const entityTypeSchema = z.strictObject({
  schemaVersion: z.number().int().min(1),
  kind: entityKindSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  folder: entityFolderSchema,
  fields: z.record(z.string(), z.unknown()),
});
export type EntityTypeSpec = z.infer<typeof entityTypeSchema>;
