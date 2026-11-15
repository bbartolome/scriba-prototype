import {
  OUTPUT_PORT_KEY,
  toolHintsSchema,
  type PortType,
  type ToolHints,
  type ToolSpec,
  type ValueType,
} from '@bbartolome/scriba-contracts/tool-registry';

type Schema = Record<string, unknown>;

// A tool spec the emitter cannot read: the loader catches it per file. TRG-07 checks the rules that go further.
export class ToolSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolSpecError';
  }
}

// One property of inputs, in property order, with what the emitter and the validator need from it.
export interface InputField {
  key: string;
  // The property as written, extension keys included.
  schema: Schema;
  hints: ToolHints;
  // The JSON type of the value: the property's type, or the item type of a list.
  valueType: ValueType;
  list: boolean;
  required: boolean;
  title: string;
  description: string;
  isPort: boolean;
  isEntity: boolean;
  isStyle: boolean;
}

const SCALAR_TYPES: readonly ValueType[] = [
  'string',
  'integer',
  'number',
  'boolean',
];
const ITEM_TYPES: readonly ValueType[] = ['string', 'integer', 'number'];

export function isRecord(value: unknown): value is Schema {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(
  allowed: readonly T[],
  value: unknown,
): value is T {
  return (
    typeof value === 'string' && (allowed as readonly string[]).includes(value)
  );
}

// The required keys as written. A list of names is required; anything else is refused.
export function requiredKeys(spec: ToolSpec): string[] {
  const required = spec.inputs.required;
  if (required === undefined) return [];
  if (
    !Array.isArray(required) ||
    !required.every((k) => typeof k === 'string')
  ) {
    throw new ToolSpecError(
      `inputs.required of "${spec.name}" is not a list of property names.`,
    );
  }
  return required as string[];
}

// The x-scriba-* hints of one property, checked against the hint schema. An unknown hint is refused.
function readHints(key: string, property: Schema): ToolHints {
  const raw = Object.fromEntries(
    Object.entries(property).filter(([name]) => name.startsWith('x-scriba-')),
  );
  const parsed = toolHintsSchema.safeParse(raw);
  if (!parsed.success) {
    const reasons = parsed.error.issues
      .map((issue) => issue.message)
      .join('; ');
    throw new ToolSpecError(
      `property "${key}" has an invalid x-scriba-* hint: ${reasons}.`,
    );
  }
  return parsed.data;
}

function readField(
  key: string,
  value: unknown,
  required: string[],
): InputField {
  if (key === OUTPUT_PORT_KEY) {
    throw new ToolSpecError(
      `"${OUTPUT_PORT_KEY}" is reserved and cannot name an input.`,
    );
  }
  if (!isRecord(value)) {
    throw new ToolSpecError(`property "${key}" must be an object.`);
  }
  const hints = readHints(key, value);

  let valueType: ValueType;
  let list = false;
  if (value.type === 'array') {
    const items = value.items;
    if (!isRecord(items) || !isOneOf(ITEM_TYPES, items.type)) {
      throw new ToolSpecError(
        `property "${key}" is an array whose items are not string, integer or number.`,
      );
    }
    valueType = items.type;
    list = true;
  } else if (isOneOf(SCALAR_TYPES, value.type)) {
    valueType = value.type;
  } else {
    throw new ToolSpecError(
      `property "${key}" has a type outside the inputs subset.`,
    );
  }

  const isPort = hints['x-scriba-port'] === true;
  if (isPort && hints['x-scriba-type'] === undefined) {
    throw new ToolSpecError(
      `property "${key}" is a port (x-scriba-port) without an x-scriba-type.`,
    );
  }

  return {
    key,
    schema: value,
    hints,
    valueType,
    list,
    required: required.includes(key),
    title: typeof value.title === 'string' ? value.title : key,
    description: typeof value.description === 'string' ? value.description : '',
    isPort,
    isEntity: hints['x-scriba-type'] === 'entity',
    isStyle: hints['x-scriba-type'] === 'style',
  };
}

// The properties of a spec's inputs, in property order. Throws ToolSpecError for a shape outside the subset.
export function readInputs(spec: ToolSpec): InputField[] {
  const properties = spec.inputs.properties ?? {};
  if (!isRecord(properties)) {
    throw new ToolSpecError(
      `inputs.properties of "${spec.name}" is not an object.`,
    );
  }
  const required = requiredKeys(spec);
  return Object.entries(properties).map(([key, value]) =>
    readField(key, value, required),
  );
}

// The port type of a port field. readInputs guarantees it; the check keeps the type exact.
export function portTypeOf(field: InputField): PortType {
  const type = field.hints['x-scriba-type'];
  if (type === undefined) {
    throw new ToolSpecError(
      `property "${field.key}" is a port without an x-scriba-type.`,
    );
  }
  return type;
}

// Removes every x- key at every depth. A property's own name is data, so the names under `properties` are kept.
export function stripExtensions(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripExtensions);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !key.startsWith('x-'))
      .map(([key, child]) => [key, stripChild(key, child)]),
  );
}

function stripChild(key: string, child: unknown): unknown {
  if (key !== 'properties' || !isRecord(child)) return stripExtensions(child);
  return Object.fromEntries(
    Object.entries(child).map(([name, property]) => [
      name,
      stripExtensions(property),
    ]),
  );
}
