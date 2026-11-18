import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import type {
  GraphFile,
  ValidationIssue,
  ValidationResult,
} from '@bbartolome/scriba-contracts/graph-runner';
import type {
  FormDescriptor,
  PortDescriptor,
  PortType,
  ToolArguments,
  ToolSummary,
  ToolViews,
} from '@bbartolome/scriba-contracts/tool-registry';
import {
  type Connection,
  type ConnectionSettings,
  type Edge,
  type NodePositionChange,
  type NodeSelectedChange,
  type EdgeSelectChange,
  Vflow,
} from 'ngx-vflow';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  forkJoin,
  map,
  Observable,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { API_CLIENT, ApiError } from '../../shell';
import { ToolForm } from '../tool-registry/tool-registry.routes';
import {
  graphDetailCopy,
  graphPath,
  graphSavePath,
  graphValidatePath,
  TOOLS_PATH,
  toolListCopy,
  toolPath,
  toolViewsCopy,
  validationResultCopy,
} from './graph-runner-contract';
import {
  type FileNode,
  labelWires,
  nextNodeId,
  portIdOf,
  replaceNode,
  type VflowNode,
  vflowEdgesOf,
  vflowNodeOf,
  vflowNodesOf,
  withConnection,
  withNode,
  withoutEdges,
  withoutNodes,
  withPosition,
} from './vflow-adapter';
import {
  acceptsWire,
  blockingIssuesOf,
  effectiveRowOf,
  formValueOf,
  paletteOf,
  paramsAfterEdit,
  portRowsOf,
  type PortRow,
  toolStateOf,
  type ToolDetailRead,
  type ToolState,
  TOOL_STATE_LINES,
  typeGlyphOf,
} from './tool-nodes';

/** The kinds the controls offer, per view. */
const STORY_KINDS: readonly string[] = ['entity', 'scene', 'beat'];
const RECIPE_KINDS: readonly string[] = ['input', 'output'];

/** The port types an input node can carry. */
const PORT_TYPES: readonly PortType[] = ['text', 'entity', 'style'];

/** The quiet time after the last change before the file is validated (C-10). */
const VALIDATE_DELAY_MS = 300;

/** The line shown when the graph file cannot be read. */
const LOAD_FAILURE = 'The graph could not be loaded.';

/** The line shown when a save is refused or fails. */
const SAVE_FAILURE = 'The graph was not saved.';

/** The one-line status of the last refused save, with the server's message when there is one. */
interface Refusal {
  readonly detail: string;
}

/** The state of one tool node and, when it is ready, the views of its tool. */
interface ToolNodeView {
  readonly state: ToolState;
  readonly views?: ToolViews;
}

/** The controls of a new recipe node: an input's type and entity kind, an output's path. */
interface NodeControls {
  readonly type: PortType;
  readonly entityKind: string;
  readonly path: string;
}

/** The label shown in a node's header, read from the file node. */
function labelOf(node: FileNode): string {
  switch (node.kind) {
    case 'input':
      return node.params.label;
    case 'output':
      return node.params?.label ?? 'Output';
    case 'tool':
      return node.tool;
    default:
      return node.label;
  }
}

/** A new file node of the given kind, with the controls' defaults (C6). */
function newNodeOf(
  view: GraphFile['view'],
  kind: string,
  id: string,
  label: string,
  position: { x: number; y: number },
  controls: NodeControls,
): FileNode {
  if (view === 'story') {
    return { id, kind, label: label || kind, position } as FileNode;
  }
  if (kind === 'input') {
    const entityKind =
      controls.type === 'entity' && controls.entityKind !== ''
        ? { entityKind: controls.entityKind }
        : {};
    return {
      id,
      kind: 'input',
      position,
      params: { type: controls.type, label: label || 'Input', ...entityKind },
    };
  }
  const params = {
    ...(label === '' ? {} : { label }),
    ...(controls.path === '' ? {} : { path: controls.path }),
  };
  return Object.keys(params).length === 0
    ? { id, kind: 'output', position }
    : { id, kind: 'output', position, params };
}

