import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import { parse } from 'yaml';
import {
  BUILTIN_ORIGINS,
  ENTITY_TYPE_SCHEMA_VERSION,
  entityTypeSchema,
  type BuiltinOrigin,
  type EntityTypeSpec,
  type ToolArgsIssue,
} from '@bbartolome/scriba-contracts/tool-registry';
import { BootError } from '../platform/platform.module';
import { isRecord, stripExtensions } from './inputs';

// The built-in entity types: one YAML per kind in each pack's entity-types folder. A fault in one stops boot,
// because the entity-type list has no error field to show it (C2).

const YAML_SUFFIX = '.yaml';
const SCALAR_TYPES = ['string', 'integer', 'number', 'boolean'];
const ITEM_TYPES = ['string', 'integer', 'number'];
// The only x- hints an entity field takes. The port and control hints are tool-only.
const FIELD_HINTS = ['x-scriba-type', 'x-scriba-entity-kinds'];

// One entity type as loaded: its envelope, and the Ajv validator of its front matter.
export interface EntityTypeEntry {
  spec: EntityTypeSpec;
  validate: ValidateFunction;
}

// The result of a check: valid, and one issue per fault, shaped like a tool-argument issue.
export interface EntityCheck {
  valid: boolean;
  issues: ToolArgsIssue[];
}

export type EntityValidator = (frontMatter: unknown) => EntityCheck;

// The names of the regular `.yaml` files directly in a folder, sorted. A folder that does not exist has none.
function yamlFilesIn(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        !entry.name.startsWith('.') &&
        entry.name.endsWith(YAML_SUFFIX),
    )
    .map((entry) => entry.name)
    .sort();
}

function fault(label: string, message: string): BootError {
  return new BootError(
    `The entity type file "${label}" is not valid: ${message}`,
  );
}

function isScalarType(value: unknown): boolean {
  return typeof value === 'string' && SCALAR_TYPES.includes(value);
}

function isItemType(value: unknown): boolean {
  return typeof value === 'string' && ITEM_TYPES.includes(value);
}

// The x- hints of one schema node: only the two entity hints, with the values an entity field takes.
function checkHints(
  node: Record<string, unknown>,
  path: string,
  label: string,
): void {
  for (const key of Object.keys(node)) {
    if (key.startsWith('x-') && !FIELD_HINTS.includes(key)) {
      throw fault(
        label,
        `field "${path}" has the key "${key}", which an entity field does not take.`,
      );
    }
  }
  const type = node['x-scriba-type'];
  if (type !== undefined && type !== 'entity') {
    throw fault(
      label,
      `field "${path}" has x-scriba-type ${JSON.stringify(type)}; an entity field has "entity".`,
    );
  }
  const kinds = node['x-scriba-entity-kinds'];
  if (
    kinds !== undefined &&
    !(Array.isArray(kinds) && kinds.every((kind) => typeof kind === 'string'))
  ) {
    throw fault(
      label,
      `field "${path}" has x-scriba-entity-kinds that is not a list of kinds.`,
    );
  }
}

// One object item of a list field: scalar properties only, required names, and additionalProperties false.
function checkObjectItems(
  name: string,
  items: Record<string, unknown>,
  label: string,
): void {
  checkHints(items, `${name}[]`, label);
  if (items.additionalProperties !== false) {
    throw fault(
      label,
      `the items of field "${name}" must declare additionalProperties: false.`,
    );
  }
  const properties = items.properties ?? {};
  if (!isRecord(properties)) {
    throw fault(
      label,
      `the items of field "${name}" must list their properties in an object.`,
    );
  }
  for (const [key, value] of Object.entries(properties)) {
    if (!isRecord(value) || !isScalarType(value.type)) {
      throw fault(
        label,
        `the item property "${name}.${key}" must be a scalar; an entity type nests one level only.`,
      );
    }
    checkHints(value, `${name}.${key}`, label);
  }
  const required = items.required;
  if (
    required !== undefined &&
    !(
      Array.isArray(required) &&
      required.every((key) => typeof key === 'string')
    )
  ) {
    throw fault(
      label,
      `the items of field "${name}" have a required that is not a list of names.`,
    );
  }
}

// One property of fields: a scalar, a list of scalars, or the one extension, a list of objects of scalars.
function checkField(name: string, property: unknown, label: string): void {
  if (!isRecord(property))
    throw fault(label, `field "${name}" must be an object.`);
  checkHints(property, name, label);
  if (isScalarType(property.type)) return;
  if (property.type !== 'array') {
    throw fault(
      label,
      `field "${name}" must be a scalar, a list of scalars or a list of objects of scalars.`,
    );
  }
  const items = property.items;
  if (!isRecord(items))
    throw fault(label, `field "${name}" is a list without items.`);
  if (isItemType(items.type)) return;
  if (items.type !== 'object') {
    throw fault(
      label,
      `field "${name}" is a list whose items are not scalars or objects.`,
    );
  }
  checkObjectItems(name, items, label);
}

