// The registry's own template language: a parser that reports positions, the variables a template names,
// and a renderer. Rendering takes validated arguments, caller-supplied entities and the catalogue; it never
// reads project files, calls the network or runs code. The only import is a type import.
import type {
  PortDescriptor,
  ResolvedEntity,
  ToolArguments,
} from '@bbartolome/scriba-contracts/tool-registry';

// Positions are 1-based. Lines split on newline only; columns count UTF-16 code units.
export type TemplatePosition = { line: number; column: number };

export type TemplateDiagnostic = {
  message: string;
  line: number;
  column: number;
};

export type TemplateEntityId =
  | { readonly type: 'field'; readonly name: string }
  | { readonly type: 'this'; readonly of: string };

export type TemplateNode =
  | { readonly type: 'text'; readonly text: string }
  | {
      readonly type: 'field';
      readonly name: string;
      readonly pos: TemplatePosition;
    }
  | {
      readonly type: 'this';
      readonly of: string;
      readonly pos: TemplatePosition;
    }
  | {
      readonly type: 'index';
      readonly of: string;
      readonly pos: TemplatePosition;
    }
  | { readonly type: 'catalog' }
  | {
      readonly type: 'entity';
      readonly id: TemplateEntityId;
      readonly pos: TemplatePosition;
    }
  | {
      readonly type: 'each';
      readonly field: string;
      readonly body: readonly TemplateNode[];
      readonly pos: TemplatePosition;
    }
  | {
      readonly type: 'if';
      readonly field: string;
      readonly then: readonly TemplateNode[];
      readonly otherwise: readonly TemplateNode[] | null;
      readonly pos: TemplatePosition;
    };

export type TemplateAst = { readonly nodes: readonly TemplateNode[] };

export type ParseResult =
  | { ok: true; ast: TemplateAst }
  | { ok: false; diagnostics: TemplateDiagnostic[] };

// One reference to a field, in document order. `usage` says how the template uses it.
export type TemplateReference = {
  field: string;
  usage: 'value' | 'each' | 'if' | 'entity';
  line: number;
  column: number;
};

// A tool as the catalogue offers it to the prompt: its name, one-line description and ports.
export interface ToolCatalogEntry {
  readonly name: string;
  readonly description: string;
  readonly ports: PortDescriptor;
}

export interface RenderInput {
  readonly args: ToolArguments;
  readonly entities: readonly ResolvedEntity[];
  readonly toolCatalog: readonly ToolCatalogEntry[];
}

export class TemplateRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateRenderError';
  }
}

type BlockName = 'each' | 'if';

type Tag =
  | { kind: 'comment' }
  | { kind: 'field'; name: string }
  | { kind: 'this' }
  | { kind: 'index' }
  | { kind: 'catalog' }
  | { kind: 'entity'; id: { kind: 'field'; name: string } | { kind: 'this' } }
  | { kind: 'open'; block: BlockName; field: string }
  | { kind: 'else' }
  | { kind: 'close'; block: BlockName };

interface OpenBlock {
  readonly block: BlockName;
  readonly field: string;
  readonly start: number;
  readonly body: TemplateNode[];
  otherwise: TemplateNode[] | null;
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const RESERVED_WORDS: ReadonlySet<string> = new Set([
  'this',
  'each',
  'if',
  'else',
  'entity',
  'toolCatalog',
]);
// Never looked up, so no prototype member is read for a tag that names one.
const BLOCKED_NAMES: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

function isFieldName(text: string): boolean {
  return IDENTIFIER.test(text) && !RESERVED_WORDS.has(text);
}

function describeBadName(text: string): string {
  if (/[./]/.test(text)) return `paths are not supported: ${text}`;
  if (/[ \t]/.test(text))
    return `helpers and extra arguments are not supported: ${text}`;
  if (RESERVED_WORDS.has(text))
    return `${text} is a reserved word, not a field name`;
  return `not a valid field name: ${text} (letters, digits and _, not starting with a digit)`;
}

function locate(
  lineStarts: readonly number[],
  index: number,
): TemplatePosition {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (lineStarts[middle] <= index) low = middle;
    else high = middle - 1;
  }
  return { line: low + 1, column: index - lineStarts[low] + 1 };
}

// A block tag or a comment that is alone on its line (spaces and tabs around it) takes the whole line with it.
// Returns the index just after the line break it consumes, or null when the tag shares its line.
function standaloneEnd(
  source: string,
  start: number,
  end: number,
): number | null {
  const lineStart = source.lastIndexOf('\n', start - 1) + 1;
  if (!/^[ \t]*$/.test(source.slice(lineStart, start))) return null;
  let next = end;
  while (source.charAt(next) === ' ' || source.charAt(next) === '\t') next += 1;
  if (next === source.length) return next;
  return source.charAt(next) === '\n' ? next + 1 : null;
}