/** The selection after one batch of select changes: each change adds or removes its id. */
function selectionAfter(
  current: readonly string[],
  changes: readonly { readonly id: string; readonly selected: boolean }[],
): readonly string[] {
  const selected = new Set(current);
  for (const change of changes) {
    if (change.selected) selected.add(change.id);
    else selected.delete(change.id);
  }
  return [...selected];
}

/** A failed detail read: a 404 is an unknown tool, any other failure is a read that failed. */
function failureOf(error: unknown): 'not-found' | 'failed' {
  return error instanceof ApiError && error.status === 404
    ? 'not-found'
    : 'failed';
}

/**
 * The canvas of one graph (`:graphId`): the view is story or recipe, from the file. Nodes can be moved,
 * added and removed, wires and edges can be connected and removed, and the whole file is saved. A recipe
 * also lists the palette, draws its tool nodes from the registry, and shows the live validation.
 */
@Component({
  imports: [Vflow, ToolForm],
  selector: 'app-canvas-page',
  template: `
    @if (loadFailed()) {
      <p role="alert">{{ loadFailure }}</p>
    }
    @if (file(); as current) {
      <h2>{{ current.name }}</h2>
      @if (panelVisible()) {
        <section class="issues" aria-label="Validation issues">
          @if (refusal(); as refused) {
            <p role="alert">{{ saveFailure }}</p>
            @if (refused.detail !== '') {
              <p>{{ refused.detail }}</p>
            }
          }
          @if (issues().length > 0) {
            <ul>
              @for (issue of issues(); track $index) {
                <li>
                  <span>{{ issue.severity }}</span>
                  <span>{{ issue.code }}</span>
                  <span>{{ issue.message }}</span>
                </li>
              }
            </ul>
          }
        </section>
      }
      @if (!isStory()) {
        <ul class="palette" aria-label="Tool palette">
          @for (tool of palette(); track tool.name) {
            <li [attr.data-tool]="tool.name">
              <button type="button" (click)="addTool(tool.name)">
                {{ tool.name }}
              </button>
              <span>{{ tool.description }}</span>
            </li>
          }
        </ul>
      }
      <div class="controls">
        <label for="new-kind">Kind</label>
        <select
          id="new-kind"
          [value]="newKind()"
          (change)="newKind.set($any($event.target).value)"
        >
          @for (kind of kindOptions(); track kind) {
            <option [value]="kind">{{ kind }}</option>
          }
        </select>
        @if (!isStory() && newKind() === 'input') {
          <label for="new-type">Type</label>
          <select
            id="new-type"
            [value]="newType()"
            (change)="newType.set($any($event.target).value)"
          >
            @for (type of portTypes; track type) {
              <option [value]="type">{{ type }}</option>
            }
          </select>
          @if (newType() === 'entity') {
            <label for="new-entity-kind">Entity kind</label>
            <input
              id="new-entity-kind"
              type="text"
              [value]="newEntityKind()"
              (input)="newEntityKind.set($any($event.target).value)"
            />
          }
        }
        @if (!isStory() && newKind() === 'output') {
          <label for="new-path">Path</label>
          <input
            id="new-path"
            type="text"
            [value]="newPath()"
            (input)="newPath.set($any($event.target).value)"
          />
        }
        <label for="new-label">Label</label>
        <input
          id="new-label"
          type="text"
          [value]="newLabel()"
          (input)="newLabel.set($any($event.target).value)"
        />
        <button type="button" (click)="add()">Add</button>
        <button type="button" (click)="deleteSelected()">
          Delete selected
        </button>
        <button type="button" (click)="save()">Save</button>
        @if (!isStory()) {
          <button type="button" data-run [disabled]="runBlocked()">Run</button>
          <ul data-run-reasons class="run-reasons">
            @for (issue of blocking(); track $index) {
              <li>{{ issue.message }}</li>
            }
          </ul>
        }
      </div>
      <vflow
        [view]="'auto'"
        [nodes]="nodes()"
        [edges]="edges()"
        [connection]="connection()"
        (connect)="onConnect($event)"
        (nodesChanges.position)="onMove($event)"
        (nodesChanges.select)="onNodeSelect($event)"
        (edgesChanges.select)="onEdgeSelect($event)"
      >
        <ng-template nodeHtml let-ctx>
          <div
            class="vnode"
            [attr.data-node]="ctx.node.id"
            [class.issue]="issueNodes().has(ctx.node.id)"
          >
            <div class="vnode-head">
              <span>{{ ctx.data().kind }}</span>
              <span>{{ labelOf(ctx.data()) }}</span>
            </div>
            @if (isStory()) {
              <handle type="target" position="left"></handle>
              <handle type="source" position="right"></handle>
            } @else {
              @if (stateLineOf(ctx.node.id); as line) {
                <p class="tool-state">{{ line }}</p>
              }
              @for (row of rowsOf(ctx.node.id, ctx.data()); track row.key) {
                <div class="port-row">
                  <handle
                    [id]="portIdOf(ctx.node.id, row.key)"
                    [type]="row.side === 'input' ? 'target' : 'source'"
                    [position]="row.side === 'input' ? 'left' : 'right'"
                    [template]="svgHandle"
                  ></handle>
                  <ng-template #svgHandle let-handle>
                    <svg:circle
                      r="5"
                      [attr.data-port]="portIdOf(ctx.node.id, row.key)"
                      [attr.cx]="handle.point().x"
                      [attr.cy]="handle.point().y"
                      [class.issue]="
                        issuePorts().has(portIdOf(ctx.node.id, row.key))
                      "
                    />
                  </ng-template>
                  <span
                    class="port-glyph"
                    [class]="'port-glyph port-' + row.type"
                    [attr.title]="row.type"
                    >{{ glyphOf(row.type) }}</span
                  >
                  <span class="port-title">{{ row.title }}</span>
                  @for (chip of row.chips; track $index) {
                    <span class="chip">{{ chipTextOf(chip) }}</span>
                  }
                </div>
              }
              @if (readyViewsOf(ctx.node.id); as views) {
                <app-tool-form
                  [form]="views.form"
                  layout="node-body"
                  [value]="formValueFor(ctx.data(), views.form)"
                  (valueChange)="onSettings(ctx.node.id, $event)"
                />
              }
            }
          </div>
        </ng-template>
      </vflow>
    }
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    vflow {
      height: 70vh;
    }
    .vnode {
      min-width: 160px;
      border: 1px solid currentColor;
      border-radius: 6px;
      padding: 4px 8px;
      background: Canvas;
    }
    .vnode.issue {
      border-color: crimson;
      border-width: 2px;
    }
    .vnode-head {
      display: flex;
      gap: 8px;
    }
    .port-row {
      display: block;
    }
    circle.issue {
      stroke: crimson;
      stroke-width: 3px;
    }
    .chip {
      display: inline-block;
      margin-left: 4px;
      padding: 0 4px;
      border: 1px solid currentColor;
      border-radius: 8px;
    }
  `,
})
export class CanvasPage {
  private readonly api = inject(API_CLIENT);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loadFailure = LOAD_FAILURE;
  protected readonly saveFailure = SAVE_FAILURE;

