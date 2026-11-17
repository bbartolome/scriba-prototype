import { GRAPH_SCHEMA_VERSION } from '@bbartolome/scriba-contracts/graph-runner';

// Pure helpers of the graph files. No I/O here.

// The id of a graph named `name` (P6): lower case, each run of characters outside a-z0-9 is one hyphen, no hyphen at
// either end, and `graph` when nothing is left. It copies the rule of agent-loop's output-routing.ts (AGL-13 P10);
// the boundaries rule forbids importing it.
export function slugOf(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug === '' ? 'graph' : slug;
}

// The n-th id of a slug (P6): `<slug>-2`, `<slug>-3`, and so on.
export function suffixedId(slug: string, n: number): string {
  return `${slug}-${n}`;
}

// The numeric schemaVersion of a parsed value, or undefined when it has none (P5).
export function schemaVersionOf(value: unknown): number | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const version = (value as { schemaVersion?: unknown }).schemaVersion;
  return typeof version === 'number' ? version : undefined;
}

// True when a parsed value names a schema version above the one this build reads (S5).
export function isNewerVersion(value: unknown): boolean {
  const version = schemaVersionOf(value);
  return version !== undefined && version > GRAPH_SCHEMA_VERSION;
}

// The canonical text of a graph value (S11): two-space JSON and a final newline.
export function canonicalGraphText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