// The fields of an entity type: an object schema of the fields rules. Throws BootError for a fault.
function checkFields(fields: Record<string, unknown>, label: string): void {
  if (fields.type !== 'object') {
    throw fault(label, 'fields must be an object schema (type: object).');
  }
  const properties = fields.properties ?? {};
  if (!isRecord(properties))
    throw fault(label, 'fields.properties must be an object.');
  for (const [name, property] of Object.entries(properties)) {
    checkField(name, property, label);
  }
  const required = fields.required;
  if (
    required !== undefined &&
    !(
      Array.isArray(required) &&
      required.every((key) => typeof key === 'string')
    )
  ) {
    throw fault(label, 'fields.required must be a list of names.');
  }
}

// The Ajv validator of a checked fields object. Strict, with every error reported. No defaults and no coercion,
// so a check never changes the front matter. The root allows unknown keys, which front matter may carry.
function compileFields(
  fields: Record<string, unknown>,
  label: string,
): ValidateFunction {
  const ajv = new Ajv({ allErrors: true, strict: true });
  const schema = {
    ...(stripExtensions(fields) as Record<string, unknown>),
    type: 'object',
    additionalProperties: true,
  };
  try {
    return ajv.compile(schema);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw fault(label, `the fields do not compile in Ajv: ${reason}`);
  }
}

// Reads one entity-type file: the version first, then the envelope, the stem rule, the fields rules and the
// validator. Throws BootError for any fault, naming the file.
function loadEntityType(
  path: string,
  stem: string,
  pack: BuiltinOrigin,
): EntityTypeEntry {
  const label = `${pack}/entity-types/${stem}${YAML_SUFFIX}`;
  let raw: unknown;
  try {
    raw = parse(readFileSync(path, 'utf8'));
  } catch (error) {
    const reason =
      error instanceof Error ? error.message.split('\n')[0] : String(error);
    throw fault(label, `it does not parse as YAML: ${reason}.`);
  }
  if (!isRecord(raw)) throw fault(label, 'it must hold a YAML mapping.');
  const version = raw.schemaVersion;
  if (typeof version === 'number' && version > ENTITY_TYPE_SCHEMA_VERSION) {
    throw fault(
      label,
      `schemaVersion ${version} is newer than the ${ENTITY_TYPE_SCHEMA_VERSION} this version of Scriba reads, so the file is refused.`,
    );
  }
  const parsed = entityTypeSchema.safeParse(raw);
  if (!parsed.success) {
    const reasons = parsed.error.issues
      .map((issue) =>
        issue.path.length === 0
          ? issue.message
          : `${issue.path.map(String).join('.')}: ${issue.message}`,
      )
      .join('; ');
    throw fault(label, `${reasons}.`);
  }
  const spec = parsed.data;
  if (spec.kind !== stem) {
    throw fault(
      label,
      `it defines the kind "${spec.kind}", but the kind must match the file name "${stem}".`,
    );
  }
  checkFields(spec.fields, label);
  return { spec, validate: compileFields(spec.fields, label) };
}

// Reads the built-in entity types of the packs root, once. A pack folder that does not exist is empty. A kind that
// two packs define, or a faulty file, stops boot.
export function readEntityTypes(
  packsRoot: string,
): Map<string, EntityTypeEntry> {
  const owner = new Map<string, BuiltinOrigin>();
  const entries = new Map<string, EntityTypeEntry>();
  for (const pack of BUILTIN_ORIGINS) {
    const dir = join(packsRoot, pack, 'entity-types');
    for (const file of yamlFilesIn(dir)) {
      const stem = file.slice(0, -YAML_SUFFIX.length);
      const entry = loadEntityType(join(dir, file), stem, pack);
      const kind = entry.spec.kind;
      const first = owner.get(kind);
      if (first !== undefined) {
        throw new BootError(
          `The entity kind "${kind}" is defined in two built-in packs, ${first} and ${pack} (packs root ${packsRoot}).`,
        );
      }
      owner.set(kind, pack);
      entries.set(kind, entry);
    }
  }
  return entries;
}

// One issue per Ajv error. A missing or unknown key is reported at the object that has it, so an item of a list
// is named by its own pointer (`/evidence/1`).
function issueOf(error: ErrorObject): ToolArgsIssue {
  if (error.keyword === 'required') {
    return {
      path: error.instancePath,
      message: `missing required property "${String(error.params.missingProperty)}"`,
    };
  }
  if (error.keyword === 'additionalProperties') {
    return {
      path: error.instancePath,
      message: `unknown field "${String(error.params.additionalProperty)}"`,
    };
  }
  return { path: error.instancePath, message: error.message ?? 'is not valid' };
}

// The checker of one entity type. Validating never changes the front matter it is given.
export function entityValidatorOf(entry: EntityTypeEntry): EntityValidator {
  return (frontMatter) => {
    if (entry.validate(frontMatter)) return { valid: true, issues: [] };
    return {
      valid: false,
      issues: (entry.validate.errors ?? []).map(issueOf),
    };
  };
}
