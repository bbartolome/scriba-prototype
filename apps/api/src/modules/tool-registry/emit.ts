import {
  OUTPUT_PORT_KEY,
  type ControlType,
  type FormField,
  type PortInput,
  type ToolSpec,
  type ToolViews,
} from '@bbartolome/scriba-contracts/tool-registry';
import {
  portTypeOf,
  readInputs,
  requiredKeys,
  stripExtensions,
  type InputField,
} from './inputs';

// A string longer than this is long text: a textarea rather than a single-line text.
const LONG_TEXT_LENGTH = 200;

// The hint appended to an entity or style field's description in the function schema.
function hintFor(field: InputField): string | undefined {
  if (field.isEntity) {
    const kinds = field.hints['x-scriba-entity-kinds'];
    return kinds !== undefined && kinds.length > 0
      ? `Entity ID(s) of kind ${kinds.join(' or ')}.`
      : 'Entity ID(s).';
  }
  if (field.isStyle) {
    return "Style-profile entity ID; defaults to the project's style profile.";
  }
  return undefined;
}

// The control, derived in this order: the first rule that matches wins. The server derives it; the web app never does.
function controlOf(field: InputField): ControlType {
  const schema = field.schema;
  const hinted = field.hints['x-scriba-control'];
  if (hinted !== undefined) return hinted;
  if (field.hints['x-scriba-type'] === 'entity') return 'entity-picker';
  if (field.hints['x-scriba-type'] === 'style') return 'style-picker';
  if (Array.isArray(schema.enum)) return 'select';
  if (field.valueType === 'boolean') return 'toggle';
  if (field.valueType === 'integer' || field.valueType === 'number') {
    return typeof schema.minimum === 'number' &&
      typeof schema.maximum === 'number'
      ? 'slider'
      : 'number';
  }
  return typeof schema.maxLength === 'number' &&
    schema.maxLength > LONG_TEXT_LENGTH
    ? 'textarea'
    : 'text';
}

// One form field. Optional keys are set only when the property has them.
function formField(field: InputField): FormField {
  const schema = field.schema;
  const form: FormField = {
    key: field.key,
    title: field.title,
    description: field.description,
    control: controlOf(field),
    required: field.required,
    default: 'default' in schema ? schema.default : null,
    list: field.list,
    port: field.isPort,
    valueType: field.valueType,
  };
  const elementType = field.hints['x-scriba-type'];
  if (elementType !== undefined) form.elementType = elementType;
  const entityKinds = field.hints['x-scriba-entity-kinds'];
  if (entityKinds !== undefined) form.entityKinds = entityKinds;
  if (Array.isArray(schema.enum)) form.enum = schema.enum as string[];
  if (typeof schema.minimum === 'number') form.minimum = schema.minimum;
  if (typeof schema.maximum === 'number') form.maximum = schema.maximum;
  if (typeof schema.minLength === 'number') form.minLength = schema.minLength;
  if (typeof schema.maxLength === 'number') form.maxLength = schema.maxLength;
  return form;
}

// One property of the function schema: extension keys removed, and the hint appended to its description.
function functionProperty(field: InputField): Record<string, unknown> {
  const property = stripExtensions(field.schema) as Record<string, unknown>;
  const hint = hintFor(field);
  if (hint !== undefined) {
    property.description =
      field.description === '' ? hint : `${field.description} ${hint}`;
  }
  return property;
}

function portInput(field: InputField): PortInput {
  return {
    key: field.key,
    type: portTypeOf(field),
    list: field.list,
    required: field.required,
    title: field.title,
  };
}

// The three views of one spec. Pure: the same spec always gives the same views.
export function emitViews(spec: ToolSpec): ToolViews {
  const fields = readInputs(spec);
  const styleKeys = new Set(
    fields.filter((field) => field.isStyle).map((field) => field.key),
  );
  return {
    functionSchema: {
      type: 'function',
      function: {
        name: spec.name,
        description: spec.description,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            fields.map((field) => [field.key, functionProperty(field)]),
          ),
          // A style field is never required in the function schema: callers fill it from the project's profile.
          required: requiredKeys(spec).filter((key) => !styleKeys.has(key)),
          additionalProperties: false,
        },
      },
    },
    form: { fields: fields.map(formField) },
    ports: {
      inputs: fields.filter((field) => field.isPort).map(portInput),
      output: { key: OUTPUT_PORT_KEY, type: 'text', kind: spec.output },
      params: fields.filter((field) => !field.isPort).map((field) => field.key),
    },
  };
}
