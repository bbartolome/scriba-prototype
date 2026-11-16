import Ajv from 'ajv';
import {
  isMap,
  isScalar,
  isSeq,
  LineCounter,
  parseDocument,
  type Pair,
  type YAMLError,
  type YAMLMap,
} from 'yaml';
import {
  CONTROL_TYPES,
  ENTITY_KIND_PATTERN,
  ENTITY_TYPE_SCHEMA_VERSION,
  HINT_KEYS,
  OUTPUT_PORT_KEY,
  PORT_TYPES,
  TOOL_NAME_PATTERN,
  TOOL_SPEC_SCHEMA_VERSION,
  entityTypeSchema,
  toolSpecSchema,
  type LintCounts,
  type LintDiagnostic,
  type LintResult,
  type ToolSpec,
  type ToolViews,
} from '@bbartolome/scriba-contracts/tool-registry';
import { emitViews } from './emit';
import { isRecord, stripExtensions, ToolSpecError } from './inputs';
import { parseTemplate, templateVariables } from './template';
import { compileTool, createAjv } from './validate';

// The lint of tool specs and entity-type files (TRG-07). Every rule reports against the YAML source, with a 1-based
// line and column. The runtime loaders and the pack-lint library use it, so one rule set covers both.
// This file imports the inputs reader, the emitter, the template parser and the validator, and never the loaders.

interface Pos {
  line: number;
  column: number;
}

// The lint of one tool source: the diagnostics, the spec when the envelope parses, and the views when there is no error.
export interface ToolLint {
  lint: LintResult;
  spec: ToolSpec | null;
  views: ToolViews | null;
}

export interface ToolLintOptions {
  // The file stem the source is or will be saved under. The file-name rule runs only when it is given.
  name?: string;
  // The entity kinds that built-in entity types declare. The entity-kind rule runs only when they are given.
  entityKinds?: ReadonlySet<string>;
}

const ORIGIN: Pos = { line: 1, column: 1 };
// The keywords of an inputs root, and of the fields root of an entity type (D3).
const ROOT_KEYWORDS = [
  'type',
  'properties',
  'required',
  'additionalProperties',
  'title',
  'description',
];
// The annotations every property takes, whatever its type (D3).
const ANNOTATIONS = ['title', 'description', 'default'];
// The keywords of a property, besides `type` and the annotations, per JSON type (D3).
const TYPE_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
  string: ['enum', 'minLength', 'maxLength', 'pattern'],
  integer: ['minimum', 'maximum'],
  number: ['minimum', 'maximum'],
  boolean: [],
  array: ['minItems', 'maxItems', 'uniqueItems', 'items'],
};
const SCALAR_TYPES = ['string', 'integer', 'number', 'boolean'];
const ITEM_TYPES = ['string', 'integer', 'number'];
// The rules that stop the compile check: the compile would only repeat one of these faults (step 4).
const GATE_RULES = [
  'inputs-subset',
  'reserved-output',
  'hint-unknown',
  'hint-consistency',
];

// Collects the diagnostics of one source.
class Report {
  private readonly found: LintDiagnostic[] = [];

  constructor(private readonly lines: LineCounter) {}

  // The 1-based position of a YAML node, or 1:1 for a node that has no range (an absent value).
  at(node: unknown): Pos {
    return positionOf(this.lines, node);
  }

  error(rule: string, message: string, pos: Pos): void {
    this.found.push({
      severity: 'error',
      rule,
      message,
      line: pos.line,
      column: pos.column,
    });
  }

  warning(rule: string, message: string, pos: Pos): void {
    this.found.push({
      severity: 'warning',
      rule,
      message,
      line: pos.line,
      column: pos.column,
    });
  }

  hasErrors(): boolean {
    return this.found.some((diagnostic) => diagnostic.severity === 'error');
  }

  has(rules: readonly string[]): boolean {
    return this.found.some(
      (diagnostic) =>
        diagnostic.severity === 'error' && rules.includes(diagnostic.rule),
    );
  }

  result(): LintResult {
    return [...this.found].sort(
      (a, b) =>
        a.line - b.line ||
        a.column - b.column ||
        (a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0),
    );
  }
}

function positionOf(lines: LineCounter, node: unknown): Pos {
  const range = (node as { range?: readonly number[] } | null | undefined)
    ?.range;
  if (range === undefined) return ORIGIN;
  const { line, col } = lines.linePos(range[0] ?? 0);
  return { line, column: col };
}

