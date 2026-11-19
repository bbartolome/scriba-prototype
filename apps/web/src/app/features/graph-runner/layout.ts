import type { GraphFile } from '@bbartolome/scriba-contracts/graph-runner';
import { nodeIdOfPort } from './vflow-adapter';

// Arrange: a simple layered layout. It rewrites each node's `position` and nothing else.

/** The gap from the canvas edge to the first column or row. */
export const ARRANGE_MARGIN = 40;
/** The distance between two columns; wider than the 160 px minimum node width. */
export const ARRANGE_COLUMN = 320;
/** The distance between two rows of one column. */
export const ARRANGE_ROW = 200;

/** A link between two node ids: the edge's `from` and `to`, or a recipe wire's two nodes. */
interface Link {
  readonly from: string;
  readonly to: string;
}

/**
 * The story sequence: the nodes in the order their `order` edges give, where at each step the first ready node
 * in file order is placed next. When no node is ready (an `order` cycle), the rest follow in file order.
 */
function storySequence(
  ids: readonly string[],
  links: readonly Link[],
): string[] {
  const placed = new Set<string>();
  const sequence: string[] = [];
  while (sequence.length < ids.length) {
    const ready = ids.find(
      (id) =>
        !placed.has(id) &&
        links.every((link) => link.to !== id || placed.has(link.from)),
    );
    if (ready === undefined) {
      for (const id of ids) if (!placed.has(id)) sequence.push(id);
      break;
    }
    placed.add(ready);
    sequence.push(ready);
  }
  return sequence;
}

/**
 * The layer of each recipe node: its topological depth (the longest path to it). Kahn's algorithm with a
 * first-in first-out queue, started from the nodes with no incoming link in file order. The nodes it never
 * reaches (on a cycle) share one extra layer after the highest reached one.
 */
function recipeLayers(
  ids: readonly string[],
  links: readonly Link[],
): Map<string, number> {
  const layer = new Map<string, number>();
  const indegree = new Map<string, number>(ids.map((id) => [id, 0]));
  for (const link of links) {
    indegree.set(link.to, (indegree.get(link.to) ?? 0) + 1);
  }
  const queue = ids.filter((id) => indegree.get(id) === 0);
  for (const id of queue) layer.set(id, 0);
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head] as string;
    const depth = layer.get(current) ?? 0;
    for (const link of links) {
      if (link.from !== current) continue;
      layer.set(link.to, Math.max(layer.get(link.to) ?? 0, depth + 1));
      const left = (indegree.get(link.to) ?? 0) - 1;
      indegree.set(link.to, left);
      if (left === 0) queue.push(link.to);
    }
  }
  // Only the nodes the queue processed keep their depth; the rest are the cycle's.
  const processed = new Set(queue);
  const reached = Math.max(
    -1,
    ...[...processed].map((id) => layer.get(id) ?? 0),
  );
  for (const id of ids) {
    if (!processed.has(id)) layer.set(id, reached + 1);
  }
  return layer;
}

/**
 * The file with every node placed by the layout. Each node is copied with its `position` replaced, so the key
 * order of the file is kept. Edges are not changed.
 */
export function arrangeOf(file: GraphFile): GraphFile {
  const ids = file.nodes.map((node) => node.id);
  const known = new Set(ids);
  const position = new Map<string, { x: number; y: number }>();

  if (file.view === 'story') {
    const links = file.edges
      .filter(
        (edge) =>
          edge.relation === 'order' &&
          known.has(edge.from) &&
          known.has(edge.to),
      )
      .map((edge) => ({ from: edge.from, to: edge.to }));
    storySequence(ids, links).forEach((id, index) => {
      position.set(id, {
        x: ARRANGE_MARGIN + index * ARRANGE_COLUMN,
        y: ARRANGE_MARGIN,
      });
    });
  } else {
    const links = file.edges
      .map((wire) => ({
        from: nodeIdOfPort(wire.from),
        to: nodeIdOfPort(wire.to),
      }))
      .filter((link) => known.has(link.from) && known.has(link.to));
    const layers = recipeLayers(ids, links);
    const rankOf = new Map<number, number>();
    for (const id of ids) {
      const column = layers.get(id) ?? 0;
      const rank = rankOf.get(column) ?? 0;
      rankOf.set(column, rank + 1);
      position.set(id, {
        x: ARRANGE_MARGIN + column * ARRANGE_COLUMN,
        y: ARRANGE_MARGIN + rank * ARRANGE_ROW,
      });
    }
  }

  return {
    ...file,
    nodes: file.nodes.map((node) => {
      const placed = position.get(node.id);
      return placed === undefined ? node : { ...node, position: placed };
    }),
  } as GraphFile;
}
