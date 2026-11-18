import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import type {
  GraphFile,
  ValidationIssue,
} from '@bbartolome/scriba-contracts/graph-runner';
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
  distinctUntilChanged,
  EMPTY,
  map,
  Observable,
  switchMap,
  tap,
} from 'rxjs';
import { API_CLIENT, ApiError } from '../../shell';
import {
  graphDetailCopy,
  graphPath,
  graphSavePath,
  validationResultCopy,
} from './graph-runner-contract';
import {
  type FileNode,
  nextNodeId,
  portIdOf,
  type VflowNode,
  vflowEdgesOf,
  vflowNodesOf,
  withConnection,
  withNode,
  withoutEdges,
  withoutNodes,
  withPosition,
} from './vflow-adapter';

/** One port row of a node: its side and its port key. Structurally a subset of the tool form's row. */
export interface PortRow {
  readonly side: 'input' | 'output';
  readonly key: string;
}

/** The kinds the controls offer, per view. A tool node is not offered: its palette is GRR-11's. */
const STORY_KINDS: readonly string[] = ['entity', 'scene', 'beat'];
const RECIPE_KINDS: readonly string[] = ['input', 'output'];

/** The line shown when the graph file cannot be read. */
const LOAD_FAILURE = 'The graph could not be loaded.';

/** The line shown when a save is refused or fails. */
const SAVE_FAILURE = 'The graph was not saved.';

/** The one-line status of the last refused save, with the server's message when there is one. */
interface Refusal {
  readonly detail: string;
}

/** The port rows of a recipe node. A tool node's input rows come from the registry in GRR-11. */
function portRowsOf(node: FileNode): readonly PortRow[] {
  switch (node.kind) {
    case 'input':
      return [{ side: 'output', key: 'out' }];
    case 'output':
      return [{ side: 'input', key: 'in' }];
    case 'tool':
      return [{ side: 'output', key: 'output' }];
    default:
      return [];
  }
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
): FileNode {
  if (view === 'story') {
    return { id, kind, label: label || kind, position } as FileNode;
  }
  if (kind === 'input') {
    return {
      id,
      kind: 'input',
      position,
      params: { type: 'text', label: label || 'Input' },
    };
  }
  return label === ''
    ? { id, kind: 'output', position }
    : { id, kind: 'output', position, params: { label } };
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

/**
 * The canvas of one graph (`:graphId`): the view is story or recipe, from the file. Nodes can be moved,
 * added and removed, wires and edges can be connected and removed, and the whole file is saved.
 */
@Component({
  imports: [Vflow, NgTemplateOutlet],
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
      </div>
      <vflow
        [nodes]="nodes()"
        [edges]="edges()"
        [connection]="connection"
        (connect)="onConnect($event)"
        (nodesChanges.position)="onMove($event)"
        (nodesChanges.select)="onNodeSelect($event)"
        (edgesChanges.select)="onEdgeSelect($event)"
      >
        <ng-template nodeHtml let-ctx>
          <div class="vnode" [attr.data-node]="ctx.node.id">
            <div class="vnode-head">
              <span>{{ ctx.data().kind }}</span>
              <span>{{ labelOf(ctx.data()) }}</span>
            </div>
            <ng-template #portRow let-row>
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
                  />
                </ng-template>
              </div>
            </ng-template>
            @if (isStory()) {
              <handle type="target" position="left"></handle>
              <handle type="source" position="right"></handle>
            } @else {
              @for (row of portRowsOf(ctx.data()); track $index) {
                <ng-container
                  [ngTemplateOutlet]="portRow"
                  [ngTemplateOutletContext]="{ $implicit: row }"
                ></ng-container>
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
    .vnode-head {
      display: flex;
      gap: 8px;
    }
    .port-row {
      display: block;
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
  protected readonly portRowsOf = portRowsOf;

  /** Connections need no validator here: the library's defaults apply (C7). */
  protected readonly connection: ConnectionSettings = {};

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

  protected readonly panelVisible = computed(
    () => this.issues().length > 0 || this.refusal() !== undefined,
  );

  /** The id of the graph on the page, from the route. */
  private graphId: string | undefined;

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
  }

  protected onConnect(connection: Connection): void {
    const current = this.file();
    if (current === undefined) return;
    const next = withConnection(current, connection);
    this.file.set(next);
    this.edges.set(vflowEdgesOf(next));
  }

  /** A position change writes the file only where the point differs from the file's position (C4). */
  protected onMove(changes: readonly NodePositionChange[]): void {
    let current = this.file();
    if (current === undefined) return;
    for (const change of changes) {
      current = withPosition(current, change.id, change.point);
    }
    this.file.set(current);
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
    );
    const next = withNode(current, node);
    this.file.set(next);
    this.nodes.set(vflowNodesOf(next));
    this.edges.set(vflowEdgesOf(next));
  }

  /** Removes the selected nodes with their wires and edges, and the selected edges. */
  protected deleteSelected(): void {
    const current = this.file();
    if (current === undefined) return;
    const next = withoutEdges(
      withoutNodes(current, this.selectedNodes()),
      this.selectedEdges(),
    );
    this.file.set(next);
    this.nodes.set(vflowNodesOf(next));
    this.edges.set(vflowEdgesOf(next));
    this.selectedNodes.set([]);
    this.selectedEdges.set([]);
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
          this.issues.set(issues);
          this.refusal.set(undefined);
        },
        error: (error: unknown) =>
          this.refusal.set({
            detail: error instanceof ApiError ? error.message : '',
          }),
      });
  }

  private load(id: string): Observable<void> {
    this.graphId = id;
    this.loadFailed.set(false);
    this.refusal.set(undefined);
    return this.api.get(graphPath(id), graphDetailCopy).pipe(
      tap((detail) => {
        this.file.set(detail.graph);
        this.issues.set(detail.issues);
        this.nodes.set(vflowNodesOf(detail.graph));
        this.edges.set(vflowEdgesOf(detail.graph));
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
}
