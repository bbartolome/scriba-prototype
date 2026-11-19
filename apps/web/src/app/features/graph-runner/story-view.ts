import type { GraphFile } from '@bbartolome/scriba-contracts/graph-runner';
import type { FileEntry } from '@bbartolome/scriba-contracts/project-store';
import { replaceNode } from './vflow-adapter';

// The rules of the story view's pickers: the folder of a node's file, the file choices, and the setters
// of a node's path and an edge's relation. Each setter returns the same object when nothing changes.

/** One relation the picker suggests, with its meaning (a copy of RELATION_VOCABULARY, checked by the spec). */
export const RELATION_OPTIONS: readonly {
  readonly value: string;
  readonly meaning: string;
}[] = [
  { value: 'order', meaning: 'from precedes to' },
  { value: 'causality', meaning: 'from causes to' },
  { value: 'containment', meaning: 'from contains to' },
];

/** The project folder a story node's file is picked from: entities in `entities/`, scenes and beats in `drafts/`. */
export function folderOfKind(kind: string): 'drafts' | 'entities' {
  return kind === 'entity' ? 'entities' : 'drafts';
}

/**
 * The files under a folder that a node may point at: file entries only, with no path segment that starts with
 * a dot (so `.versions` is never offered). Sorted.
 */
export function fileChoicesOf(
  entries: readonly FileEntry[],
  folder: string,
): string[] {
  return entries
    .filter(
      (entry) =>
        entry.kind === 'file' &&
        entry.path.startsWith(`${folder}/`) &&
        !entry.path.split('/').some((segment) => segment.startsWith('.')),
    )
    .map((entry) => entry.path)
    .sort();
}

/** The choices of a node's file picker: the folder's files, plus its current path when it is not among them. */
export function pathChoicesOf(
  choices: readonly string[],
  current: string | undefined,
): string[] {
  if (current === undefined || choices.includes(current)) return [...choices];
  return [...choices, current].sort();
}

/** A story node, and a story edge: the two shapes the setters change. */
type StoryNode = Extract<GraphFile, { view: 'story' }>['nodes'][number];
type StoryEdge = Extract<GraphFile, { view: 'story' }>['edges'][number];

/** The file with a node's `path` set. An empty path removes the key. A recipe is returned as it is. */
export function withPath(
  file: GraphFile,
  nodeId: string,
  path: string,
): GraphFile {
  if (file.view !== 'story') return file;
  const node = file.nodes.find((candidate) => candidate.id === nodeId);
  if (node === undefined) return file;
  if (path === '' ? node.path === undefined : node.path === path) return file;
  let next: StoryNode;
  if (path === '') {
    const copy = { ...node };
    delete copy.path;
    next = copy;
  } else {
    next = { ...node, path };
  }
  return replaceNode(file, next);
}

/**
 * The file with an edge's `relation` set. An empty relation removes the key; any other text is kept as given.
 * A recipe is returned as it is.
 */
export function withRelation(
  file: GraphFile,
  edgeId: string,
  relation: string,
): GraphFile {
  if (file.view !== 'story') return file;
  const edge = file.edges.find((candidate) => candidate.id === edgeId);
  if (edge === undefined) return file;
  if (
    relation === '' ? edge.relation === undefined : edge.relation === relation
  ) {
    return file;
  }
  let next: StoryEdge;
  if (relation === '') {
    const copy = { ...edge };
    delete copy.relation;
    next = copy;
  } else {
    next = { ...edge, relation };
  }
  return {
    ...file,
    edges: file.edges.map((candidate) =>
      candidate.id === edgeId ? next : candidate,
    ),
  } as GraphFile;
}
