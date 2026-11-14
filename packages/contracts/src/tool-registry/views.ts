import { z } from 'zod';
import { OUTPUT_PORT_KEY, VALUE_TYPES } from './constants.js';
import {
  controlTypeSchema,
  jsonSchemaObjectSchema,
  outputKindSchema,
  portTypeSchema,
  toolNameSchema,
} from './spec.js';

// One input port: a property of inputs with x-scriba-port set.
export const portInputSchema = z.object({
  key: z.string().min(1),
  type: portTypeSchema,
  list: z.boolean(),
  required: z.boolean(),
  title: z.string(),
});
export type PortInput = z.infer<typeof portInputSchema>;

// The one output port: key `output`, type `text` in v1, and the tool's output kind.
export const portOutputSchema = z.object({
  key: z.literal(OUTPUT_PORT_KEY),
  type: z.literal('text'),
  kind: outputKindSchema,
});
export type PortOutput = z.infer<typeof portOutputSchema>;

/**
 * Port descriptor of one tool, derived from its `inputs` schema. Derivation rule:
 * - An input port is a property of `inputs` with `x-scriba-port: true`. Ports keep the property order.
 * - The port `type` is the property's `x-scriba-type` (`text`, `entity` or `style`).
 * - `list` is true when the property's schema type is `array`. `required` is true when the key is in `required`.
 * - `title` is the property's `title`, or its key when it has none.
 * - There is exactly one output port. Its key is `output` and its type is `text` in v1. It carries the tool's output kind. The type may be widened by expand-contract.
 * - Every other property is a param. `params` lists their keys in property order.
 * - A port id is `<nodeId>.<key>`.
 * - A port type is an element type: an `entity` list port accepts a list of entities. A wire carries one value per input.
 * - The descriptor does not check shapes. Ajv checks the arguments when a run starts.
 */
export const portDescriptorSchema = z.object({
  inputs: portInputSchema.array(),
  output: portOutputSchema,
  params: z.string().array(),
});
export type PortDescriptor = z.infer<typeof portDescriptorSchema>;

// The JSON types a form field's value can have.
export const valueTypeSchema = z.enum(VALUE_TYPES);
export type ValueType = z.infer<typeof valueTypeSchema>;

// One form field. `default` is required and may be null, which means no default.
export const formFieldSchema = z.object({
  key: z.string().min(1),
  title: z.string(),
  description: z.string(),
  control: controlTypeSchema,
  required: z.boolean(),
  default: z.unknown(),
  enum: z.array(z.string()).optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(0).optional(),
  list: z.boolean(),
  entityKinds: z.array(z.string().min(1)).optional(),
  port: z.boolean(),
  elementType: portTypeSchema.optional(),
  valueType: valueTypeSchema.optional(),
});
export type FormField = z.infer<typeof formFieldSchema>;

// The form descriptor: an object, so a later key can sit beside `fields`.
export const formDescriptorSchema = z.object({
  fields: formFieldSchema.array(),
});
export type FormDescriptor = z.infer<typeof formDescriptorSchema>;

// The model function schema of one tool, as a function-calling tool.
export const modelFunctionSchema = z.object({
  type: z.literal('function'),
  function: z.object({
    name: toolNameSchema,
    description: z.string(),
    parameters: jsonSchemaObjectSchema,
  }),
});
export type ModelFunction = z.infer<typeof modelFunctionSchema>;

// The three views emitted from one spec: all three keys are required.
export const toolViewsSchema = z.object({
  functionSchema: modelFunctionSchema,
  form: formDescriptorSchema,
  ports: portDescriptorSchema,
});
export type ToolViews = z.infer<typeof toolViewsSchema>;
