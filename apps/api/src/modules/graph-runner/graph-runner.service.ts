import { Injectable } from '@nestjs/common';
import {
  GRAPH_ERROR_CODES,
  GRAPH_ERROR_STATUS,
  GRAPH_FOLDER,
  GRAPH_ID_PATTERN,
  GRAPH_SCHEMA_VERSION,
  graphFileSchema,
  graphFileShapeSchema,
  type GraphCreate,
  type GraphDetail,
  type GraphIdResult,
  type GraphList,
  type GraphRename,
  type GraphSummary,
  type ValidationIssue,
  type ValidationResult,
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
import {
  canonicalGraphText,
  isNewerVersion,
  slugOf,
  suffixedId,
} from './graph-files';
import { GraphValidatorService } from './graph-validator.service';
import { splitIllegalKinds } from './graph-validation';

// The answer of a save: the validation issues of the saved graph.
export interface GraphSaveResult {
  issues: ValidationIssue[];
}

// Every message of the graph routes. Fixed strings only; no input value is echoed.
const MESSAGES = {
  NOT_FOUND: 'No graph was found with that id.',
  SCHEMA_INVALID: 'The graph file does not match the graph schema.',
  SCHEMA_VERSION_UNSUPPORTED:
    'The graph file was written by a newer version of Scriba and cannot be read here.',
  NO_ACTIVE: 'No project is active. Activate a project first.',
} as const;

// The project-store codes that mean a file is not a graph the module can read (P5).
const UNREADABLE_CODES: readonly string[] = [
  PROJECT_ERROR_CODES.NOT_TEXT,
  PROJECT_ERROR_CODES.FILE_TOO_LARGE,
];

// A graph refusal: a graph-runner code with its contract status and a fixed message.
function graphError(
  code: keyof typeof GRAPH_ERROR_CODES,
  message: string,
): ModuleError {
  const value = GRAPH_ERROR_CODES[code];
  return new ModuleError(value, GRAPH_ERROR_STATUS[value], message);
}

// The project-relative path of a graph file (S8).
function graphPath(id: string): string {
  return `${GRAPH_FOLDER}/${id}.json`;
}

// The graph id of a project-relative entry path, or undefined when the entry is not a graph file (P3).
function graphIdOf(path: string): string | undefined {
  const prefix = `${GRAPH_FOLDER}/`;
  const suffix = '.json';
  if (!path.startsWith(prefix) || !path.endsWith(suffix)) return undefined;
  const id = path.slice(prefix.length, -suffix.length);
  return GRAPH_ID_PATTERN.test(id) ? id : undefined;
}

// Parses a text as JSON, or returns undefined when it is not JSON.
function parseJson(text: string): { value: unknown } | undefined {
  try {
    return { value: JSON.parse(text) as unknown };
  } catch {
    return undefined;
  }
}

// The Graph runner's routes over the graph files of the active project (S2). Every file access goes through the
// Project store's in-process file API.
@Injectable()
export class GraphRunnerService {
  constructor(
    private readonly store: ProjectStoreService,
    private readonly files: FilesService,
    private readonly validator: GraphValidatorService,
  ) {}

  // The graph list (P3). A file that cannot be read or fails the schema is listed as invalid.
  list(): GraphList {
    const projectId = this.activeProjectId();
    return {
      graphs: this.graphEntries(projectId).map((entry) =>
        this.summaryOf(projectId, entry),
      ),
    };
  }

  // One graph with its validation issues (get).
  get(id: string): GraphDetail {
    const graph = this.readGraph(id);
    return { graph, issues: this.issuesOf(graph) };
  }

  // The shape-parsed graph of an id. Raises the errors of get (P13); later units read recipes through it.
  readGraph(id: string): GraphDetail['graph'] {
    const projectId = this.activeProjectId();
    this.requireGraph(projectId, id);
    return this.parseGraph(this.readText(projectId, id), true);
  }

  // A new graph with the id of its name (P6, P7).
  create(body: GraphCreate): GraphIdResult {
    const projectId = this.activeProjectId();
    const slug = slugOf(body.name);
    const taken = new Set(
      this.graphEntries(projectId).map((entry) => graphIdOf(entry.path)),
    );
    let id = slug;
    for (let n = 2; taken.has(id); n += 1) {
      id = suffixedId(slug, n);
    }
    const graph = {
      schemaVersion: GRAPH_SCHEMA_VERSION,
      view: body.view,
      name: body.name,
      nodes: [],
      edges: [],
    };
    this.files.write(projectId, {
      path: graphPath(id),
      content: canonicalGraphText(graph),
    });
    return { id };
  }

  // A direct write of the whole graph (S4). Refused only when the body fails the file schema (P5, P9).
  save(id: string, body: unknown): GraphSaveResult {
    const projectId = this.activeProjectId();
    this.requireGraph(projectId, id);
    const graph = this.checkValue(body, false);
    this.files.write(projectId, {
      path: graphPath(id),
      content: canonicalGraphText(graph),
    });
    return { issues: this.issuesOf(graph) };
  }

  // A rename: by name (the file is rewritten with the new name) or by id (the file is moved, unparsed).
  rename(id: string, body: GraphRename): GraphIdResult {
    const projectId = this.activeProjectId();
    this.requireGraph(projectId, id);
    if ('newId' in body) {
      this.files.move(projectId, {
        from: graphPath(id),
        to: graphPath(body.newId),
      });
      return { id: body.newId };
    }
    const graph = this.parseGraph(this.readText(projectId, id), false);
    this.files.write(projectId, {
      path: graphPath(id),
      content: canonicalGraphText({ ...graph, name: body.name }),
    });
    return { id };
  }

  // The delete of one graph file. A newer or invalid file can be deleted (P12).
  delete(id: string): void {
    const projectId = this.activeProjectId();
    this.requireGraph(projectId, id);
    this.files.delete(projectId, { path: graphPath(id) });
  }

  // The issues of an unsaved graph body (P3, P22). The body is checked in the active project; nothing is written.
  validate(body: unknown): ValidationResult {
    this.activeProjectId();
    const { rest, issues } = splitIllegalKinds(body);
    return {
      issues: [...issues, ...this.issuesOf(this.checkValue(rest, true))],
    };
  }

  // The validation issues of a graph (P13, GRR-03 P17): the validator's rules over the active project.
  issuesOf(graph: GraphDetail['graph']): ValidationIssue[] {
    return this.validator.issues(this.activeProjectId(), graph);
  }

  // The active project's id (P2).
  private activeProjectId(): string {
    const projectId = this.store.activeId();
    if (projectId === null) {
      throw new ModuleError(
        PROJECT_ERROR_CODES.NO_ACTIVE,
        PROJECT_ERROR_STATUS.PROJECT_NO_ACTIVE,
        MESSAGES.NO_ACTIVE,
      );
    }
    return projectId;
  }

  // The entries of graphs/ that are graph files (P3). Empty when the project root has no graphs folder; the store's
  // own refusals (no project, a missing project folder) reach the caller unchanged.
  private graphEntries(projectId: string): FileEntry[] {
    const root = this.files.list(projectId, { path: '.' });
    const folder = root.entries.find(
      (entry) => entry.path === GRAPH_FOLDER && entry.kind === 'dir',
    );
    if (folder === undefined) return [];
    return this.files
      .list(projectId, { path: GRAPH_FOLDER })
      .entries.filter(
        (entry) => entry.kind === 'file' && graphIdOf(entry.path) !== undefined,
      );
  }

  // Refuses an id that is not a graph id, or that has no graph file (P4).
  private requireGraph(projectId: string, id: string): void {
    const exists =
      GRAPH_ID_PATTERN.test(id) &&
      this.graphEntries(projectId).some(
        (entry) => graphIdOf(entry.path) === id,
      );
    if (!exists) {
      throw graphError('NOT_FOUND', MESSAGES.NOT_FOUND);
    }
  }

  // The text of a graph file. A file the store will not read as text is not a graph (P5).
  private readText(projectId: string, id: string): string {
    try {
      return this.files.read(projectId, graphPath(id)).content;
    } catch (error) {
      if (isUnreadable(error)) {
        throw graphError('SCHEMA_INVALID', MESSAGES.SCHEMA_INVALID);
      }
      throw error;
    }
  }

  // Parses a graph text (P5): JSON, then the newer-version refusal, then the schema.
  private parseGraph(text: string, shape: boolean): GraphDetail['graph'] {
    const parsed = parseJson(text);
    if (parsed === undefined) {
      throw graphError('SCHEMA_INVALID', MESSAGES.SCHEMA_INVALID);
    }
    return this.checkValue(parsed.value, shape);
  }

  // The newer-version refusal, then the schema (P5). shape false is the save rule (unique ids).
  private checkValue(value: unknown, shape: boolean): GraphDetail['graph'] {
    if (isNewerVersion(value)) {
      throw graphError(
        'SCHEMA_VERSION_UNSUPPORTED',
        MESSAGES.SCHEMA_VERSION_UNSUPPORTED,
      );
    }
    const result = shape
      ? graphFileShapeSchema.safeParse(value)
      : graphFileSchema.safeParse(value);
    if (!result.success) {
      throw graphError('SCHEMA_INVALID', MESSAGES.SCHEMA_INVALID);
    }
    return result.data;
  }

  // The list row of one graph entry (P5, S10).
  private summaryOf(projectId: string, entry: FileEntry): GraphSummary {
    const id = graphIdOf(entry.path) ?? '';
    const unreadable: GraphSummary = {
      id,
      name: id,
      view: null,
      nodeCount: null,
      mtime: entry.mtime,
      valid: false,
    };
    let text: string;
    try {
      text = this.files.read(projectId, entry.path).content;
    } catch (error) {
      if (isUnreadable(error)) return unreadable;
      throw error;
    }
    const parsed = parseJson(text);
    if (parsed === undefined || isNewerVersion(parsed.value)) {
      return unreadable;
    }
    const checked = graphFileSchema.safeParse(parsed.value);
    if (!checked.success) return unreadable;
    return {
      id,
      name: checked.data.name,
      view: checked.data.view,
      nodeCount: checked.data.nodes.length,
      mtime: entry.mtime,
      valid: true,
    };
  }
}

// True for a store refusal that makes a file unreadable as a graph (P5).
function isUnreadable(error: unknown): boolean {
  return error instanceof ModuleError && UNREADABLE_CODES.includes(error.code);
}
