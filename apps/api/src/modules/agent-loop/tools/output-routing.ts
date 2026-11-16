import type { OutputKind } from '@bbartolome/scriba-contracts/tool-registry';

// The routing of a narrative output by its kind (AGL-13). A draft and an entity go to a folder of the project; the
// folder is the kind's own. Every other kind has no folder here: a check and a claims output give no file. The
// module holds no Nest code.

// The folder a kind's output is written to, or undefined when the kind writes no file.
export function routedFolder(kind: OutputKind): string | undefined {
  switch (kind) {
    case 'draft':
      return 'drafts';
    case 'entity':
      return 'entities';
    default:
      return undefined;
  }
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