function keyName(node: unknown): unknown {
  return isScalar(node) ? node.value : node;
}

function keyOf(pair: Pair): string {
  return String(keyName(pair.key));
}

function pairOf(map: unknown, name: string): Pair | undefined {
  if (!isMap(map)) return undefined;
  return map.items.find((pair) => keyName(pair.key) === name);
}

function pairsOf(map: unknown): Pair[] {
  return isMap(map) ? map.items : [];
}

function scalarOf(node: unknown): unknown {
  return isScalar(node) ? node.value : undefined;
}

function stringOf(node: unknown): string | undefined {
  const value = scalarOf(node);
  return typeof value === 'string' ? value : undefined;
}

function isEmpty(node: unknown): boolean {
  return node === null || node === undefined || scalarOf(node) === null;
}

// The position of a pair's value, or of its key when the value is empty.
function valuePos(report: Report, pair: Pair): Pos {
  return isEmpty(pair.value) ? report.at(pair.key) : report.at(pair.value);
}

function keyPos(report: Report, pair: Pair): Pos {
  return report.at(pair.key);
}

function reportYamlErrors(report: Report, errors: readonly YAMLError[]): void {
  for (const error of errors) {
    const first = error.linePos?.[0];
    report.error(
      'yaml-parse',
      error.message.split('\n')[0] ?? error.message,
      first === undefined ? ORIGIN : { line: first.line, column: first.col },
    );
  }
}

// The version of a file newer than the one this version reads (schema-version).
function checkVersion(
  report: Report,
  root: YAMLMap,
  raw: Record<string, unknown>,
  supported: number,
): void {
  const value = raw.schemaVersion;
  if (typeof value !== 'number' || value <= supported) return;
  const pair = pairOf(root, 'schemaVersion');
  report.error(
    'schema-version',
    `schemaVersion ${value} is newer than the ${supported} this version of Scriba reads`,
    pair === undefined ? report.at(root) : valuePos(report, pair),
  );
}

// The name must match the file stem. Checked only when the name itself has the valid shape.
function checkFileName(
  report: Report,
  root: YAMLMap,
  key: string,
  value: unknown,
  pattern: RegExp,
  stem: string,
): void {
  if (typeof value !== 'string' || !pattern.test(value) || value === stem) {
    return;
  }
  const pair = pairOf(root, key);
  report.error(
    'file-name',
    `the ${key} "${value}" must match the file name "${stem}"`,
    pair === undefined ? report.at(root) : valuePos(report, pair),
  );
}

interface EnvelopeIssue {
  code: string;
  path: readonly PropertyKey[];
  message: string;
  keys?: readonly string[];
}

// Reports the zod envelope issues. The rule of each key comes from `ruleOf`; null skips the key.
function envelopeIssues(
  report: Report,
  root: YAMLMap,
  issues: readonly EnvelopeIssue[],
  ruleOf: (key: string) => string | null,
): void {
  for (const issue of issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys ?? []) {
        const pair = pairOf(root, key);
        report.error(
          'envelope',
          `the key "${key}" is not a field of this file`,
          pair === undefined ? report.at(root) : keyPos(report, pair),
        );
      }
      continue;
    }
    const head = issue.path[0];
    if (head === undefined) {
      report.error('envelope', issue.message, report.at(root));
      continue;
    }
    const key = String(head);
    const rule = ruleOf(key);
    if (rule === null) continue;
    const pair = pairOf(root, key);
    if (pair === undefined) {
      report.error(rule, `${key} is missing`, report.at(root));
    } else {
      report.error(rule, `${key}: ${issue.message}`, valuePos(report, pair));
    }
  }
}

function toolRuleOf(key: string): string | null {
  if (key === 'name') return 'name-pattern';
  if (key === 'description') return 'description';
  if (key === 'output') return 'output';
  // The inputs rules report every fault of inputs, so the envelope issue on it is dropped.
  if (key === 'inputs') return null;
  return 'envelope';
}

function entityRuleOf(key: string): string | null {
  if (key === 'kind') return 'name-pattern';
  if (key === 'fields') return 'entity-field';
  return 'envelope';
}

// The shape of a property: its JSON type, and the type of its items for a list.
interface Shape {
  type: string | undefined;
  itemType: string | undefined;
}

