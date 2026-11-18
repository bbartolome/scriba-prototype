// The effective order of the manuscript (P9, P10, P14, P15, P20). Pure: no I/O.
import {
  MANUSCRIPT_PART_DEFAULT,
  MANUSCRIPT_STATUS_DEFAULT,
  type ManuscriptPart,
  type ManuscriptStatus,
  type OrderSource,
  type OrderEntry,
} from '@bbartolome/scriba-contracts/compile-export';

export interface EffectiveEntry {
  path: string;
  part: ManuscriptPart;
  status: ManuscriptStatus;
  graphOrdered: boolean;
  inOrderField: boolean;
}

export interface EffectiveOrder {
  // Front, then body, then back (P20).
  entries: EffectiveEntry[];
  orderSource: OrderSource;
  // The files on a cycle, sorted by path; empty when there is no cycle (P15).
  cycle: string[];
}

export interface EffectiveOrderInput {
  // Every current manuscript file, sorted by path.
  members: string[];
  // The valid order entries, in file order, first occurrence per path only, all naming a member.
  orderField: OrderEntry[];
  // Distinct [from, to] pairs of story-graph `order` edges, projected onto file paths.
  projectedPairs: [string, string][];
}

// Plain string order, as FilesService.list uses (P2).
function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// The files that can reach themselves through the pairs (P15).
function cycleFiles(nodes: string[], pairs: [string, string][]): string[] {
  const successors = new Map<string, string[]>();
  for (const [from, to] of pairs) {
    successors.set(from, [...(successors.get(from) ?? []), to]);
  }
  const onCycle: string[] = [];
  for (const start of nodes) {
    const seen = new Set<string>();
    const stack = [...(successors.get(start) ?? [])];
    while (stack.length > 0) {
      const next = stack.pop() as string;
      if (next === start) {
        onCycle.push(start);
        break;
      }
      if (seen.has(next)) continue;
      seen.add(next);
      stack.push(...(successors.get(next) ?? []));
    }
  }
  return onCycle.sort(byPath);
}

// Kahn's algorithm; among the ready files the smallest path goes first (P14). The pairs have no cycle.
function topological(nodes: string[], pairs: [string, string][]): string[] {
  const indegree = new Map<string, number>(nodes.map((node) => [node, 0]));
  for (const [, to] of pairs) {
    indegree.set(to, (indegree.get(to) ?? 0) + 1);
  }
  const ordered: string[] = [];
  const remaining = new Set(nodes);
  while (remaining.size > 0) {
    const ready = [...remaining]
      .filter((node) => indegree.get(node) === 0)
      .sort(byPath);
    const next = ready[0] as string;
    ordered.push(next);
    remaining.delete(next);
    for (const [from, to] of pairs) {
      if (from === next) indegree.set(to, (indegree.get(to) ?? 0) - 1);
    }
  }
  return ordered;
}

// The effective order (P9, P10, P14, P15, P20). Front and back follow the order field; the body is the
// graph-ordered block, then the other body files in order-field order and then alphabetically.
export function effectiveOrder(input: EffectiveOrderInput): EffectiveOrder {
  const { members, orderField, projectedPairs } = input;
  const listed = new Map(orderField.map((entry) => [entry.path, entry]));
  const partOf = (path: string): ManuscriptPart =>
    (listed.get(path)?.part ?? MANUSCRIPT_PART_DEFAULT) as ManuscriptPart;
  const statusOf = (path: string): ManuscriptStatus =>
    (listed.get(path)?.status ?? MANUSCRIPT_STATUS_DEFAULT) as ManuscriptStatus;
  const bodyMembers = members.filter((path) => partOf(path) === 'body');
  const bodySet = new Set(bodyMembers);
  const pairs = projectedPairs.filter(
    ([from, to]) => from !== to && bodySet.has(from) && bodySet.has(to),
  );

  const cycle = cycleFiles(bodyMembers, pairs);
  const usablePairs = cycle.length === 0 ? pairs : [];
  const graphBlock =
    usablePairs.length === 0
      ? []
      : topological([...new Set(usablePairs.flat())].sort(byPath), usablePairs);
  const graphSet = new Set(graphBlock);

  // Order-field order first, then the files without an entry, alphabetically (both members, so sorted).
  const fieldOrder = orderField.map((entry) => entry.path);
  const unlisted = members.filter((path) => !listed.has(path));
  const rest = [...fieldOrder, ...unlisted].filter(
    (path) => partOf(path) === 'body' && !graphSet.has(path),
  );

  const toEntry = (path: string): EffectiveEntry => ({
    path,
    part: partOf(path),
    status: statusOf(path),
    graphOrdered: graphSet.has(path),
    inOrderField: listed.has(path),
  });

  const front = fieldOrder.filter((path) => partOf(path) === 'front');
  const back = fieldOrder.filter((path) => partOf(path) === 'back');

  return {
    entries: [
      ...front.map(toEntry),
      ...[...graphBlock, ...rest].map(toEntry),
      ...back.map(toEntry),
    ],
    orderSource:
      graphBlock.length > 0
        ? 'graph+project'
        : orderField.length > 0
          ? 'project'
          : 'alphabetical',
    cycle,
  };
}
