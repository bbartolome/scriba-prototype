import type { ErrorObject } from 'ajv';
import type { ToolArgumentSchema, ToolIssue } from './tool-types';

// The one renderer of readable tool errors (D3). Built-in issues come from Ajv, and registry or handler issues come
// as {path, message} already. Both end as the same lines: one per problem, then the expected arguments.

// The phrase for the type a value must have (S2). `type` is a JSON Schema type name.
const TYPE_PHRASES: Record<string, string> = {
  string: 'a string',
  boolean: 'a boolean',
  number: 'a number',
  integer: 'an integer',
  object: 'an object',
  array: 'an array',
};

// A key in a JSON Pointer: '~' is written '~0' and '/' is written '~1' (RFC 6901).
function escapeSegment(key: string): string {
  return key.replace(/~/g, '~0').replace(/\//g, '~1');
}

// The name of an argument as the model sees it (S3): the leading slash is dropped, and ~1 and ~0 are unescaped.
// The empty pointer is the whole argument set, so it reads as `arguments`.
export function displayPath(pointer: string): string {
  if (pointer === '') return 'arguments';
  return pointer
    .slice(1)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
    .join('/');
}

// The issue of one Ajv error (S2). A missing or extra property adds its name to the pointer of its parent.
function issueOf(error: ErrorObject): ToolIssue {
  const params = error.params as Record<string, unknown>;
  switch (error.keyword) {
    case 'required':
      return {
        path: `${error.instancePath}/${escapeSegment(String(params.missingProperty))}`,
        message: 'is required',
      };
    case 'additionalProperties':
      return {
        path: `${error.instancePath}/${escapeSegment(String(params.additionalProperty))}`,
        message: 'is not an argument of this tool',
      };
    case 'type': {
      const type = String(params.type);
      return {
        path: error.instancePath,
        message: `must be ${TYPE_PHRASES[type] ?? `a ${type}`}`,
      };
    }
    default:
      return {
        path: error.instancePath,
        message: error.message ?? 'is not valid',
      };
  }
}

// The issues of a failed Ajv validation, in the order Ajv reports them.
export function issuesFromAjv(
  errors: ErrorObject[] | null | undefined,
): ToolIssue[] {
  return (errors ?? []).map(issueOf);
}

// One line per issue: `<argument path>: <what is wrong>` (D3).
export function issueLines(issues: ToolIssue[]): string[] {
  return issues.map((issue) => `${displayPath(issue.path)}: ${issue.message}`);
}

// The last line of an invalid answer: the expected arguments in schema property order (S5). A tool with no
// properties says `none`.
export function expectedSummary(
  name: string,
  schema: ToolArgumentSchema,
): string {
  const parts = Object.entries(schema.properties).map(
    ([key, property]) =>
      `${key} (${property.type}, ${schema.required.includes(key) ? 'required' : 'optional'})`,
  );
  const expected = parts.length === 0 ? 'none' : parts.join(', ');
  return `Expected arguments for ${name}: ${expected}.`;
}

// The readable answer of an invalid call: the problem lines, the expected summary, and the withdrawal sentence on
// the third answer (S6).
export function readableMessage(
  issues: ToolIssue[],
  summary: string,
  notice?: string,
): string {
  const lines = [...issueLines(issues), summary];
  if (notice !== undefined) lines.push(notice);
  return lines.join('\n');
}