function shapeOf(schema: YAMLMap): Shape {
  const items = pairOf(schema, 'items')?.value;
  return {
    type: stringOf(pairOf(schema, 'type')?.value),
    itemType: isMap(items) ? stringOf(pairOf(items, 'type')?.value) : undefined,
  };
}

// The keywords of one property schema, against the subset of its type (D3). `rule` is inputs-subset for a tool
// input and entity-field for an entity field. Returns the type when it is in the subset.
function checkKeywords(
  report: Report,
  schema: YAMLMap,
  name: string,
  rule: string,
): string | undefined {
  const typePair = pairOf(schema, 'type');
  const type = stringOf(typePair?.value);
  if (type === undefined || !Object.hasOwn(TYPE_KEYWORDS, type)) {
    report.error(
      rule,
      `"${name}" has a type outside the subset: ${type === undefined ? 'no type' : `"${type}"`}`,
      typePair === undefined ? report.at(schema) : valuePos(report, typePair),
    );
    return undefined;
  }
  const allowed = TYPE_KEYWORDS[type] ?? [];
  for (const pair of pairsOf(schema)) {
    const key = keyOf(pair);
    if (key === 'type' || key.startsWith('x-')) continue;
    if (ANNOTATIONS.includes(key) || allowed.includes(key)) continue;
    report.error(
      rule,
      `"${name}" has the keyword "${key}", which is outside the subset of a ${type}`,
      keyPos(report, pair),
    );
  }
  if (type === 'array') checkItems(report, schema, name, rule);
  return type;
}

// The items of a list: an object with the one key `type`, which is string, integer or number (D3).
function checkItems(
  report: Report,
  schema: YAMLMap,
  name: string,
  rule: string,
): void {
  const itemsPair = pairOf(schema, 'items');
  if (itemsPair === undefined) {
    report.error(rule, `"${name}" is a list without items`, report.at(schema));
    return;
  }
  const items = itemsPair.value;
  const itemType = isMap(items)
    ? stringOf(pairOf(items, 'type')?.value)
    : undefined;
  const valid =
    isMap(items) &&
    pairsOf(items).length === 1 &&
    itemType !== undefined &&
    ITEM_TYPES.includes(itemType);
  if (!valid) {
    report.error(
      rule,
      `the items of "${name}" must hold a type of string, integer or number and nothing else`,
      valuePos(report, itemsPair),
    );
  }
}

// The x- keys of a root that are not hints of a property: an x-scriba-* key outside the vocabulary is an error,
// any other x- key is a warning, because the runtime strips it.
function checkRootExtension(report: Report, pair: Pair): void {
  const key = keyOf(pair);
  if (key.startsWith('x-scriba-')) {
    if (!(HINT_KEYS as readonly string[]).includes(key)) {
      report.error(
        'hint-unknown',
        `"${key}" is not a hint of the tool vocabulary`,
        keyPos(report, pair),
      );
    }
    return;
  }
  report.warning(
    'hint-extension',
    `"${key}" is not a hint and is stripped at load`,
    keyPos(report, pair),
  );
}