  protected readonly portIdOf = portIdOf;
  protected readonly labelOf = labelOf;
  protected readonly glyphOf = typeGlyphOf;
  protected readonly portTypes = PORT_TYPES;

  /** The graph file as it was received and changed: the state that is saved. */
  protected readonly file = signal<GraphFile | undefined>(undefined);
  protected readonly issues = signal<readonly ValidationIssue[]>([]);
  protected readonly refusal = signal<Refusal | undefined>(undefined);
  protected readonly loadFailed = signal(false);

  /** The vflow state, derived from the file. */
  protected readonly nodes = signal<VflowNode[]>([]);
  protected readonly edges = signal<Edge[]>([]);

  protected readonly selectedNodes = signal<readonly string[]>([]);
  protected readonly selectedEdges = signal<readonly string[]>([]);

  protected readonly isStory = computed(() => this.file()?.view === 'story');
  protected readonly kindOptions = computed(() =>
    this.isStory() ? STORY_KINDS : RECIPE_KINDS,
  );
  protected readonly newKind = signal('entity');
  protected readonly newLabel = signal('');
  protected readonly newType = signal<PortType>('text');
  protected readonly newEntityKind = signal('');
  protected readonly newPath = signal('');

  protected readonly panelVisible = computed(
    () => this.issues().length > 0 || this.refusal() !== undefined,
  );

