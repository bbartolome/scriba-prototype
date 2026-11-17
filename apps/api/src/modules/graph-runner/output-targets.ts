import type { OutputKind } from '@bbartolome/scriba-contracts/tool-registry';

// The folder and the extension of each writable output kind (GRR-06 P3). `claims` and `check` have none.
const KIND_FILES: Partial<
  Record<OutputKind, { folder: string; extension: string; topLevel: boolean }>
> = {
  draft: { folder: 'drafts', extension: '.md', topLevel: true },
  entity: { folder: 'entities', extension: '.md', topLevel: false },
  graph: { folder: 'graphs', extension: '.json', topLevel: true },
};

// Whether a path fits the folder and the extension of its output kind (GRR-06 P3). A kind with no folder fits nothing.
export function fitsKindFolder(kind: OutputKind, path: string): boolean {
  const rule = KIND_FILES[kind];
  if (rule === undefined) return false;
  const segments = path.split('/');
  if (
    segments.some(
      (segment) => segment === '' || segment === '.' || segment === '..',
    )
  ) {
    return false;
  }
  if (segments[0] !== rule.folder) return false;
  if (rule.topLevel && segments.length !== 2) return false;
  if (!rule.topLevel && segments.length < 2) return false;
  const last = segments[segments.length - 1] ?? '';
  return last.length > rule.extension.length && last.endsWith(rule.extension);
}

// The generated path of an output without a target (GRR-06 P5): `<folder>/<graph-id>-<yyyymmdd-hhmm>.<ext>` from the
// run's start instant in UTC. A kind with no folder has no generated path.
export function generatedTarget(
  kind: OutputKind,
  graphId: string,
  now: Date,
): string | undefined {
  const rule = KIND_FILES[kind];
  if (rule === undefined) return undefined;
  const pad = (value: number): string => String(value).padStart(2, '0');
  const day = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`;
  const time = `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
  return `${rule.folder}/${graphId}-${day}-${time}${rule.extension}`;
}