// The hints of one tool property, the consistency of their values, the control fit and the entity kinds (D4, D5, D6).
function checkToolHints(
  report: Report,
  schema: YAMLMap,
  name: string,
  shape: Shape,
  entityKinds: ReadonlySet<string> | undefined,
): void {
  for (const pair of pairsOf(schema)) {
    const key = keyOf(pair);
    if (!key.startsWith('x-')) continue;
    if (key.startsWith('x-scriba-')) {
      if (!(HINT_KEYS as readonly string[]).includes(key)) {
        report.error(
          'hint-unknown',
          `"${name}" has the hint "${key}", which is not in the hint vocabulary`,
          keyPos(report, pair),
        );
      }
    } else {
      report.warning(
        'hint-extension',
        `"${name}" has the key "${key}", which is not a hint and is stripped at load`,
        keyPos(report, pair),
      );
    }
  }

  const portPair = pairOf(schema, 'x-scriba-port');
  const typePair = pairOf(schema, 'x-scriba-type');
  const kindsPair = pairOf(schema, 'x-scriba-entity-kinds');
  const controlPair = pairOf(schema, 'x-scriba-control');
  const xType = stringOf(typePair?.value);

  if (portPair !== undefined) {
    const port = scalarOf(portPair.value);
    if (typeof port !== 'boolean') {
      report.error(
        'hint-consistency',
        `"${name}": x-scriba-port must be true or false`,
        keyPos(report, portPair),
      );
    } else if (port && typePair === undefined) {
      report.error(
        'hint-consistency',
        `"${name}" is a port (x-scriba-port) without an x-scriba-type`,
        keyPos(report, portPair),
      );
    }
  }

  if (typePair !== undefined) {
    if (
      xType === undefined ||
      !(PORT_TYPES as readonly string[]).includes(xType)
    ) {
      report.error(
        'hint-consistency',
        `"${name}": x-scriba-type must be one of ${PORT_TYPES.join(', ')}`,
        keyPos(report, typePair),
      );
    } else if (xType === 'entity') {
      const entityValue =
        shape.type === 'string' ||
        (shape.type === 'array' && shape.itemType === 'string');
      if (!entityValue) {
        report.error(
          'hint-consistency',
          `"${name}": an entity takes a string or a list of strings`,
          keyPos(report, typePair),
        );
      }
    } else if (shape.type !== 'string') {
      report.error(
        'hint-consistency',
        `"${name}": x-scriba-type ${xType} needs a string`,
        keyPos(report, typePair),
      );
    }
  }

  if (kindsPair !== undefined) {
    const list = kindsPair.value;
    const valid =
      isSeq(list) &&
      list.items.every((item) => {
        const kind = scalarOf(item);
        return typeof kind === 'string' && kind.length > 0;
      });
    if (!valid) {
      report.error(
        'hint-consistency',
        `"${name}": x-scriba-entity-kinds must be a list of kind names`,
        keyPos(report, kindsPair),
      );
    } else if (xType !== 'entity') {
      report.error(
        'hint-consistency',
        `"${name}": x-scriba-entity-kinds needs x-scriba-type: entity`,
        keyPos(report, kindsPair),
      );
    } else if (entityKinds !== undefined && isSeq(list)) {
      for (const item of list.items) {
        const kind = String(scalarOf(item));
        if (!entityKinds.has(kind)) {
          report.warning(
            'entity-kind',
            `the entity kind "${kind}" is not declared by a built-in entity type`,
            report.at(item),
          );
        }
      }
    }
  }

  if (controlPair !== undefined) {
    const control = scalarOf(controlPair.value);
    if (
      typeof control !== 'string' ||
      !(CONTROL_TYPES as readonly string[]).includes(control)
    ) {
      report.error(
        'hint-consistency',
        `"${name}": x-scriba-control must be one of ${CONTROL_TYPES.join(', ')}`,
        keyPos(report, controlPair),
      );
    } else {
      checkControlFit(
        report,
        schema,
        name,
        control,
        shape.type,
        xType,
        valuePos(report, controlPair),
      );
    }
  }
}

// A hinted control must fit the property (D5). A field of entity or style type takes its own picker.
function checkControlFit(
  report: Report,
  schema: YAMLMap,
  name: string,
  control: string,
  type: string | undefined,
  xType: string | undefined,
  pos: Pos,
): void {
  const numeric = type === 'integer' || type === 'number';
  const hasNumericRange =
    typeof scalarOf(pairOf(schema, 'minimum')?.value) === 'number' &&
    typeof scalarOf(pairOf(schema, 'maximum')?.value) === 'number';
  let fits: boolean;
  let needs: string;
  switch (control) {
    case 'slider':
      fits = numeric && hasNumericRange;
      needs = 'an integer or number with a numeric minimum and maximum';
      break;
    case 'number':
      fits = numeric;
      needs = 'an integer or number';
      break;
    case 'toggle':
      fits = type === 'boolean';
      needs = 'a boolean';
      break;
    case 'select':
      fits = pairOf(schema, 'enum') !== undefined;
      needs = 'an enum';
      break;
    case 'text':
    case 'textarea':
      fits = type === 'string';
      needs = 'a string';
      break;
    case 'entity-picker':
      fits = xType === 'entity';
      needs = 'an entity field';
      break;
    case 'style-picker':
      fits = xType === 'style';
      needs = 'a style field';
      break;
    default:
      return;
  }
  if (!fits) {
    report.error(
      'control-fit',
      `"${name}" has x-scriba-control ${control}, which needs ${needs}`,
      pos,
    );
    return;
  }
  if (
    (xType === 'entity' && control !== 'entity-picker') ||
    (xType === 'style' && control !== 'style-picker')
  ) {
    report.error(
      'control-fit',
      `"${name}" is an ${xType} field and takes its own picker`,
      pos,
    );
  }
}

