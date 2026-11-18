import { signal } from '@angular/core';
import type {
  GraphFile,
  Position,
} from '@bbartolome/scriba-contracts/graph-runner';
import type { Connection, Edge, HtmlTemplateNode } from 'ngx-vflow';

// The adapter between the graph file (the contract's JSON) and the ngx-vflow state. The file is the
// only state that is saved; the library's nodes and edges are derived from it. Every change returns a
// new file object, so the key order of the file is kept.

/** One node of the file: a story node or a recipe node. */
export type FileNode = GraphFile['nodes'][number];

/** The data of a vflow node: the file node it was built from. */
export type VflowNode = HtmlTemplateNode<FileNode>;

/** The port id of one port of a node: `<nodeId>.<key>`. */
export function portIdOf(nodeId: string, key: string): string {
  return `${nodeId}.${key}`;
}

/** The node id of a port id: the text before the first dot (node ids have no dot). */
export function nodeIdOfPort(portId: string): string {
  const dot = portId.indexOf('.');
  return dot < 0 ? portId : portId.slice(0, dot);
}

/** The vflow nodes of a file, one per file node, each with its position and its file node as data. */
export function vflowNodesOf(file: GraphFile): VflowNode[] {
  return file.nodes.map((node) => ({
    type: 'html-template',
    id: node.id,
    point: signal({ x: node.position.x, y: node.position.y }),
    data: signal<FileNode>(node),
  }));
}

/** The vflow edges of a file: one per wire (recipe) or story edge, with its port handles for a recipe. */
export function vflowEdgesOf(file: GraphFile): Edge[] {
  if (file.view === 'recipe') {
    return file.edges.map((wire) => ({
      id: wire.id,
      source: nodeIdOfPort(wire.from),
      target: nodeIdOfPort(wire.to),
      sourceHandle: wire.from,
      targetHandle: wire.to,
    }));
  }
  return file.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    ...(edge.relation === undefined
      ? {}
      : {
          edgeLabels: signal({
            center: { type: 'default' as const, text: edge.relation },
          }),
        }),
  }));
}

/**
 * The file with one node moved. Returns the same object when the position is equal to the file's, so a
 * position change of a node that did not move writes nothing.
 */
export function withPosition(
  file: GraphFile,
  nodeId: string,
  position: Position,
): GraphFile {
  const node = file.nodes.find((candidate) => candidate.id === nodeId);
  if (
    node === undefined ||
    (node.position.x === position.x && node.position.y === position.y)
  ) {
    return file;
  }
  return {
    ...file,
    nodes: file.nodes.map((candidate) =>
      candidate.id === nodeId
        ? { ...candidate, position: { x: position.x, y: position.y } }
        : candidate,
    ),
  } as GraphFile;
}

/** The file with one node added at the end of its node list. */
export function withNode(file: GraphFile, node: FileNode): GraphFile {
  return { ...file, nodes: [...file.nodes, node] } as GraphFile;
}

/** The file without the given nodes, and without every wire or edge that touches them. */
export function withoutNodes(
  file: GraphFile,
  nodeIds: readonly string[],
): GraphFile {
  const removed = new Set(nodeIds);
  if (file.view === 'recipe') {
    return {
      ...file,
      nodes: file.nodes.filter((node) => !removed.has(node.id)),
      edges: file.edges.filter(
        (wire) =>
          !removed.has(nodeIdOfPort(wire.from)) &&
          !removed.has(nodeIdOfPort(wire.to)),
      ),
    } as GraphFile;
  }
  return {
    ...file,
    nodes: file.nodes.filter((node) => !removed.has(node.id)),
    edges: file.edges.filter(
      (edge) => !removed.has(edge.from) && !removed.has(edge.to),
    ),
  } as GraphFile;
}

/** The file without the given wires or story edges. */
export function withoutEdges(
  file: GraphFile,
  edgeIds: readonly string[],
): GraphFile {
  const removed = new Set(edgeIds);
  return {
    ...file,
    edges: file.edges.filter((edge) => !removed.has(edge.id)),
  } as GraphFile;
}

/**
 * The file with a new edge from a connection. A story edge joins the two nodes with no relation. A
 * recipe wire joins the two port handles, and a connection without both handles is ignored.
 */
export function withConnection(
  file: GraphFile,
  connection: Connection,
): GraphFile {
  if (file.view === 'recipe') {
    const { sourceHandle, targetHandle } = connection;
    if (sourceHandle === undefined || targetHandle === undefined) return file;
    const wire = {
      id: nextEdgeId(file),
      from: sourceHandle,
      to: targetHandle,
    };
    return { ...file, edges: [...file.edges, wire] } as GraphFile;
  }
  const edge = {
    id: nextEdgeId(file),
    from: connection.source,
    to: connection.target,
  };
  return { ...file, edges: [...file.edges, edge] } as GraphFile;
}

/** The smallest free `<kind>-<n>` node id, with n >= 1. */
export function nextNodeId(file: GraphFile, kind: string): string {
  const taken = new Set<string>(file.nodes.map((node) => node.id));
  return smallestFree((n) => `${kind}-${n}`, taken);
}

/** The smallest free edge id: `e<n>` in a story, `w<n>` in a recipe, with n >= 1. */
export function nextEdgeId(file: GraphFile): string {
  const prefix = file.view === 'recipe' ? 'w' : 'e';
  const taken = new Set<string>(file.edges.map((edge) => edge.id));
  return smallestFree((n) => `${prefix}${n}`, taken);
}

function smallestFree(
  idOf: (n: number) => string,
  taken: ReadonlySet<string>,
): string {
  let n = 1;
  while (taken.has(idOf(n))) n += 1;
  return idOf(n);
}