function isBlockTag(tag: Tag): boolean {
  return (
    tag.kind === 'open' ||
    tag.kind === 'else' ||
    tag.kind === 'close' ||
    tag.kind === 'comment'
  );
}

function innermostEach(open: readonly OpenBlock[]): OpenBlock | undefined {
  for (let index = open.length - 1; index >= 0; index--) {
    const block = open[index];
    if (block.block === 'each') return block;
  }
  return undefined;
}

function classifyOpen(
  rest: string,
  report: (message: string) => void,
): Tag | null {
  const match = /^([^ \t]*)[ \t]*([\s\S]*)$/.exec(rest);
  const name = match?.[1] ?? '';
  const argument = match?.[2] ?? '';
  if (name !== 'each' && name !== 'if') {
    report(
      `block {{#${name}}} is not supported: only {{#each}} and {{#if}} are`,
    );
    return null;
  }
  if (argument === '') {
    report(`{{#${name}}} needs a field name`);
    return { kind: 'open', block: name, field: '' };
  }
  if (!isFieldName(argument)) {
    report(`{{#${name}}} needs one field name: ${describeBadName(argument)}`);
    return { kind: 'open', block: name, field: '' };
  }
  return { kind: 'open', block: name, field: argument };
}

function classifyClose(
  rest: string,
  report: (message: string) => void,
): Tag | null {
  if (rest === 'each' || rest === 'if') return { kind: 'close', block: rest };
  report(
    `closing tag {{/${rest}}} is not supported: only {{/each}} and {{/if}}`,
  );
  return null;
}

// Reads the text between {{ and }}. Reports the reason and returns null when the tag is not part of the language.
function classify(body: string, report: (message: string) => void): Tag | null {
  const text = body.replace(/^[ \t]+|[ \t]+$/g, '');
  if (text === '') {
    report(
      'empty tag: write a field name, this, entity, toolCatalog or a block',
    );
    return null;
  }
  const first = text.charAt(0);
  if (first === '{') {
    report(
      'triple stash {{{ is not supported: use {{field}}, values are never escaped',
    );
    return null;
  }
  if (first === '&') {
    report('unescaped {{& }} is not supported: use {{field}}');
    return null;
  }
  if (first === '~') {
    report('whitespace control {{~ }} is not supported');
    return null;
  }
  if (first === '^') {
    report('inverse blocks {{^ }} are not supported');
    return null;
  }
  if (first === '>') {
    report('partials {{> }} are not supported');
    return null;
  }
  if (first === '!') {
    report('a comment must start with {{!-- and end with --}}');
    return null;
  }
  if (first === '#') return classifyOpen(text.slice(1), report);
  if (first === '/') return classifyClose(text.slice(1), report);
  if (text === '@index') return { kind: 'index' };
  if (first === '@') {
    report('only {{@index}} is supported among the data variables');
    return null;
  }
  if (text === 'this') return { kind: 'this' };
  if (text === 'toolCatalog') return { kind: 'catalog' };
  if (text === 'else') return { kind: 'else' };
  if (text === 'entity') {
    report(
      '{{entity}} needs an id: write {{entity id}}, or {{entity this}} inside {{#each}}',
    );
    return null;
  }
  const entity = /^entity[ \t]+([\s\S]*)$/.exec(text);
  if (entity !== null) {
    const id = entity[1];
    if (id === 'this') return { kind: 'entity', id: { kind: 'this' } };
    if (isFieldName(id))
      return { kind: 'entity', id: { kind: 'field', name: id } };
    report(`{{entity}} needs one id: ${describeBadName(id)}`);
    return null;
  }
  if (isFieldName(text)) return { kind: 'field', name: text };
  report(describeBadName(text));
  return null;
}

