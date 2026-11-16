import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import { entityRefSchema } from '@bbartolome/scriba-contracts/project-store';
import {
  TOOL_ERROR_CODES,
  TOOL_ERROR_STATUS,
  type EntityToResolve,
  type ToolArgsInvalidDetails,
  type ToolArgsIssue,
  type ToolSpec,
  type ToolValidateRequest,
  type ToolValidateResult,
} from '@bbartolome/scriba-contracts/tool-registry';
import { ModuleError } from '../platform/platform.module';
import {
  isRecord,
  readInputs,
  requiredKeys,
  stripExtensions,
  ToolSpecError,
  type InputField,
} from './inputs';

// The compiled validators of one tool and its fields. `full` checks every argument; `params` checks the non-port ones.
export interface CompiledTool {
  full: ValidateFunction;
  params: ValidateFunction;
  fields: InputField[];
}

// The issue of an unknown field, which the message lists together with the allowed fields.
const UNKNOWN_FIELD = 'unknown field';
// A value in a message is cut to this many characters.
const VALUE_CHARACTERS = 80;

// Draft-07, every error reported, defaults applied, strict, and no coercion: "3" is not an integer.
export function createAjv(): Ajv {
  return new Ajv({ allErrors: true, useDefaults: true, strict: true });
}

// An object schema over the given fields. Extension keys are removed, because strict Ajv refuses unknown keywords.
function objectSchema(
  fields: InputField[],
  required: string[],
): Record<string, unknown> {
  return {
    type: 'object',
    properties: Object.fromEntries(
      fields.map((field) => [field.key, stripExtensions(field.schema)]),
    ),
    required,
    additionalProperties: false,
  };
}

// Compiles the full and the params validators of one spec, once, at load.
export function compileTool(spec: ToolSpec, ajv: Ajv): CompiledTool {
  const fields = readInputs(spec);
  const required = requiredKeys(spec);
  const portKeys = new Set(
    fields.filter((field) => field.isPort).map((field) => field.key),
  );
  const paramFields = fields.filter((field) => !field.isPort);
  try {
    return {
      full: ajv.compile(objectSchema(fields, required)),
      params: ajv.compile(
        objectSchema(
          paramFields,
          required.filter((key) => !portKeys.has(key)),
        ),
      ),
      fields,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ToolSpecError(
      `The inputs of "${spec.name}" do not compile in Ajv: ${reason}`,
    );
  }
}

// Checks the arguments of one call. Returns them with defaults applied and the entity references they name,
// or throws TOOL_ARGS_INVALID. The registry never retries.
export function validateArguments(
  entry: { spec: ToolSpec; compiled: CompiledTool },
  request: ToolValidateRequest,
): ToolValidateResult {
  const { spec, compiled } = entry;
  const { fields } = compiled;
  const portKeys = new Set(
    fields.filter((field) => field.isPort).map((field) => field.key),
  );
  const params = request.mode === 'params';

  // A copy, so the defaults Ajv applies never touch the request. Params mode drops the port keys.
  const args: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(request.arguments)) {
    if (!(params && portKeys.has(key))) args[key] = value;
  }

  const validate = params ? compiled.params : compiled.full;
  const ajvPassed = validate(args);
  const issues: ToolArgsIssue[] = ajvPassed
    ? []
    : (validate.errors ?? []).map((error) => issueOf(error, args, fields));

  // Every entity or style value must be an entity ID (each item of a list). After an Ajv failure, only string values are checked, so every bad field is named once by Ajv or here.
  const entityRefs: EntityToResolve[] = [];
  for (const field of fields) {
    if (!field.isEntity && !field.isStyle) continue;
    const value = args[field.key];
    if (value === undefined) continue;
    if (!ajvPassed && field.list && !Array.isArray(value)) continue;
    const items: unknown[] = field.list ? (value as unknown[]) : [value];
    items.forEach((item, index) => {
      if (!ajvPassed && typeof item !== 'string') return;
      const parsed = entityRefSchema.safeParse(item);
      if (parsed.success) {
        entityRefs.push({
          field: field.key,
          id: parsed.data,
          style: field.isStyle,
        });
        return;
      }
      const key = escapePointer(field.key);
      issues.push({
        path: field.list ? `/${key}/${index}` : `/${key}`,
        message: `expected an entity ID (lower-case letters, digits and hyphens), received ${show(item)}`,
      });
    });
  }
  if (issues.length > 0) throw argsInvalid(spec.name, fields, issues);

  return { arguments: args, entityRefs };
}

