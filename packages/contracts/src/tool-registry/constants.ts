// The supported version of a tool spec file. A higher schemaVersion still parses; the loader refuses it.
export const TOOL_SPEC_SCHEMA_VERSION = 1 as const;

// The supported version of an entity-type file. The loader refuses a higher version.
export const ENTITY_TYPE_SCHEMA_VERSION = 1 as const;

// A tool name: lower snake case, 1 to 64 characters, starting with a letter. The file is `<name>.yaml`.
export const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

// An entity kind, the `type` of an entity: lower kebab-case, the shape of Platform's event-type pattern.
export const ENTITY_KIND_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

// A tool description is one line of at most this many characters.
export const TOOL_DESCRIPTION_MAX_LENGTH = 200;

// The output kinds of a tool. A closed set of five.
export const OUTPUT_KINDS = [
  'draft',
  'entity',
  'claims',
  'graph',
  'check',
] as const;

// The element types of a port. A closed set of three.
export const PORT_TYPES = ['text', 'entity', 'style'] as const;

// The key of the one output port of every tool.
export const OUTPUT_PORT_KEY = 'output' as const;

// The form controls a tool form can render. A closed set of eight.
export const CONTROL_TYPES = [
  'text',
  'textarea',
  'select',
  'slider',
  'number',
  'toggle',
  'entity-picker',
  'style-picker',
] as const;

// The closed set of x-scriba-* hint keys of a tool's inputs schema.
export const HINT_KEYS = [
  'x-scriba-type',
  'x-scriba-port',
  'x-scriba-entity-kinds',
  'x-scriba-control',
] as const;

// Where a tool comes from: the three built-in packs and the author's user pack.
export const TOOL_ORIGINS = ['core', 'nonfiction', 'fiction', 'user'] as const;

// The built-in packs, the origins a user copy can override.
export const BUILTIN_ORIGINS = ['core', 'nonfiction', 'fiction'] as const;

// The two folders an entity type can store its entities in.
export const ENTITY_FOLDERS = ['sources', 'entities'] as const;

// The severities of a lint diagnostic.
export const LINT_SEVERITIES = ['error', 'warning'] as const;

// The modes of a validate request: all arguments, or only the parameters.
export const VALIDATE_MODES = ['full', 'params'] as const;

// The JSON types a form field's value can have.
export const VALUE_TYPES = ['string', 'integer', 'number', 'boolean'] as const;
