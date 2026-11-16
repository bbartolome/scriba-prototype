import { graphFileSchema } from '@bbartolome/scriba-contracts/graph-runner';
import type { OutputKind } from '@bbartolome/scriba-contracts/tool-registry';
import type { ToolIssue } from './tool-types';

// The routing of a narrative output by its kind (AGL-13). A draft, an entity and a graph go to a folder of the
// project; the folder is the kind's own. A check and a claims output give no file. The module holds no Nest code.

// The folder a kind's output is written to, or undefined when the kind writes no file.
export function routedFolder(kind: OutputKind): string | undefined {
  switch (kind) {
    case 'draft':
      return 'drafts';
    case 'entity':
      return 'entities';
    case 'graph':
      return 'graphs';
    default:
      return undefined;
  }
}

// The file stem of a graph's default name (AGL-13 P10): lower case, each run of characters outside a-z0-9 is one
// hyphen, no hyphen at either end. `graph` when nothing is left, so the result matches the graph id pattern.
export function slugOf(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug === '' ? 'graph' : slug;
}

// A JSON Pointer segment: '~' is written '~0' and '/' is written '~1'.
function segmentOf(key: PropertyKey): string {
  return String(key).replace(/~/g, '~0').replace(/\//g, '~1');
}

// The issues of a graph text against the Graph runner's file schema (AGL-13 P9). A text that is not JSON is one
// issue. Each schema issue is one issue at /graph plus its path, so the model reads `graph/nodes/0/id: <message>`.
export function checkGraph(content: string): ToolIssue[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return [{ path: '/graph', message: `is not valid JSON: ${reason}` }];
  }
  const checked = graphFileSchema.safeParse(parsed);
  if (checked.success) return [];
  return checked.error.issues.map((issue) => ({
    path: ['/graph', ...issue.path.map(segmentOf)].join('/'),
    message: issue.message,
  }));
}

// The time of a default name, in UTC: yyyymmdd-hhmm. One call reads the clock once, from the date it is given.
export function stampOf(now: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const date = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`;
  return `${date}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
}

// The path with `-n` before its extension (drafts/cold_open-20261116-0930-2.md). A path with no extension gets it at
// the end.
export function withSuffix(path: string, n: number): string {
  const dot = path.lastIndexOf('.');
  const slash = path.lastIndexOf('/');
  if (dot <= slash) return `${path}-${n}`;
  return `${path.slice(0, dot)}-${n}${path.slice(dot)}`;
}
