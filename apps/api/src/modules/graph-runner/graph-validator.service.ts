import { Injectable } from '@nestjs/common';
import {
  type GraphDetail,
  type RecipeNode,
  type ValidationIssue,
} from '@bbartolome/scriba-contracts/graph-runner';
import {
  PROJECT_ERROR_CODES,
  type EntityResolution,
} from '@bbartolome/scriba-contracts/project-store';
import {
  TOOL_ERROR_CODES,
  type ToolArgsInvalidDetails,
} from '@bbartolome/scriba-contracts/tool-registry';
import { ModuleError } from '../platform/platform.module';
import {
  EntitiesService,
  FilesService,
} from '../project-store/project-store.module';
import { CatalogService } from '../tool-registry/tool-registry.module';
import {
  firstById,
  pinnedEntityIds,
  recipeIssues,
  storyIssues,
  type PathStatus,
  type ToolFact,
} from './graph-validation';

type Graph = GraphDetail['graph'];

// The tool codes that make a tool unknown to a node (P4): not found, or invalid.
const UNKNOWN_TOOL_CODES: readonly string[] = [
  TOOL_ERROR_CODES.NOT_FOUND,
  TOOL_ERROR_CODES.INVALID,
];

// The project-store codes of a path that is not usable as a story path (P12).
const UNSAFE_PATH_CODES: readonly string[] = [
  PROJECT_ERROR_CODES.PATH_INVALID,
  PROJECT_ERROR_CODES.PATH_OUTSIDE,
  PROJECT_ERROR_CODES.PATH_RESERVED,
];

// The project-store codes of a file that exists but is not read as text (P12, exists is enough).
const EXISTING_PATH_CODES: readonly string[] = [
  PROJECT_ERROR_CODES.NOT_TEXT,
  PROJECT_ERROR_CODES.FILE_TOO_LARGE,
];

// The code of a module error, or undefined for any other error.
function codeOf(error: unknown): string | undefined {
  return error instanceof ModuleError ? error.code : undefined;
}

// The facts of the validation rules (P4, P11, P12). It only reads: no file is written and no tool is changed (P17).
@Injectable()
export class GraphValidatorService {
  constructor(
    private readonly catalog: CatalogService,
    private readonly files: FilesService,
    private readonly entities: EntitiesService,
  ) {}

  // The issues of one graph in the active project (the project id is checked by the caller).
  issues(projectId: string, graph: Graph): ValidationIssue[] {
    if (graph.view === 'story') {
      return storyIssues(graph, { paths: this.pathStatuses(projectId, graph) });
    }
    const tools = this.toolFacts(graph.nodes);
    const unknownEntityIds = this.unknownEntityIds(
      projectId,
      pinnedEntityIds(graph, tools),
    );
    return recipeIssues(graph, { tools, unknownEntityIds });
  }

  // The status of each story node's path, for the first occurrence of each node (P12).
  private pathStatuses(
    projectId: string,
    graph: Extract<Graph, { view: 'story' }>,
  ): Map<string, PathStatus> {
    const paths = new Map<string, PathStatus>();
    for (const node of firstById(graph.nodes)) {
      if (node.path === undefined) continue;
      paths.set(node.id, this.pathStatus(projectId, node.path));
    }
    return paths;
  }

  // The status of one story path: the lexical versions rule first, then the Project store's read (P12).
  private pathStatus(projectId: string, path: string): PathStatus {
    if (path.toLowerCase().startsWith('drafts/.versions/')) return 'versions';
    try {
      this.files.read(projectId, path);
      return 'ok';
    } catch (error) {
      const code = codeOf(error);
      if (code === PROJECT_ERROR_CODES.NOT_FOUND) return 'missing';
      if (code !== undefined && UNSAFE_PATH_CODES.includes(code)) {
        return 'unsafe';
      }
      if (code !== undefined && EXISTING_PATH_CODES.includes(code)) return 'ok';
      throw error;
    }
  }

  // The facts of each tool node, for the first occurrence of each node id (P4).
  private toolFacts(nodes: RecipeNode[]): Map<string, ToolFact> {
    const tools = new Map<string, ToolFact>();
    for (const node of firstById(nodes)) {
      if (node.kind !== 'tool') continue;
      tools.set(node.id, this.toolFact(node.tool, node.params ?? {}));
    }
    return tools;
  }

  // The fact of one tool: unknown, or valid with its switch and its params-mode issues (P4).
  private toolFact(name: string, params: Record<string, unknown>): ToolFact {
    const entry = this.entryOf(name);
    if (entry === undefined) return { state: 'unknown' };
    return {
      state: 'valid',
      enabled: this.catalog.enabledOf(entry),
      ports: entry.views.ports,
      paramsIssues: this.paramsIssuesOf(name, params),
    };
  }

  // The loaded tool of a name, or undefined when the registry reports it not found or invalid (P4).
  private entryOf(name: string) {
    try {
      return this.catalog.entry(name);
    } catch (error) {
      const code = codeOf(error);
      if (code !== undefined && UNKNOWN_TOOL_CODES.includes(code)) {
        return undefined;
      }
      throw error;
    }
  }

  // The params-mode issues of one call: every issue of the registry's check (P19). Other errors are rethrown.
  private paramsIssuesOf(
    name: string,
    params: Record<string, unknown>,
  ): { path: string }[] {
    try {
      this.catalog.validate(name, { arguments: params, mode: 'params' });
      return [];
    } catch (error) {
      if (codeOf(error) === TOOL_ERROR_CODES.ARGS_INVALID) {
        const details = (error as ModuleError)
          .details as ToolArgsInvalidDetails;
        return details.issues.map((issue) => ({ path: issue.path }));
      }
      throw error;
    }
  }

  // The entity ids among the pinned values that the Project store reports as unknown (P11). One call, only when
  // there is a pinned value.
  private unknownEntityIds(projectId: string, ids: string[]): Set<string> {
    if (ids.length === 0) return new Set();
    const resolution: EntityResolution = this.entities.resolve(projectId, ids);
    return new Set(
      resolution.errors
        .filter((error) => error.code === 'unknown')
        .map((error) => error.id),
    );
  }
}