// One Ajv error as one issue. The path is a JSON Pointer to the argument the message names.
function issueOf(
  error: ErrorObject,
  args: unknown,
  fields: InputField[],
): ToolArgsIssue {
  if (error.keyword === 'required') {
    const missing = String(error.params.missingProperty);
    const field = fields.find((candidate) => candidate.key === missing);
    const type =
      field === undefined ? 'string' : field.list ? 'array' : field.valueType;
    return {
      path: `${error.instancePath}/${escapePointer(missing)}`,
      message: `required, expected ${expected(type)}, received nothing`,
    };
  }
  if (error.keyword === 'additionalProperties') {
    const extra = String(error.params.additionalProperty);
    return {
      path: `${error.instancePath}/${escapePointer(extra)}`,
      message: UNKNOWN_FIELD,
    };
  }
  return {
    path: error.instancePath,
    message: messageOf(error, valueAt(args, error.instancePath)),
  };
}

// The text after the field name, for one keyword.
function messageOf(error: ErrorObject, value: unknown): string {
  const limit = error.params.limit;
  switch (error.keyword) {
    case 'type':
      return `expected ${expected(String(error.params.type))}, received ${show(value)}`;
    case 'enum': {
      const allowed = (error.params.allowedValues as unknown[])
        .map((option) => JSON.stringify(option))
        .join(', ');
      return `expected one of ${allowed}, received ${show(value)}`;
    }
    case 'minimum':
      return `expected at least ${String(limit)}, received ${show(value)}`;
    case 'maximum':
      return `expected at most ${String(limit)}, received ${show(value)}`;
    case 'minLength':
      return `expected at least ${String(limit)} characters, received ${show(value)}`;
    case 'maxLength':
      return `expected at most ${String(limit)} characters, received ${show(value)}`;
    case 'minItems':
      return `expected at least ${String(limit)} items, received ${show(value)}`;
    case 'maxItems':
      return `expected at most ${String(limit)} items, received ${show(value)}`;
    case 'uniqueItems':
      return `expected unique items, received ${show(value)}`;
    case 'pattern':
      return `expected a value that matches the pattern, received ${show(value)}`;
    default:
      return `${error.message ?? 'is not valid'}, received ${show(value)}`;
  }
}

// The phrase for the type a value must have. `type` is an Ajv type name.
function expected(type: string): string {
  switch (type) {
    case 'string':
      return 'a string';
    case 'integer':
      return 'an integer';
    case 'number':
      return 'a number';
    case 'boolean':
      return 'a boolean';
    case 'array':
      return 'a list';
    default:
      return 'a value';
  }
}

// The TOOL_ARGS_INVALID error: a lead line, one line per field issue, and one line for the unknown fields.
function argsInvalid(
  name: string,
  fields: InputField[],
  issues: ToolArgsIssue[],
): ModuleError {
  const lines = [`Arguments for the tool "${name}" are not valid:`];
  for (const issue of issues) {
    if (issue.message !== UNKNOWN_FIELD) {
      lines.push(`- ${fieldOf(issue.path)}: ${issue.message}.`);
    }
  }
  const unknown = issues
    .filter((issue) => issue.message === UNKNOWN_FIELD)
    .map((issue) => `"${fieldOf(issue.path)}"`);
  if (unknown.length > 0) {
    const named =
      unknown.length === 1
        ? unknown[0]
        : `${unknown.slice(0, -1).join(', ')} and ${unknown[unknown.length - 1]}`;
    const label = unknown.length === 1 ? 'Unknown field' : 'Unknown fields';
    const allowed = fields.map((field) => field.key).join(', ') || 'none';
    lines.push(`- ${label} ${named}. Allowed fields: ${allowed}.`);
  }
  const details: ToolArgsInvalidDetails = { issues };
  return new ModuleError(
    TOOL_ERROR_CODES.ARGS_INVALID,
    TOOL_ERROR_STATUS.TOOL_ARGS_INVALID,
    lines.join('\n'),
    details,
  );
}

// The field a JSON Pointer names: `key`, or `key[index]` for an item of a list.
function fieldOf(path: string): string {
  const segments = path.split('/').slice(1).map(unescapePointer);
  if (segments.length === 0) return '(arguments)';
  return segments
    .map((segment, index) => {
      if (index === 0) return segment;
      return /^\d+$/.test(segment) ? `[${segment}]` : `.${segment}`;
    })
    .join('');
}

// The value at a JSON Pointer in the arguments, or undefined when there is none.
function valueAt(root: unknown, pointer: string): unknown {
  let current: unknown = root;
  for (const segment of pointer.split('/').slice(1)) {
    const key = unescapePointer(segment);
    if (Array.isArray(current)) current = current[Number(key)];
    else if (isRecord(current)) current = current[key];
    else return undefined;
  }
  return current;
}

// A value as JSON, cut to VALUE_CHARACTERS characters with `...`.
function show(value: unknown): string {
  const text = JSON.stringify(value) ?? String(value);
  return text.length > VALUE_CHARACTERS
    ? `${text.slice(0, VALUE_CHARACTERS)}...`
    : text;
}

// RFC 6901: `~` is written `~0` and `/` is written `~1`.
function escapePointer(key: string): string {
  return key.replace(/~/g, '~0').replace(/\//g, '~1');
}

function unescapePointer(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}
