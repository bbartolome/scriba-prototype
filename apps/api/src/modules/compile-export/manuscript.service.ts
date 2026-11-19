import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { parseDocument } from 'yaml';
import { z } from 'zod';
import {
  MANUSCRIPT_FOLDER,
  orderEntrySchema,
  type ManuscriptView,
  type ManuscriptWarning,
  type OrderEntry,
  type ManuscriptEntry,
} from '@bbartolome/scriba-contracts/compile-export';
import {
  GRAPH_FOLDER,
  GRAPH_ID_PATTERN,
  graphFileSchema,
  type StoryGraph,
} from '@bbartolome/scriba-contracts/graph-runner';
import {
  PROJECT_ERROR_CODES,
  PROJECT_ERROR_STATUS,
  type FileEntry,
} from '@bbartolome/scriba-contracts/project-store';
import { ModuleError } from '../platform/platform.module';
import {
  FilesService,
  ProjectStoreService,
} from '../project-store/project-store.module';
import { effectiveOrder } from './effective-order';
import { countWords } from './word-count';

// Fixed messages of this module. No input value is echoed.
const NO_ACTIVE_MESSAGE = 'No project is active. Activate a project first.';
const PROJECT_INVALID_MESSAGE =
  'The project.yaml order does not match the order schema.';

// The folder of drafts without the trailing slash of MANUSCRIPT_FOLDER: the Project store takes folder paths without it (P3).
const DRAFTS = MANUSCRIPT_FOLDER.replace(/\/$/, '');

// The order entries that passed the schema, and the raw order value (null when the key is absent, P19).
interface ProjectOrder {
  order: OrderEntry[];
  raw: unknown;
}

// A story graph's node ids mapped to file paths, and its order edges (P12).
function pairsOf(graph: StoryGraph, bodySet: Set<string>): [string, string][] {
  const pathOf = new Map<string, string>();
  for (const node of graph.nodes) {
    if (node.path !== undefined) pathOf.set(node.id, node.path);
  }
  const pairs: [string, string][] = [];
  for (const edge of graph.edges) {
    if (edge.relation !== 'order') continue;
    const from = pathOf.get(edge.from);
    const to = pathOf.get(edge.to);
    if (from === undefined || to === undefined) continue;
    if (from === to || !bodySet.has(from) || !bodySet.has(to)) continue;
    pairs.push([from, to]);
  }
  return pairs;
}

// The manuscript view of the active project (P6 to P8, P11 to P13, P19 to P24). Only reads.
@Injectable()
export class ManuscriptService {
  constructor(
    private readonly store: ProjectStoreService,
    private readonly files: FilesService,
  ) {}

  // The view model of GET the manuscript. Recomputed on every call; nothing is kept between calls.
  view(): ManuscriptView {
    return this.compose();
  }

  // The view the manuscript would have with `order` as its order field (P2). The revision is still that of the
  // file on disk. The write service uses it for the candidate state of a write; nothing is written.
  preview(order: OrderEntry[]): ManuscriptView {
    return this.compose(order);
  }

  // The valid entries of the file's order field: first occurrence per path, naming a current member, with their
  // unknown keys (P2). The write service uses it to keep the unknown keys of the entries it rewrites.
  orderField(): OrderEntry[] {
    const projectId = this.activeProjectId();
    const project = this.projectOrder(projectId);
    return this.fieldOf(project.order, this.members(projectId)).orderField;
  }

  // The view computation. With `override`, the override is the order field and the file's raw order is not used.
  private compose(override?: OrderEntry[]): ManuscriptView {
    const projectId = this.activeProjectId();
    const project = this.projectOrder(projectId);
    const members = this.members(projectId);

    // P8: the first occurrence of a path wins; a valid entry names a member, any other entry is stale.
    const { orderField, warnings } = this.fieldOf(
      override ?? project.order,
      members,
    );

    // P11 to P13: the story graphs, their invalid files and the projected pairs of the body.
    const partOf = new Map(
      orderField.map((entry) => [entry.path, entry.part ?? 'body']),
    );
    const bodySet = new Set(
      members.filter((path) => (partOf.get(path) ?? 'body') === 'body'),
    );
    const graphs = this.storyGraphs(projectId);
    const invalid = graphs.invalid.sort();
    for (const path of invalid) {
      warnings.push({ kind: 'invalidGraph', path });
    }
    const pairKeys = new Set<string>();
    const projectedPairs: [string, string][] = [];
    for (const graph of graphs.graphs) {
      for (const pair of pairsOf(graph, bodySet)) {
        const key = `${pair[0]}\u0000${pair[1]}`;
        if (pairKeys.has(key)) continue;
        pairKeys.add(key);
        projectedPairs.push(pair);
      }
    }

    const ordered = effectiveOrder({ members, orderField, projectedPairs });
    if (ordered.cycle.length > 0) {
      warnings.push({ kind: 'graphCycle', files: ordered.cycle });
    }

    const entries: ManuscriptEntry[] = ordered.entries.map((entry) => ({
      path: entry.path,
      part: entry.part,
      status: entry.status,
      words: countWords(this.files.read(projectId, entry.path).content),
      graphOrdered: entry.graphOrdered,
      inOrderField: entry.inOrderField,
    }));

    const body = entries
      .filter((entry) => entry.part === 'body')
      .reduce((sum, entry) => sum + entry.words, 0);
    const manuscript = entries.reduce((sum, entry) => sum + entry.words, 0);

    return {
      entries,
      totals: { body, manuscript },
      orderSource: ordered.orderSource,
      warnings,
      revision: this.revisionOf(project.raw, members),
    };
  }