// What the template rules need of the inputs: each input name with its x-scriba-type, and the required items.
interface InputFacts {
  types: Map<string, string | undefined>;
  required: Array<{ name: string; pos: Pos }>;
}

// One tool property: the keywords, the hints, the reserved and extension names.
function checkProperty(
  report: Report,
  pair: Pair,
  facts: InputFacts,
  entityKinds: ReadonlySet<string> | undefined,
): void {
  const name = keyOf(pair);
  if (name === OUTPUT_PORT_KEY) {
    report.error(
      'reserved-output',
      `"${OUTPUT_PORT_KEY}" is reserved and cannot name an input`,
      keyPos(report, pair),
    );
  }
  if (name.startsWith('x-')) {
    report.error(
      'property-name',
      `the property name "${name}" starts with x-; the name would reach the function schema`,
      keyPos(report, pair),
    );
  }
  const schema = pair.value;
  if (!isMap(schema)) {
    report.error(
      'inputs-subset',
      `the property "${name}" must be a mapping`,
      valuePos(report, pair),
    );
    facts.types.set(name, undefined);
    return;
  }
  checkKeywords(report, schema, name, 'inputs-subset');
  checkToolHints(report, schema, name, shapeOf(schema), entityKinds);
  facts.types.set(name, stringOf(pairOf(schema, 'x-scriba-type')?.value));
}

function checkRequired(report: Report, pair: Pair, facts: InputFacts): void {
  const list = pair.value;
  if (
    !isSeq(list) ||
    !list.items.every((item) => typeof scalarOf(item) === 'string')
  ) {
    report.error(
      'inputs-subset',
      'required must be a list of property names',
      valuePos(report, pair),
    );
    return;
  }
  for (const item of list.items) {
    facts.required.push({
      name: String(scalarOf(item)),
      pos: report.at(item),
    });
  }
}

// The root of inputs: the subset keywords, the root hints, the properties and their hints (D3, D4, D5).
function checkInputs(
  report: Report,
  inputs: YAMLMap,
  entityKinds: ReadonlySet<string> | undefined,
): InputFacts {
  const facts: InputFacts = { types: new Map(), required: [] };
  for (const pair of pairsOf(inputs)) {
    const key = keyOf(pair);
    if (key.startsWith('x-')) {
      checkRootExtension(report, pair);
      continue;
    }
    if (!ROOT_KEYWORDS.includes(key)) {
      report.error(
        'inputs-subset',
        `the inputs keyword "${key}" is outside the inputs subset`,
        keyPos(report, pair),
      );
      continue;
    }
    if (key === 'type') {
      if (scalarOf(pair.value) !== 'object') {
        report.error(
          'inputs-subset',
          'the root type of inputs must be "object"',
          valuePos(report, pair),
        );
      }
    } else if (key === 'required') {
      checkRequired(report, pair, facts);
    } else if (key === 'additionalProperties') {
      const value = scalarOf(pair.value);
      if (typeof value !== 'boolean') {
        report.error(
          'inputs-subset',
          'additionalProperties must be true or false',
          valuePos(report, pair),
        );
      } else if (value) {
        report.warning(
          'additional-properties',
          'additionalProperties is true, so the tool takes arguments it does not list',
          valuePos(report, pair),
        );
      }
    } else if (key === 'properties') {
      if (!isEmpty(pair.value) && !isMap(pair.value)) {
        report.error(
          'inputs-subset',
          'properties must be a mapping',
          valuePos(report, pair),
        );
      }
      for (const property of pairsOf(pair.value)) {
        checkProperty(report, property, facts, entityKinds);
      }
    }
  }
  if (pairOf(inputs, 'type') === undefined) {
    report.error(
      'inputs-subset',
      'inputs must have type: object',
      report.at(inputs),
    );
  }
  return facts;
}

// The column of a template position, and the suffix that names the template position when the source cannot map it.
interface Mapped {
  pos: Pos;
  suffix: string;
}

// The indentation of the first non-blank line after `keyLine` (1-based), which is the first line of a block scalar.
function contentIndent(source: string, keyLine: number): number {
  for (const text of source.split('\n').slice(keyLine)) {
    if (text.trim() !== '') return text.length - text.trimStart().length;
  }
  return 0;
}