export function parseTemplate(source: string): ParseResult {
  const lineStarts = [0];
  for (let index = 0; index < source.length; index++) {
    if (source.charAt(index) === '\n') lineStarts.push(index + 1);
  }
  const diagnostics: TemplateDiagnostic[] = [];
  const report = (index: number, message: string): void => {
    diagnostics.push({ message, ...locate(lineStarts, index) });
  };

  const root: TemplateNode[] = [];
  const open: OpenBlock[] = [];
  const current = (): TemplateNode[] => {
    const top = open.at(-1);
    if (top === undefined) return root;
    return top.otherwise ?? top.body;
  };

  // Text since the last tag. It is pushed into the current branch before the next tag takes effect.
  let pending = '';
  const flush = (): void => {
    if (pending !== '') current().push({ type: 'text', text: pending });
    pending = '';
  };

  const apply = (tag: Tag, start: number): void => {
    const pos = locate(lineStarts, start);
    switch (tag.kind) {
      case 'comment':
        return;
      case 'field':
        current().push({ type: 'field', name: tag.name, pos });
        return;
      case 'catalog':
        current().push({ type: 'catalog' });
        return;
      case 'this': {
        const block = innermostEach(open);
        if (block === undefined) {
          report(start, '{{this}} is only allowed inside {{#each}}');
          return;
        }
        current().push({ type: 'this', of: block.field, pos });
        return;
      }
      case 'index': {
        const block = innermostEach(open);
        if (block === undefined) {
          report(start, '{{@index}} is only allowed inside {{#each}}');
          return;
        }
        current().push({ type: 'index', of: block.field, pos });
        return;
      }
      case 'entity': {
        if (tag.id.kind === 'this') {
          const block = innermostEach(open);
          if (block === undefined) {
            report(start, '{{entity this}} is only allowed inside {{#each}}');
            return;
          }
          current().push({
            type: 'entity',
            id: { type: 'this', of: block.field },
            pos,
          });
          return;
        }
        current().push({
          type: 'entity',
          id: { type: 'field', name: tag.id.name },
          pos,
        });
        return;
      }
      case 'open':
        open.push({
          block: tag.block,
          field: tag.field,
          start,
          body: [],
          otherwise: null,
        });
        return;
      case 'else': {
        const top = open.at(-1);
        if (top === undefined || top.block !== 'if') {
          report(start, '{{else}} is only allowed inside {{#if}}');
        } else if (top.otherwise !== null) {
          report(start, 'a second {{else}} in the same {{#if}}');
        } else {
          top.otherwise = [];
        }
        return;
      }
      case 'close': {
        const top = open.pop();
        if (top === undefined) {
          report(start, `{{/${tag.block}}} has no open block to close`);
          return;
        }
        if (top.block !== tag.block) {
          report(
            start,
            `{{/${tag.block}}} does not close the open {{#${top.block}}}`,
          );
        }
        const blockPos = locate(lineStarts, top.start);
        if (top.block === 'each') {
          current().push({
            type: 'each',
            field: top.field,
            body: top.body,
            pos: blockPos,
          });
        } else {
          current().push({
            type: 'if',
            field: top.field,
            then: top.body,
            otherwise: top.otherwise,
            pos: blockPos,
          });
        }
        return;
      }
    }
  };

  let cursor = 0;
  let ended = false;
  while (cursor < source.length) {
    const start = source.indexOf('{{', cursor);
    if (start === -1) {
      pending += source.slice(cursor);
      break;
    }
    pending += source.slice(cursor, start);
    const isComment = source.startsWith('{{!--', start);
    const close = isComment
      ? source.indexOf('--}}', start + 5)
      : source.indexOf('}}', start + 2);
    if (close === -1) {
      report(
        start,
        isComment
          ? 'unclosed comment: it needs --}} after its text'
          : 'unclosed tag: {{ needs }} to close it',
      );
      ended = true;
      break;
    }
    const end = close + (isComment ? 4 : 2);
    const tag: Tag | null = isComment
      ? { kind: 'comment' }
      : classify(source.slice(start + 2, close), (message) =>
          report(start, message),
        );
    if (tag === null) {
      flush();
      cursor = end;
      continue;
    }
    const after = isBlockTag(tag) ? standaloneEnd(source, start, end) : null;
    if (after !== null) pending = pending.replace(/[ \t]+$/, '');
    flush();
    apply(tag, start);
    cursor = after ?? end;
  }
  flush();

  // An unclosed tag ends the scan with that one diagnostic; open blocks are not reported on top of it.
  if (!ended) {
    for (const block of open) {
      report(
        block.start,
        `{{#${block.block}}} is not closed: add {{/${block.block}}}`,
      );
    }
  }
  diagnostics.sort((a, b) => a.line - b.line || a.column - b.column);
  if (diagnostics.length > 0) return { ok: false, diagnostics };
  return { ok: true, ast: { nodes: root } };
}

// The references of a template, one per tag occurrence, in document order.
export function templateVariables(ast: TemplateAst): TemplateReference[] {
  const references: TemplateReference[] = [];
  collectReferences(ast.nodes, references);
  return references;
}

