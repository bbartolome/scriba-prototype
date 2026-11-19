// Pure helpers of the manuscript writes (P5, P7, P8, P13). No I/O.
import {
  MANUSCRIPT_PARTS,
  MANUSCRIPT_PART_DEFAULT,
  MANUSCRIPT_STATUS_DEFAULT,
  type ManuscriptEntry,
  type ManuscriptPart,
  type ManuscriptStatus,
  type ManuscriptView,
  type OrderEntry,
} from '@bbartolome/scriba-contracts/compile-export';

// One manuscript file of a candidate order: its path, its part and its status.
export interface Row {
  path: string;
  part: ManuscriptPart;
  status: ManuscriptStatus;
}

// The paths of each part, in order.
export type PartLists = Record<ManuscriptPart, string[]>;

// The keys that a materialised entry writes itself; any other key of an entry is kept as it is (P7).
const KNOWN_KEYS = new Set(['path', 'status', 'part']);

// The paths of each part, in the order they are given (P5, P8).
export function partsOf(
  entries: Pick<ManuscriptEntry, 'path' | 'part'>[],
): PartLists {
  const lists: PartLists = { front: [], body: [], back: [] };
  for (const entry of entries) {
    lists[entry.part].push(entry.path);
  }
  return lists;
}

// Per part, the requested list holds the same paths as the current list (P5): a duplicate, a missing file, an
// extra path or a cross-part move makes the lists differ.
export function samePerPart(current: PartLists, requested: PartLists): boolean {
  return MANUSCRIPT_PARTS.every((part) =>
    sameOrder([...current[part]].sort(), [...requested[part]].sort()),
  );
}

// Moves one path to the end of the list of `part`, taking it out of the list it was in (P8).
export function movePart(
  lists: PartLists,
  path: string,
  part: ManuscriptPart,
): PartLists {
  const moved: PartLists = {
    front: lists.front.filter((item) => item !== path),
    body: lists.body.filter((item) => item !== path),
    back: lists.back.filter((item) => item !== path),
  };
  moved[part].push(path);
  return moved;
}

// The rows of a view, in its effective order.
export function rowsOf(entries: ManuscriptEntry[]): Row[] {
  return entries.map((entry) => ({
    path: entry.path,
    part: entry.part,
    status: entry.status,
  }));
}

// The rows of part lists, front then body then back, each with the status that `statusOf` gives its path.
export function rowsFromLists(
  lists: PartLists,
  statusOf: (path: string) => ManuscriptStatus,
): Row[] {
  return MANUSCRIPT_PARTS.flatMap((part) =>
    lists[part].map((path) => ({ path, part, status: statusOf(path) })),
  );
}

// The graph-ordered block of a view, in view order (P13).
export function blockOf(view: ManuscriptView): string[] {
  return view.entries
    .filter((entry) => entry.graphOrdered)
    .map((entry) => entry.path);
}

// Equal lists: the same paths in the same order.
export function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

// The current entries of the order field by path, for their unknown keys.
export function extrasOf(field: OrderEntry[]): Map<string, OrderEntry> {
  return new Map(field.map((entry) => [entry.path, entry]));
}

// The order field that the rows describe (P7): {path}, plus status when it is not the default, plus part when it
// is not the default, plus the unknown keys of the path's current entry. Defaults are never written.
export function materialise(
  rows: Row[],
  extras: Map<string, OrderEntry>,
): OrderEntry[] {
  return rows.map((row) => {
    const entry: Record<string, unknown> = { path: row.path };
    if (row.status !== MANUSCRIPT_STATUS_DEFAULT) entry.status = row.status;
    if (row.part !== MANUSCRIPT_PART_DEFAULT) entry.part = row.part;
    const kept = extras.get(row.path);
    if (kept !== undefined) {
      for (const [key, value] of Object.entries(kept)) {
        if (!KNOWN_KEYS.has(key)) entry[key] = value;
      }
    }
    return entry as OrderEntry;
  });
}