  /** The tool list, or undefined when it could not be read. */
  private readonly rows = signal<readonly ToolSummary[] | undefined>(undefined);
  /** What each tool read so far gave, by tool name: its views, or the failure. */
  private readonly details = signal<ReadonlyMap<string, ToolDetailRead>>(
    new Map(),
  );
  /** The form value of each ready tool node, by node id (C-17). */
  private readonly formValues = signal<ReadonlyMap<string, ToolArguments>>(
    new Map(),
  );

  protected readonly palette = computed(() => {
    const rows = this.rows();
    return rows === undefined ? [] : paletteOf(rows);
  });

  /** The state of each tool node of the file, and the views of a ready one. */
  private readonly toolNodes = computed(() => {
    const views = new Map<string, ToolNodeView>();
    for (const node of this.file()?.nodes ?? []) {
      if (node.kind !== 'tool') continue;
      const detail = this.details().get(node.tool);
      const state = toolStateOf(this.rows(), node.tool, detail);
      views.set(node.id, {
        state,
        views:
          state === 'ready' && typeof detail === 'object' ? detail : undefined,
      });
    }
    return views;
  });

  /** The ports of each ready tool node, by node id: the only nodes with handles (C-12). */
  private readonly readyPorts = computed(() => {
    const ports = new Map<string, PortDescriptor>();
    for (const [id, view] of this.toolNodes()) {
      if (view.views !== undefined) ports.set(id, view.views.ports);
    }
    return ports;
  });

  /** The issues' highlights: the nodes and the ports they name. */
  protected readonly issueNodes = computed(
    () =>
      new Set(
        this.issues().flatMap((issue) =>
          issue.nodeId === undefined ? [] : [issue.nodeId],
        ),
      ),
  );
  protected readonly issuePorts = computed(
    () =>
      new Set(
        this.issues().flatMap((issue) =>
          issue.portId === undefined ? [] : [issue.portId],
        ),
      ),
  );

  /** Run's state: disabled while a blocking error exists, with the errors listed (C-16). */
  protected readonly blocking = computed(() => blockingIssuesOf(this.issues()));
  protected readonly runBlocked = computed(() => this.blocking().length > 0);

  /** Connections are checked by the recipe rules; a story keeps the library's defaults. */
  protected readonly connection = computed<ConnectionSettings>(() =>
    this.isStory()
      ? {}
      : {
          validator: (ends) => {
            const current = this.file();
            return (
              current === undefined ||
              acceptsWire(current, ends, this.readyPorts())
            );
          },
        },
  );

  /** The id of the graph on the page, from the route. */
  private graphId: string | undefined;

  /** A change of the file, which schedules one validation (C-10). */
  private readonly changes = new Subject<void>();