function collectReferences(
  nodes: readonly TemplateNode[],
  out: TemplateReference[],
): void {
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
      case 'catalog':
        break;
      case 'field':
        out.push({ field: node.name, usage: 'value', ...node.pos });
        break;
      case 'this':
      case 'index':
        out.push({ field: node.of, usage: 'value', ...node.pos });
        break;
      case 'entity':
        out.push({
          field: node.id.type === 'this' ? node.id.of : node.id.name,
          usage: 'entity',
          ...node.pos,
        });
        break;
      case 'each':
        out.push({ field: node.field, usage: 'each', ...node.pos });
        collectReferences(node.body, out);
        break;
      case 'if':
        out.push({ field: node.field, usage: 'if', ...node.pos });
        collectReferences(node.then, out);
        if (node.otherwise !== null) collectReferences(node.otherwise, out);
        break;
    }
  }
}

// Arguments are read by own property only, and the blocked names are never read.
function lookupArg(args: ToolArguments, name: string): unknown {
  if (BLOCKED_NAMES.has(name) || !Object.hasOwn(args, name)) return undefined;
  return args[name];
}

function isScalar(value: unknown): value is string | number | boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

// A scalar as text, an array of scalars joined with ", ", and nothing for anything else. Nothing is escaped.
function scalarText(value: unknown): string {
  if (isScalar(value)) return String(value);
  if (Array.isArray(value) && value.every(isScalar)) {
    return value.map((item) => String(item)).join(', ');
  }
  return '';
}

function isTruthy(value: unknown): boolean {
  if (
    value === undefined ||
    value === null ||
    value === false ||
    value === 0 ||
    value === ''
  ) {
    return false;
  }
  if (typeof value === 'number' && Number.isNaN(value)) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

function formatCatalogEntry(entry: ToolCatalogEntry): string {
  const inputs =
    entry.ports.inputs.length === 0
      ? 'none'
      : entry.ports.inputs
          .map(
            (port) =>
              `${port.key} (${port.type}, ${port.list ? 'list' : 'single'}, ${port.required ? 'required' : 'optional'})`,
          )
          .join('; ');
  return `- ${entry.name}: ${entry.description} Output: ${entry.ports.output.kind}. Inputs: ${inputs}.`;
}

interface Frame {
  readonly item: unknown;
  readonly index: number;
}

function renderEntity(
  id: TemplateEntityId,
  input: RenderInput,
  entities: ReadonlyMap<string, ResolvedEntity>,
  frames: readonly Frame[],
): string {
  const label = id.type === 'this' ? 'this' : id.name;
  const ref =
    id.type === 'this' ? frames.at(-1)?.item : lookupArg(input.args, id.name);
  if (ref === undefined || ref === null || ref === '') return '';
  if (typeof ref !== 'string') {
    throw new TemplateRenderError(
      `{{entity ${label}}} needs a string id, got ${JSON.stringify(ref)}`,
    );
  }
  const entity = entities.get(ref);
  if (entity === undefined) {
    throw new TemplateRenderError(
      `{{entity ${label}}} names "${ref}", which is not among the entities passed to the render`,
    );
  }
  return `${entity.type} ${entity.ref} (${entity.path})\n${entity.content}`;
}

function renderNodes(
  nodes: readonly TemplateNode[],
  input: RenderInput,
  entities: ReadonlyMap<string, ResolvedEntity>,
  frames: readonly Frame[],
): string {
  let out = '';
  for (const node of nodes) out += renderNode(node, input, entities, frames);
  return out;
}

function renderNode(
  node: TemplateNode,
  input: RenderInput,
  entities: ReadonlyMap<string, ResolvedEntity>,
  frames: readonly Frame[],
): string {
  switch (node.type) {
    case 'text':
      return node.text;
    case 'field':
      return scalarText(lookupArg(input.args, node.name));
    case 'this':
      return scalarText(frames.at(-1)?.item);
    case 'index': {
      const frame = frames.at(-1);
      return frame === undefined ? '' : String(frame.index);
    }
    case 'catalog':
      return input.toolCatalog.map(formatCatalogEntry).join('\n');
    case 'entity':
      return renderEntity(node.id, input, entities, frames);
    case 'each': {
      const items = lookupArg(input.args, node.field);
      if (!Array.isArray(items)) return '';
      let out = '';
      for (let index = 0; index < items.length; index++) {
        const item: unknown = items[index];
        out += renderNodes(node.body, input, entities, [
          ...frames,
          { item, index },
        ]);
      }
      return out;
    }
    case 'if':
      if (isTruthy(lookupArg(input.args, node.field))) {
        return renderNodes(node.then, input, entities, frames);
      }
      return node.otherwise === null
        ? ''
        : renderNodes(node.otherwise, input, entities, frames);
  }
}

// Renders a parsed template. Throws TemplateRenderError when an entity id is not a string or names no passed entity.
export function renderTemplate(ast: TemplateAst, input: RenderInput): string {
  const entities = new Map<string, ResolvedEntity>();
  for (const entity of input.entities) entities.set(entity.ref, entity);
  return renderNodes(ast.nodes, input, entities, []);
}
