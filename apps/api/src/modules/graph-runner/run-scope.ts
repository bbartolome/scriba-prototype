import type { RecipeGraph } from '@bbartolome/scriba-contracts/graph-runner';

// The node id of a port id `<nodeId>.<key>`: the part before the first dot (P15).
export function nodeOfPort(portId: string): string {
  const dot = portId.indexOf('.');
  return dot === -1 ? portId : portId.slice(0, dot);
}

// The ids of the nodes a run covers (S2, P15). Without a target, every node. With a target, the target and every node
// reached by walking the wires backwards from it.
export function scopeOf(recipe: RecipeGraph, target?: string): Set<string> {
  if (target === undefined) {
    return new Set(recipe.nodes.map((node) => node.id));
  }
  const scope = new Set<string>([target]);
  const pending: string[] = [target];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    for (const wire of recipe.edges) {
      const upstream = nodeOfPort(wire.from);
      if (nodeOfPort(wire.to) === node && !scope.has(upstream)) {
        scope.add(upstream);
        pending.push(upstream);
      }
    }
  }
  return scope;
}

// The in-scope nodes in topological order (S8, P14): Kahn's algorithm over the wires whose two ends are in scope.
// Among the ready nodes the smallest id goes first.
export function orderOf(
  recipe: RecipeGraph,
  scope: ReadonlySet<string>,
): string[] {
  const ids = recipe.nodes.map((node) => node.id).filter((id) => scope.has(id));
  const wires = recipe.edges
    .map((wire) => [nodeOfPort(wire.from), nodeOfPort(wire.to)] as const)
    .filter(([from, to]) => scope.has(from) && scope.has(to));
  const waiting = new Map<string, number>(ids.map((id) => [id, 0]));
  for (const [, to] of wires) {
    waiting.set(to, (waiting.get(to) ?? 0) + 1);
  }
  const ready = ids.filter((id) => waiting.get(id) === 0);
  const order: string[] = [];
  while (ready.length > 0) {
    ready.sort();
    const id = ready.shift() ?? '';
    order.push(id);
    for (const [from, to] of wires) {
      if (from !== id) continue;
      const left = (waiting.get(to) ?? 0) - 1;
      waiting.set(to, left);
      if (left === 0) ready.push(to);
    }
  }
  return order;
}