  constructor() {
    // The id comes from the child route; a new id loads a new graph.
    inject(ActivatedRoute)
      .paramMap.pipe(
        map((params) => params.get('graphId') ?? ''),
        distinctUntilChanged(),
        switchMap((id) => this.load(id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    // Live validation: the latest change after a quiet time; an older request is cancelled.
    this.changes
      .pipe(
        debounceTime(VALIDATE_DELAY_MS),
        switchMap(() => this.validate()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.setIssues(result.issues));
  }

  protected onConnect(connection: Connection): void {
    const current = this.file();
    if (current === undefined) return;
    const next = withConnection(current, connection);
    this.file.set(next);
    this.rebuildEdges(next);
    this.scheduleValidation();
  }

  /** A position change writes the file only where the point differs from the file's position (C4). */
  protected onMove(changes: readonly NodePositionChange[]): void {
    const before = this.file();
    if (before === undefined) return;
    let current = before;
    for (const change of changes) {
      current = withPosition(current, change.id, change.point);
    }
    if (current === before) return;
    this.file.set(current);
    this.scheduleValidation();
  }

  protected onNodeSelect(changes: readonly NodeSelectedChange[]): void {
    this.selectedNodes.update((ids) => selectionAfter(ids, changes));
  }

  protected onEdgeSelect(changes: readonly EdgeSelectChange[]): void {
    this.selectedEdges.update((ids) => selectionAfter(ids, changes));
  }

  protected add(): void {
    const current = this.file();
    if (current === undefined) return;
    const offset = 40 * (current.nodes.length + 1);
    const node = newNodeOf(
      current.view,
      this.newKind(),
      nextNodeId(current, this.newKind()),
      this.newLabel().trim(),
      { x: offset, y: offset },
      {
        type: this.newType(),
        entityKind: this.newEntityKind().trim(),
        path: this.newPath().trim(),
      },
    );
    this.appendNode(current, node);
  }

  /**
   * Adds a tool from the palette. Its detail is read first; the node is added only when the read gives its
   * views. The node has no params until the author sets a value (C-7, C-17).
   */
  protected addTool(name: string): void {
    this.api
      .get(toolPath(name), toolViewsCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ views }) => {
          if (views === null) {
            this.details.update((map) => new Map(map).set(name, 'failed'));
            return;
          }
          this.details.update((map) => new Map(map).set(name, views));
          const current = this.file();
          if (current === undefined) return;
          const offset = 40 * (current.nodes.length + 1);
          const node: FileNode = {
            id: nextNodeId(current, 'tool'),
            kind: 'tool',
            tool: name,
            position: { x: offset, y: offset },
          };
          this.formValues.update((map) =>
            new Map(map).set(node.id, formValueOf(undefined, views.form)),
          );
          this.appendNode(current, node);
        },
        error: (error: unknown) =>
          this.details.update((map) =>
            new Map(map).set(name, failureOf(error)),
          ),
      });
  }

  /** Removes the selected nodes with their wires and edges, and the selected edges. */
  protected deleteSelected(): void {
    const current = this.file();
    if (current === undefined) return;
    const removed = this.selectedNodes();
    const next = withoutEdges(
      withoutNodes(current, removed),
      this.selectedEdges(),
    );
    this.file.set(next);
    this.nodes.set(vflowNodesOf(next));
    this.rebuildEdges(next);
    this.formValues.update((map) => {
      const kept = new Map(map);
      for (const id of removed) kept.delete(id);
      return kept;
    });
    this.selectedNodes.set([]);
    this.selectedEdges.set([]);
    this.scheduleValidation();
  }

  /** Saves the whole file. The response's issues replace the panel's; a refusal is shown in it. */
  protected save(): void {
    const current = this.file();
    if (current === undefined || this.graphId === undefined) return;
    this.api
      .post(graphSavePath(this.graphId), current, validationResultCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ issues }) => {
          this.setIssues(issues);
          this.refusal.set(undefined);
        },
        error: (error: unknown) =>
          this.refusal.set({
            detail: error instanceof ApiError ? error.message : '',
          }),
      });
  }

  /** The rows of a node: a tool node's rows exist only while it is ready. */
  protected rowsOf(id: string, node: FileNode): readonly PortRow[] {
    return portRowsOf(node, this.readyPorts().get(id));
  }

  protected readyViewsOf(id: string): ToolViews | undefined {
    return this.toolNodes().get(id)?.views;
  }

  /** The one line a tool node shows when it is not ready; empty when it is ready. */
  protected stateLineOf(id: string): string {
    const state = this.toolNodes().get(id)?.state;
    return state === undefined || state === 'ready'
      ? ''
      : TOOL_STATE_LINES[state];
  }

  /** The form value of a ready tool node: the stored value, else its params with the defaults (C-17). */
  protected formValueFor(node: FileNode, form: FormDescriptor): ToolArguments {
    return (
      this.formValues().get(node.id) ??
      formValueOf(node.kind === 'tool' ? node.params : undefined, form)
    );
  }

  protected chipTextOf(value: unknown): string {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  /**
   * A setting edit: the stored form value becomes the emitted one, and the file node gets the params of
   * paramsAfterEdit. The vflow node's data is set in place, so the form stays mounted (C-13).
   */
  protected onSettings(nodeId: string, emitted: ToolArguments): void {
    const current = this.file();
    const node = current?.nodes.find((candidate) => candidate.id === nodeId);
    const views = this.readyViewsOf(nodeId);
    if (current === undefined || node?.kind !== 'tool' || views === undefined) {
      return;
    }
    this.formValues.update((map) => new Map(map).set(nodeId, emitted));
    const params = paramsAfterEdit(node.params, emitted, views.form);
    const next: FileNode = params === undefined ? node : { ...node, params };
    this.file.set(replaceNode(current, next));
    this.nodes()
      .find((vnode) => vnode.id === nodeId)
      ?.data?.set(next);
    this.scheduleValidation();
  }

  private appendNode(current: GraphFile, node: FileNode): void {
    const next = withNode(current, node);
    this.file.set(next);
    this.nodes.set([...this.nodes(), vflowNodeOf(node)]);
    this.scheduleValidation();
  }

  private scheduleValidation(): void {
    this.changes.next();
  }

  /** The validate request of the unsaved file. A failed request keeps the previous issues. */
  private validate(): Observable<ValidationResult> {
    const current = this.file();
    if (current === undefined) return EMPTY;
    return this.api
      .post(graphValidatePath(), current, validationResultCopy)
      .pipe(catchError(() => EMPTY));
  }

  /** Sets the panel's issues and the labels of the wires that they name. */
  private setIssues(issues: readonly ValidationIssue[]): void {
    this.issues.set(issues);
    labelWires(this.edges(), issues);
  }

  private rebuildEdges(file: GraphFile): void {
    this.edges.set(vflowEdgesOf(file));
    labelWires(this.edges(), this.issues());
  }

  private load(id: string): Observable<void> {
    this.graphId = id;
    this.loadFailed.set(false);
    this.refusal.set(undefined);
    return this.api.get(graphPath(id), graphDetailCopy).pipe(
      switchMap((detail) =>
        this.readTools(detail.graph).pipe(map((reads) => ({ detail, reads }))),
      ),
      tap(({ detail, reads }) => {
        this.file.set(detail.graph);
        this.rows.set(reads.rows);
        this.details.set(reads.details);
        const values = new Map<string, ToolArguments>();
        for (const node of detail.graph.nodes) {
          if (node.kind !== 'tool') continue;
          const views = reads.details.get(node.tool);
          if (typeof views === 'object') {
            values.set(node.id, formValueOf(node.params, views.form));
          }
        }
        this.formValues.set(values);
        this.nodes.set(vflowNodesOf(detail.graph));
        this.rebuildEdges(detail.graph);
        this.setIssues(detail.issues);
        this.newKind.set(
          detail.graph.view === 'story' ? STORY_KINDS[0] : RECIPE_KINDS[0],
        );
        this.selectedNodes.set([]);
        this.selectedEdges.set([]);
      }),
      map(() => undefined),
      catchError(() => {
        this.file.set(undefined);
        this.loadFailed.set(true);
        return EMPTY;
      }),
    );
  }

  /**
   * The tool list, and the detail of each enabled, valid tool the graph names. A failed read is caught: a failed
   * list leaves every tool unavailable, and a failed detail leaves its tool unavailable (or unknown, on a 404).
   */
  private readTools(graph: GraphFile): Observable<{
    rows: readonly ToolSummary[] | undefined;
    details: ReadonlyMap<string, ToolDetailRead>;
  }> {
    const names = [
      ...new Set(
        graph.nodes.flatMap((node) =>
          node.kind === 'tool' ? [node.tool] : [],
        ),
      ),
    ];
    return this.api.get(TOOLS_PATH, toolListCopy).pipe(
      map((list) => list.tools),
      catchError(() => of(undefined)),
      switchMap((rows) => {
        const readable =
          rows === undefined
            ? []
            : names.filter((name) => {
                const row = effectiveRowOf(rows, name);
                return row !== undefined && row.enabled && row.valid;
              });
        if (readable.length === 0) {
          return of({ rows, details: new Map<string, ToolDetailRead>() });
        }
        return forkJoin(
          readable.map((name) =>
            this.readDetail(name).pipe(map((read) => [name, read] as const)),
          ),
        ).pipe(map((entries) => ({ rows, details: new Map(entries) })));
      }),
    );
  }

  /** One tool's views, or its failure. A null view is a read that failed. */
  private readDetail(name: string): Observable<ToolDetailRead> {
    return this.api.get(toolPath(name), toolViewsCopy).pipe(
      map(({ views }): ToolDetailRead => views ?? 'failed'),
      catchError((error: unknown) => of<ToolDetailRead>(failureOf(error))),
    );
  }
}