// Maps a template position to the YAML source (D7). A literal block scalar maps exactly: the template line counts
// from the line after the key, and the column from the indentation of the content. Any other style gives the start
// of the value, and the message carries the template position.
function templateMapper(
  report: Report,
  source: string,
  pair: Pair,
): (line: number, column: number) => Mapped {
  const value = pair.value;
  if (isScalar(value) && value.type === 'BLOCK_LITERAL') {
    const keyLine = report.at(pair.key).line;
    const indent = contentIndent(source, keyLine);
    return (line, column) => ({
      pos: { line: keyLine + line, column: indent + column },
      suffix: '',
    });
  }
  const start = isEmpty(value) ? report.at(pair.key) : report.at(value);
  return (line, column) => ({
    pos: start,
    suffix: ` (template line ${line}, column ${column})`,
  });
}

// The prompt: the template syntax, each reference against the inputs, and the required inputs that no reference names.
function checkTemplate(
  report: Report,
  source: string,
  pair: Pair,
  prompt: string,
  facts: InputFacts,
): void {
  const mapOf = templateMapper(report, source, pair);
  const parsed = parseTemplate(prompt);
  if (!parsed.ok) {
    for (const diagnostic of parsed.diagnostics) {
      const at = mapOf(diagnostic.line, diagnostic.column);
      report.error(
        'template-syntax',
        `${diagnostic.message}${at.suffix}`,
        at.pos,
      );
    }
    return;
  }
  const references = templateVariables(parsed.ast);
  for (const reference of references) {
    const at = mapOf(reference.line, reference.column);
    if (!facts.types.has(reference.field)) {
      report.error(
        'template-variable',
        `the prompt names "${reference.field}", which is not an input${at.suffix}`,
        at.pos,
      );
      continue;
    }
    if (reference.usage === 'entity') {
      const type = facts.types.get(reference.field);
      if (type !== 'entity' && type !== 'style') {
        report.error(
          'template-entity',
          `the entity helper needs an entity or style input, and "${reference.field}" is not one${at.suffix}`,
          at.pos,
        );
      }
    }
  }
  const used = new Set(references.map((reference) => reference.field));
  for (const required of facts.required) {
    if (!used.has(required.name)) {
      report.warning(
        'template-unused',
        `the required input "${required.name}" is not used by the prompt`,
        required.pos,
      );
    }
  }
}

// An entity field's hints: only x-scriba-type entity and x-scriba-entity-kinds (D8).
function checkEntityHints(report: Report, schema: YAMLMap, name: string): void {
  for (const pair of pairsOf(schema)) {
    const key = keyOf(pair);
    if (!key.startsWith('x-')) continue;
    const value = pair.value;
    const allowed =
      (key === 'x-scriba-type' && scalarOf(value) === 'entity') ||
      (key === 'x-scriba-entity-kinds' &&
        isSeq(value) &&
        value.items.every((item) => typeof scalarOf(item) === 'string'));
    if (!allowed) {
      report.error(
        'entity-hint',
        `"${name}" has the hint "${key}", which an entity field does not take`,
        keyPos(report, pair),
      );
    }
  }
}

// A list of objects of scalars: additionalProperties false, scalar properties, and an optional required list (D8).
function checkEntityItems(report: Report, schema: YAMLMap, name: string): void {
  const itemsPair = pairOf(schema, 'items');
  const items = itemsPair?.value;
  if (!isMap(items)) {
    report.error(
      'entity-field',
      `the items of "${name}" must be a mapping`,
      itemsPair === undefined ? report.at(schema) : valuePos(report, itemsPair),
    );
    return;
  }
  checkEntityHints(report, items, `${name}[]`);
  for (const pair of pairsOf(items)) {
    const key = keyOf(pair);
    if (key.startsWith('x-')) continue;
    if (
      ![
        'type',
        'properties',
        'required',
        'additionalProperties',
        'title',
        'description',
      ].includes(key)
    ) {
      report.error(
        'entity-field',
        `the items of "${name}" have the keyword "${key}", which is outside the subset`,
        keyPos(report, pair),
      );
    }
  }
  const additional = pairOf(items, 'additionalProperties');
  if (additional === undefined || scalarOf(additional.value) !== false) {
    report.error(
      'entity-field',
      `the items of "${name}" must declare additionalProperties: false`,
      additional === undefined
        ? report.at(items)
        : valuePos(report, additional),
    );
  }
  const required = pairOf(items, 'required');
  if (
    required !== undefined &&
    !(
      isSeq(required.value) &&
      required.value.items.every((item) => typeof scalarOf(item) === 'string')
    )
  ) {
    report.error(
      'entity-field',
      `the items of "${name}" have a required that is not a list of names`,
      valuePos(report, required),
    );
  }
  const properties = pairOf(items, 'properties');
  if (properties === undefined) return;
  if (!isMap(properties.value)) {
    report.error(
      'entity-field',
      `the items of "${name}" must list their properties in a mapping`,
      valuePos(report, properties),
    );
    return;
  }
  for (const property of pairsOf(properties.value)) {
    const propertyName = `${name}.${keyOf(property)}`;
    const schemaOfProperty = property.value;
    if (!isMap(schemaOfProperty)) {
      report.error(
        'entity-field',
        `the item property "${propertyName}" must be a scalar`,
        keyPos(report, property),
      );
      continue;
    }
    checkEntityHints(report, schemaOfProperty, propertyName);
    const type = stringOf(pairOf(schemaOfProperty, 'type')?.value);
    if (type === undefined || !SCALAR_TYPES.includes(type)) {
      report.error(
        'entity-field',
        `the item property "${propertyName}" must be a scalar; an entity type nests one level only`,
        keyPos(report, property),
      );
      continue;
    }
    checkKeywords(report, schemaOfProperty, propertyName, 'entity-field');
  }
}