  // The order field and its stale-entry warnings (P8): the first occurrence of a path wins, and an entry that
  // names no member is stale.
  private fieldOf(
    order: OrderEntry[],
    members: string[],
  ): { orderField: OrderEntry[]; warnings: ManuscriptWarning[] } {
    const memberSet = new Set(members);
    const seen = new Set<string>();
    const orderField: OrderEntry[] = [];
    const warnings: ManuscriptWarning[] = [];
    for (const entry of order) {
      if (seen.has(entry.path)) continue;
      seen.add(entry.path);
      if (memberSet.has(entry.path)) {
        orderField.push(entry);
      } else {
        warnings.push({ kind: 'staleEntry', path: entry.path });
      }
    }
    return { orderField, warnings };
  }

  // The active project's id (P6).
  private activeProjectId(): string {
    const projectId = this.store.activeId();
    if (projectId === null) {
      throw new ModuleError(
        PROJECT_ERROR_CODES.NO_ACTIVE,
        PROJECT_ERROR_STATUS.PROJECT_NO_ACTIVE,
        NO_ACTIVE_MESSAGE,
      );
    }
    return projectId;
  }

  // project.yaml's order (P7). The store's refusals of the file propagate; an invalid order is a 422.
  private projectOrder(projectId: string): ProjectOrder {
    const text = this.files.read(projectId, 'project.yaml').content;
    const doc = parseDocument(text);
    if (doc.errors.length > 0) {
      throw this.invalidProject();
    }
    const data: unknown = doc.toJS();
    const raw =
      typeof data === 'object' && data !== null && 'order' in data
        ? (data as { order: unknown }).order
        : undefined;
    if (raw === undefined) {
      return { order: [], raw: null };
    }
    const parsed = z.array(orderEntrySchema).safeParse(raw);
    if (!parsed.success) {
      throw this.invalidProject();
    }
    return { order: parsed.data, raw };
  }

  // The current manuscript files: top-level regular .md files directly in drafts/ (P4, P5).
  private members(projectId: string): string[] {
    const root = this.files.list(projectId, { path: '.' });
    const folder = root.entries.find(
      (entry) => entry.path === DRAFTS && entry.kind === 'dir',
    );
    if (folder === undefined) return [];
    return this.files
      .list(projectId, { path: DRAFTS })
      .entries.filter((entry) => isManuscriptFile(entry))
      .map((entry) => entry.path)
      .sort();
  }

  // The story graphs of graphs/ and the paths of the files that are not valid (P11).
  private storyGraphs(projectId: string): {
    graphs: StoryGraph[];
    invalid: string[];
  } {
    const root = this.files.list(projectId, { path: '.' });
    const folder = root.entries.find(
      (entry) => entry.path === GRAPH_FOLDER && entry.kind === 'dir',
    );
    const graphs: StoryGraph[] = [];
    const invalid: string[] = [];
    if (folder === undefined) return { graphs, invalid };
    const files = this.files
      .list(projectId, { path: GRAPH_FOLDER })
      .entries.filter(
        (entry) => entry.kind === 'file' && graphIdOf(entry.path) !== undefined,
      );
    for (const entry of files) {
      let parsed: ReturnType<typeof graphFileSchema.safeParse>;
      try {
        const text = this.files.read(projectId, entry.path).content;
        parsed = graphFileSchema.safeParse(JSON.parse(text));
      } catch {
        invalid.push(entry.path);
        continue;
      }
      if (!parsed.success) {
        invalid.push(entry.path);
        continue;
      }
      if (parsed.data.view === 'story') graphs.push(parsed.data);
    }
    return { graphs, invalid };
  }

  // The hash of the order value and the member list (P19); the form of the Project store's hashes.
  private revisionOf(order: unknown, members: string[]): string {
    const digest = createHash('sha256')
      .update(JSON.stringify({ order: order ?? null, files: members }))
      .digest('hex');
    return `sha256:${digest}`;
  }

  private invalidProject(): ModuleError {
    return new ModuleError(
      PROJECT_ERROR_CODES.INVALID,
      PROJECT_ERROR_STATUS.PROJECT_INVALID,
      PROJECT_INVALID_MESSAGE,
    );
  }
}

// True for a top-level regular file whose name ends in .md and does not start with a dot (P4).
function isManuscriptFile(entry: FileEntry): boolean {
  const name = entry.path.slice(DRAFTS.length + 1);
  return (
    entry.kind === 'file' &&
    entry.path.startsWith(`${DRAFTS}/`) &&
    !name.includes('/') &&
    !name.startsWith('.') &&
    name.endsWith('.md')
  );
}

// The graph id of a graphs/ entry path (P11): <id>.json with an id that matches GRAPH_ID_PATTERN.
function graphIdOf(path: string): string | undefined {
  const prefix = `${GRAPH_FOLDER}/`;
  if (!path.startsWith(prefix) || !path.endsWith('.json')) return undefined;
  const id = path.slice(prefix.length, -'.json'.length);
  return GRAPH_ID_PATTERN.test(id) ? id : undefined;
}