// One entity field: a nested object is refused, a list of objects takes the item rules, and the rest the scalar rules.
function checkEntityField(report: Report, pair: Pair): void {
  const name = keyOf(pair);
  const schema = pair.value;
  if (!isMap(schema)) {
    report.error(
      'entity-field',
      `the field "${name}" must be an object`,
      keyPos(report, pair),
    );
    return;
  }
  checkEntityHints(report, schema, name);
  const shape = shapeOf(schema);
  if (shape.type === 'object') {
    report.error(
      'entity-field',
      `"${name}" is a nested object; an entity field is a scalar, a list of scalars or a list of objects of scalars`,
      keyPos(report, pair),
    );
    return;
  }
  if (shape.type === 'array' && shape.itemType === 'object') {
    checkEntityItems(report, schema, name);
    return;
  }
  checkKeywords(report, schema, name, 'entity-field');
}

// The fields of an entity type: an object schema of the entity rules, with the Ajv compile as the last check (D8).
function checkFields(
  report: Report,
  pair: Pair,
  rawFields: Record<string, unknown>,
): void {
  const fields = pair.value as YAMLMap;
  const typePair = pairOf(fields, 'type');
  if (typePair === undefined || scalarOf(typePair.value) !== 'object') {
    report.error(
      'entity-field',
      'fields must be an object schema (type: object)',
      typePair === undefined
        ? valuePos(report, pair)
        : valuePos(report, typePair),
    );
  }
  for (const field of pairsOf(fields)) {
    const key = keyOf(field);
    if (key.startsWith('x-')) continue;
    if (!ROOT_KEYWORDS.includes(key)) {
      report.error(
        'entity-field',
        `fields has the keyword "${key}", which is outside the subset`,
        keyPos(report, field),
      );
    }
  }
  const required = pairOf(fields, 'required');
  if (
    required !== undefined &&
    !(
      isSeq(required.value) &&
      required.value.items.every((item) => typeof scalarOf(item) === 'string')
    )
  ) {
    report.error(
      'entity-field',
      'fields.required must be a list of names',
      valuePos(report, required),
    );
  }
  const properties = pairOf(fields, 'properties');
  if (properties !== undefined) {
    if (isMap(properties.value)) {
      for (const property of pairsOf(properties.value)) {
        checkEntityField(report, property);
      }
    } else if (!isEmpty(properties.value)) {
      report.error(
        'entity-field',
        'fields.properties must be a mapping',
        valuePos(report, properties),
      );
    }
  }
  if (report.has(['entity-field'])) return;
  try {
    new Ajv({ allErrors: true, strict: true }).compile({
      ...(stripExtensions(rawFields) as Record<string, unknown>),
      type: 'object',
      additionalProperties: true,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    report.error(
      'entity-field',
      `the fields do not compile in Ajv: ${reason}`,
      valuePos(report, pair),
    );
  }
}

// Lints one tool spec. The rules run on the YAML source; the spec and the views come from the zod envelope and the
// emitter. The compile check runs only when no rule of GATE_RULES failed (step 4 of the plan).
export function lintToolSource(
  source: string,
  options: ToolLintOptions = {},
): ToolLint {
  const lines = new LineCounter();
  const doc = parseDocument(source, { lineCounter: lines });
  const report = new Report(lines);
  if (doc.errors.length > 0) {
    reportYamlErrors(report, doc.errors);
    return { lint: report.result(), spec: null, views: null };
  }
  const root = doc.contents;
  if (!isMap(root)) {
    report.error(
      'envelope',
      'the file must hold a YAML mapping of tool fields',
      report.at(root),
    );
    return { lint: report.result(), spec: null, views: null };
  }
  const raw = doc.toJS() as Record<string, unknown>;

  checkVersion(report, root, raw, TOOL_SPEC_SCHEMA_VERSION);
  const parsed = toolSpecSchema.safeParse(raw);
  if (!parsed.success) {
    envelopeIssues(report, root, parsed.error.issues, toolRuleOf);
  }
  if (options.name !== undefined) {
    checkFileName(
      report,
      root,
      'name',
      raw.name,
      TOOL_NAME_PATTERN,
      options.name,
    );
  }

  const inputsPair = pairOf(root, 'inputs');
  let facts: InputFacts = { types: new Map(), required: [] };
  if (inputsPair === undefined) {
    report.error('inputs-subset', 'inputs is missing', report.at(root));
  } else if (isMap(inputsPair.value)) {
    facts = checkInputs(report, inputsPair.value, options.entityKinds);
  } else {
    report.error(
      'inputs-subset',
      'inputs must be a mapping',
      valuePos(report, inputsPair),
    );
  }

  const promptPair = pairOf(root, 'prompt');
  if (promptPair !== undefined && typeof raw.prompt === 'string') {
    checkTemplate(report, source, promptPair, raw.prompt, facts);
  }

  const spec = parsed.success ? parsed.data : null;
  let views: ToolViews | null = null;
  if (spec !== null && !report.has(GATE_RULES)) {
    const inputsPos =
      inputsPair === undefined ? report.at(root) : valuePos(report, inputsPair);
    try {
      compileTool(spec, createAjv());
      if (!report.hasErrors()) views = emitViews(spec);
    } catch (error) {
      if (!(error instanceof ToolSpecError)) throw error;
      report.error('inputs-compile', error.message, inputsPos);
    }
  }
  return { lint: report.result(), spec, views };
}

// Lints one entity-type file. Its envelope rules are those of tools, with `kind` for `name`, and its fields follow D8.
export function lintEntityTypeSource(
  source: string,
  options: { stem?: string } = {},
): LintResult {
  const lines = new LineCounter();
  const doc = parseDocument(source, { lineCounter: lines });
  const report = new Report(lines);
  if (doc.errors.length > 0) {
    reportYamlErrors(report, doc.errors);
    return report.result();
  }
  const root = doc.contents;
  if (!isMap(root)) {
    report.error(
      'envelope',
      'the file must hold a YAML mapping of entity-type fields',
      report.at(root),
    );
    return report.result();
  }
  const raw = doc.toJS() as Record<string, unknown>;

  checkVersion(report, root, raw, ENTITY_TYPE_SCHEMA_VERSION);
  const parsed = entityTypeSchema.safeParse(raw);
  if (!parsed.success) {
    envelopeIssues(report, root, parsed.error.issues, entityRuleOf);
  }
  if (options.stem !== undefined) {
    checkFileName(
      report,
      root,
      'kind',
      raw.kind,
      ENTITY_KIND_PATTERN,
      options.stem,
    );
  }
  const fieldsPair = pairOf(root, 'fields');
  if (
    fieldsPair !== undefined &&
    isMap(fieldsPair.value) &&
    isRecord(raw.fields)
  ) {
    checkFields(report, fieldsPair, raw.fields);
  }
  return report.result();
}

// The number of errors and warnings of a lint result.
export function countsOf(lint: LintResult): LintCounts {
  let errors = 0;
  let warnings = 0;
  for (const diagnostic of lint) {
    if (diagnostic.severity === 'error') errors += 1;
    else warnings += 1;
  }
  return { errors, warnings };
}

// The position of a top-level key of a YAML source, or 1:1 when the source has no such key.
export function topKeyPosition(source: string, key: string): Pos {
  const lines = new LineCounter();
  const doc = parseDocument(source, { lineCounter: lines });
  const pair = pairOf(doc.contents, key);
  return pair === undefined ? ORIGIN : positionOf(lines, pair.key);
}
