import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  type ActivatedRouteSnapshot,
  Router,
  RouterLink,
} from '@angular/router';
import {
  CdkDrag,
  type CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import type {
  GraphFile,
  NodeRunState,
  RunState,
  ValidationIssue,
  ValidationResult,
} from '@bbartolome/scriba-contracts/graph-runner';
import type { FileEntry } from '@bbartolome/scriba-contracts/project-store';
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
import { API_CLIENT, ApiError, SSE_CLIENT } from '../../shell';
import { ToolForm } from '../tool-registry/tool-registry.routes';
import {
  chipDropRefusalOf,
  type EntityChip,
  type EntityItem,
  groupEntitiesOf,
  pinnedParamsAfterDrop,
  pinnedParamsAfterRemoval,
} from './entity-chips';
import {
  currentRunCopy,
  entitiesPath,
  entityListCopy,
  fileListCopy,
  graphDetailCopy,
  graphPath,
  graphSavePath,
  graphValidatePath,
  projectFilesPath,
  nodeStatusDataCopy,
  RUN_CURRENT_PATH,
  RUN_STOP_PATH,
  RUNS_PATH,
  runEndedDataCopy,
  runStartCopy,
  stopCopy,
  TOOLS_PATH,
  toolListCopy,
  toolPath,
  toolViewsCopy,
  validationResultCopy,
} from './graph-runner-contract';
import { arrangeOf } from './layout';
import { RunDialog } from './run-dialog';
import {
  type DialogField,
  type DialogValues,
  dialogFieldsOf,
  foldNodeStatus,
  foldRunEnded,
  runOfGraph,
  runRequestOf,
  scopeOfRecipe,
} from './run-state';
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
  splitPort,
  toolStateOf,
  type ToolDetailRead,
  type ToolState,
  TOOL_STATE_LINES,
  typeGlyphOf,
} from './tool-nodes';
import {
  fileChoicesOf,
  folderOfKind,
  pathChoicesOf,
  RELATION_OPTIONS,
  withPath,
  withRelation,
} from './story-view';

/** The kinds the controls offer, per view. */
const STORY_KINDS: readonly string[] = ['entity', 'scene', 'beat'];
const RECIPE_KINDS: readonly string[] = ['input', 'output'];

/** The port types an input node can carry. */
const PORT_TYPES: readonly PortType[] = ['text', 'entity', 'style'];

/** The quiet time after the last change before the file is validated (C-10). */
const VALIDATE_DELAY_MS = 300;

/** The nodes a change detection adds to the vflow at most, so that no task creates more node views than this (GRR-15 criterion 3). */
const RENDER_CHUNK = 25;

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

/** The project id of the route: the first `projectId` param from the root, or '' when there is none (C-16). */
function projectIdOfRoute(snapshot: ActivatedRouteSnapshot): string {
  for (const part of snapshot.pathFromRoot) {
    const id = part.paramMap.get('projectId');
    if (id !== null) return id;
  }
  return '';
}

/** A node's result: a tool result (output and cited ids) or an output result (pending change and path). */
type NodeResultOf = NonNullable<NodeRunState['result']>;
type ToolResultOf = Extract<NodeResultOf, { output: unknown }>;
type OutputResultOf = Extract<NodeResultOf, { pendingChangeId: unknown }>;

/** The tool result of a node, when it has one. */
function toolResultOf(
  result: NodeResultOf | undefined,
): ToolResultOf | undefined {
  return result !== undefined && 'output' in result ? result : undefined;
}

/** The output result of a node, when it has one. */
function outputResultOf(
  result: NodeResultOf | undefined,
): OutputResultOf | undefined {
  return result !== undefined && 'pendingChangeId' in result
    ? result
    : undefined;
}

/** The label of a run's status on the canvas. */
const RUN_STATUS_LABELS: Readonly<Record<RunState['status'], string>> = {
  running: 'Running',
  done: 'Done',
  error: 'Error',
  stopped: 'Stopped',
};

/** The state of the input-values dialog: its heading, its fields, and the start in progress or refused. */
interface DialogState {
  readonly title: string;
  /** The target node of a run to here; undefined for a whole run. */
  readonly target: string | undefined;
  readonly fields: readonly DialogField[];
  readonly busy: boolean;
  readonly failure: string;
}

/**
 * The canvas of one graph (`:graphId`): the view is story or recipe, from the file. Nodes can be moved,
 * added and removed, wires and edges can be connected and removed, and the whole file is saved. A recipe
 * also lists the palette, draws its tool nodes from the registry, and shows the live validation.
 */
@Component({
  imports: [
    Vflow,
    ToolForm,
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
    RouterLink,
    RunDialog,
  ],
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
              <button
                type="button"
                [disabled]="!editable()"
                (click)="addTool(tool.name)"
              >
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
        <button type="button" [disabled]="!editable()" (click)="add()">
          Add
        </button>
        <button
          type="button"
          [disabled]="!editable()"
          (click)="deleteSelected()"
        >
          Delete selected
        </button>
        <button type="button" [disabled]="!editable()" (click)="save()">
          Save
        </button>
        <button
          type="button"
          data-arrange
          [disabled]="!editable()"
          (click)="arrange()"
        >
          Arrange
        </button>
        @if (!isStory()) {
          <button
            type="button"
            data-run
            [disabled]="runBlocked() || !editable()"
            (click)="openRun()"
          >
            Run
          </button>
          @if (currentRun(); as run) {
            <p data-run-status>{{ runStatusOf(run) }}</p>
          }
          @if (currentRun()?.status === 'running') {
            <button type="button" data-stop (click)="stop()">Stop</button>
          }
          <ul data-run-reasons class="run-reasons">
            @for (issue of blocking(); track $index) {
              <li>{{ issue.message }}</li>
            }
          </ul>
        }
      </div>
      @if (dialog(); as open) {
        <app-run-dialog
          [title]="open.title"
          [fields]="open.fields"
          [projectId]="projectId()"
          [busy]="open.busy"
          [failure]="open.failure"
          (start)="onStart($event)"
          (cancel)="closeDialog()"
        />
      }
      @if (isStory()) {
        <section class="story-panel" aria-label="Story details">
          <h3>Files</h3>
          <ul>
            @for (node of storyNodes(); track node.id) {
              <li [attr.data-story-node]="node.id">
                <span>{{ node.label }}</span>
                <select
                  data-path-picker
                  (change)="setPath(node.id, $any($event.target).value)"
                >
                  <option value="" [selected]="!node.path">No file</option>
                  @for (choice of choicesOf(node); track choice) {
                    <option [value]="choice" [selected]="choice === node.path">
                      {{ choice }}
                    </option>
                  }
                </select>
                @if (node.path) {
                  <button
                    type="button"
                    data-open-file
                    (click)="openFile(node.path)"
                  >
                    Open file
                  </button>
                }
              </li>
            }
          </ul>
          <h3>Relations</h3>
          <ul>
            @for (edge of storyEdges(); track edge.id) {
              <li [attr.data-story-edge]="edge.id">
                <span>{{ edge.from }} -> {{ edge.to }}</span>
                <input
                  type="text"
                  list="relation-options"
                  [value]="edge.relation ?? ''"
                  (change)="setRelation(edge.id, $any($event.target).value)"
                />
              </li>
            }
          </ul>
          <datalist id="relation-options">
            @for (option of relationOptions; track option.value) {
              <option [value]="option.value"></option>
            }
          </datalist>
          <p class="relation-meanings">
            @for (option of relationOptions; track option.value) {
              <span>{{ option.value }}: {{ option.meaning }}. </span>
            }
          </p>
        </section>
      }
      <div class="canvas-row" cdkDropListGroup>
        @if (!isStory()) {
          <aside class="entities" aria-label="Project entities">
            <p role="status" class="drop-reason" data-drop-reason>
              {{ dropReason() }}
            </p>
            <input
              type="search"
              data-entity-search
              aria-label="Search entities"
              placeholder="Search entities"
              [value]="entityQuery()"
              (input)="entityQuery.set($any($event.target).value)"
            />
            @if (projectId() === '') {
              <p>No active project</p>
            } @else if (entities() === undefined) {
              <p>Entities could not be read.</p>
            }
            @for (group of entityGroups(); track group.type) {
              <section [attr.data-group]="group.type">
                <h3>{{ group.type }}</h3>
                @for (entity of group.entities; track entity.id) {
                  <div
                    cdkDropList
                    class="chip-slot"
                    [cdkDropListSortingDisabled]="true"
                  >
                    <span
                      cdkDrag
                      [cdkDragDisabled]="!editable()"
                      class="chip"
                      [attr.data-entity]="entity.id"
                      [cdkDragData]="{ id: entity.id, type: entity.type }"
                      >{{ entity.id }}</span
                    >
                  </div>
                }
              </section>
            }
          </aside>
        }
        <vflow
          [view]="'auto'"
          [nodes]="renderedNodes()"
          [edges]="renderedEdges()"
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
                @if (!isStory()) {
                  @if (currentRun(); as run) {
                    @if (run.nodes[ctx.node.id]; as state) {
                      <span class="badge" [attr.data-status]="state.status">{{
                        state.status
                      }}</span>
                    }
                  }
                }
              </div>
              @if (isStory()) {
                <handle type="target" position="left"></handle>
                <handle type="source" position="right"></handle>
                @if (pathMissing().has(ctx.node.id)) {
                  <span class="badge" data-badge="path-missing"
                    >File missing</span
                  >
                }
              } @else {
                @if (stateLineOf(ctx.node.id); as line) {
                  <p class="tool-state">{{ line }}</p>
                }
                @for (row of rowsOf(ctx.node.id, ctx.data()); track row.key) {
                  <div
                    class="port-row"
                    cdkDropList
                    [cdkDropListDisabled]="!isChipTarget(ctx.data(), row)"
                    [attr.data-drop-port]="
                      isChipTarget(ctx.data(), row)
                        ? portIdOf(ctx.node.id, row.key)
                        : null
                    "
                    (cdkDropListDropped)="
                      onChipDrop(portIdOf(ctx.node.id, row.key), $event)
                    "
                  >
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
                      <span
                        class="chip"
                        [attr.data-pinned]="portIdOf(ctx.node.id, row.key)"
                      >
                        {{ chipTextOf(chip) }}
                        <button
                          type="button"
                          data-remove
                          [attr.aria-label]="'Remove ' + chipTextOf(chip)"
                          (click)="removeChip(ctx.node.id, row.key, $index)"
                        >
                          ×
                        </button>
                      </span>
                    }
                  </div>
                }
                @if (currentRun(); as run) {
                  @if (run.nodes[ctx.node.id]; as state) {
                    @if (state.error; as error) {
                      <p data-node-error>{{ error.message }}</p>
                    }
                    @if (toolResultOf(state.result); as tool) {
                      <details data-result>
                        <summary>Result</summary>
                        <pre data-result-text>{{ tool.output.content }}</pre>
                        <ul data-sources>
                          @for (id of tool.sourcesUsed; track id) {
                            <li>{{ id }}</li>
                          }
                        </ul>
                      </details>
                    }
                    @if (outputResultOf(state.result); as output) {
                      <a
                        data-review-link
                        [routerLink]="['/projects', projectId(), 'review']"
                        [queryParams]="{ run: run.runId }"
                        >Review pending change {{ output.pendingChangeId }}</a
                      >
                    }
                  }
                }
                @if (
                  ctx.data().kind === 'tool' || ctx.data().kind === 'output'
                ) {
                  <button
                    type="button"
                    data-run-to-here
                    [disabled]="!editable() || runBlocked()"
                    (click)="openRunTo(ctx.node.id)"
                  >
                    Run to here
                  </button>
                }
                @if (readyViewsOf(ctx.node.id); as views) {
                  <fieldset [disabled]="!editable()">
                    <app-tool-form
                      [form]="views.form"
                      layout="node-body"
                      [value]="formValueFor(ctx.data(), views.form)"
                      (valueChange)="onSettings(ctx.node.id, $event)"
                    />
                  </fieldset>
                }
              }
            </div>
          </ng-template>
        </vflow>
      </div>
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
      border: 1px solid var(--mat-sys-outline);
      border-radius: 6px;
      padding: 4px 8px;
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface);
    }
    .vnode.issue {
      border-color: var(--mat-sys-error);
      border-width: 2px;
    }
    .vnode-head {
      display: flex;
      gap: 8px;
    }
    .port-row {
      display: block;
      /* Two rows closer than the library's magnet radius (20 px) overlap: a drop lands on the later row. */
      min-height: 40px;
    }
    circle.issue {
      stroke: var(--mat-sys-error);
      stroke-width: 3px;
    }
    .story-panel {
      border-top: 1px solid var(--mat-sys-outline-variant);
      padding: 4px 0;
    }
    [data-badge] {
      margin-left: 4px;
      padding: 0 4px;
      border: 1px solid var(--mat-sys-error);
      border-radius: 8px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
    .chip {
      display: inline-block;
      margin-left: 4px;
      padding: 0 4px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 8px;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    .port-glyph.port-text {
      color: var(--mat-sys-primary);
    }
    .port-glyph.port-entity {
      color: var(--mat-sys-tertiary);
    }
    .port-glyph.port-style {
      color: var(--mat-sys-secondary);
    }
    .badge[data-status='idle'] {
      background: var(--mat-sys-surface-variant);
      color: var(--mat-sys-on-surface-variant);
    }
    .badge[data-status='queued'] {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    .badge[data-status='running'] {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    .badge[data-status='done'] {
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
    .badge[data-status='error'] {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
    .badge[data-status='stopped'] {
      background: var(--mat-sys-surface-container-highest);
      color: var(--mat-sys-on-surface);
    }
    .canvas-row {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .canvas-row vflow {
      flex: 1;
      min-width: 0;
    }
    .entities {
      display: grid;
      gap: 4px;
      align-content: start;
      width: 220px;
      flex: none;
    }
    .drop-reason {
      /* One line of height when empty, so writing a reason moves no row (C-11). */
      min-height: 1.4em;
      margin: 0;
    }
    /* The placeholder CDK appends into an entered row is hidden, so the row keeps its size (D14). */
    :host ::ng-deep .port-row .cdk-drag-placeholder {
      display: none;
    }
  `,
})
export class CanvasPage {
  private readonly api = inject(API_CLIENT);
  private readonly events = inject(SSE_CLIENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  protected readonly loadFailure = LOAD_FAILURE;
  protected readonly saveFailure = SAVE_FAILURE;

  protected readonly portIdOf = portIdOf;
  protected readonly labelOf = labelOf;
  protected readonly toolResultOf = toolResultOf;
  protected readonly outputResultOf = outputResultOf;
  protected readonly glyphOf = typeGlyphOf;
  protected readonly portTypes = PORT_TYPES;

  /** The graph file as it was received and changed: the state that is saved. */
  protected readonly file = signal<GraphFile | undefined>(undefined);
  protected readonly issues = signal<readonly ValidationIssue[]>([]);
  protected readonly refusal = signal<Refusal | undefined>(undefined);
  protected readonly loadFailed = signal(false);
  /** The project's files, read once per load of a story (C-6). */
  protected readonly files = signal<readonly FileEntry[]>([]);
  protected readonly relationOptions = RELATION_OPTIONS;

  /** The vflow state, derived from the file. */
  protected readonly nodes = signal<VflowNode[]>([]);
  protected readonly edges = signal<Edge[]>([]);

  // The chunked render (GRR-15 criterion 3): only what reaches the vflow is chunked. The canvas state above
  // always holds every node. A graph of RENDER_CHUNK nodes or fewer renders in one pass (the limit is infinite).
  private readonly renderLimit = signal(Number.POSITIVE_INFINITY);
  private renderGeneration = 0;
  private chunkTimer: ReturnType<typeof setTimeout> | undefined;
  protected readonly renderedNodes = computed(() => {
    const all = this.nodes();
    const limit = this.renderLimit();
    return all.length <= limit ? all : all.slice(0, limit);
  });
  // Wires reach the vflow only when every node does, so no wire points at a node that is not rendered yet.
  protected readonly renderedEdges = computed(() =>
    this.nodes().length <= this.renderLimit() ? this.edges() : [],
  );

  protected readonly selectedNodes = signal<readonly string[]>([]);
  protected readonly selectedEdges = signal<readonly string[]>([]);

  protected readonly isStory = computed(() => this.file()?.view === 'story');
  protected readonly storyNodes = computed(() => {
    const current = this.file();
    return current?.view === 'story' ? current.nodes : [];
  });
  protected readonly storyEdges = computed(() => {
    const current = this.file();
    return current?.view === 'story' ? current.edges : [];
  });
  /** The nodes whose file is missing, from the issues of the load or of the latest validation. */
  protected readonly pathMissing = computed(
    () =>
      new Set(
        this.issues().flatMap((issue) =>
          issue.code === 'path-missing' && issue.nodeId !== undefined
            ? [issue.nodeId]
            : [],
        ),
      ),
  );
  protected readonly kindOptions = computed(() =>
    this.isStory() ? STORY_KINDS : RECIPE_KINDS,
  );
  protected readonly newKind = signal('entity');
  protected readonly newLabel = signal('');
  protected readonly newType = signal<PortType>('text');
  protected readonly newEntityKind = signal('');
  protected readonly newPath = signal('');

  /** The project of the canvas route, set by each load (C-2); '' when the route has none. */
  protected readonly projectId = signal('');
  /** The project's entities, read once per graph load; undefined for a story, no project or a failed read. */
  protected readonly entities = signal<readonly EntityItem[] | undefined>(
    undefined,
  );
  protected readonly entityQuery = signal('');
  protected readonly entityGroups = computed(() =>
    groupEntitiesOf(this.entities() ?? [], this.entityQuery()),
  );
  /** The one line of the last refused drop; empty after an accepted drop (C-11). */
  protected readonly dropReason = signal('');
  /** The id of the graph on the page, from the route. A new id loads a new graph. */
  private readonly currentGraphId = signal<string | undefined>(undefined);
  /** The run state of the active project: the current run, folded with its node and end events. */
  private readonly run = signal<RunState | null>(null);
  /** True from the Start click until the first current-run read after the start answers (C-3). */
  protected readonly starting = signal(false);
  private awaitingStartRead = false;
  /** The input-values dialog, when it is open. */
  protected readonly dialog = signal<DialogState | undefined>(undefined);
  /** Counts the stream's events: a read sent before the latest event is answered again (C-2). */
  private eventSeq = 0;
  /** A read of the current run; the latest read wins. */
  private readonly reads = new Subject<void>();

  /** The current run, when it is this graph's. */
  protected readonly currentRun = computed(() =>
    runOfGraph(this.run(), this.currentGraphId() ?? ''),
  );
  /** True while this recipe's run is running (C-3). A story never runs. */
  protected readonly running = computed(
    () => !this.isStory() && this.currentRun()?.status === 'running',
  );
  /** The canvas is editable unless a run is running or starting (C-3, D9). */
  protected readonly editable = computed(
    () => !this.running() && !this.starting(),
  );

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

  /** The views of each ready tool node, by node id: what a chip drop is checked against (C-5). */
  private readonly readyViews = computed(
    () =>
      new Map(
        [...this.toolNodes()].flatMap(([id, view]) =>
          view.views === undefined ? [] : [[id, view.views] as const],
        ),
      ),
  );

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
              this.editable() &&
              (current === undefined ||
                acceptsWire(current, ends, this.readyPorts()))
            );
          },
        },
  );

  /** A change of the file, which schedules one validation (C-10). */
  private readonly changes = new Subject<void>();

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.renderGeneration += 1;
      clearTimeout(this.chunkTimer);
    });

    // No node moves while a run is active (C-11): the vnodes are rebuilt locked or unlocked from the file
    // when the lock differs from their shape. The rebuilt set passes the check, so the effect stops.
    effect(() => {
      const locked = !this.editable();
      const nodes = this.nodes();
      if (nodes.every((node) => (node.draggable !== undefined) === locked))
        return;
      const file = untracked(() => this.file());
      if (file !== undefined) this.nodes.set(vflowNodesOf(file, locked));
    });

    // The current run: a read sets it; the latest read wins, and a read answered after an event is read again.
    this.reads
      .pipe(
        switchMap(() => {
          const sent = this.eventSeq;
          return this.api.get(RUN_CURRENT_PATH, currentRunCopy).pipe(
            map((body) => ({ sent, run: body.run })),
            catchError(() => of({ sent, run: undefined })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ sent, run }) => {
        if (sent !== this.eventSeq) {
          this.reads.next();
          return;
        }
        if (run !== undefined) this.run.set(run);
        if (this.awaitingStartRead) {
          this.awaitingStartRead = false;
          this.starting.set(false);
        }
      });

    // The run's events fold into the run state; a start reads the state again (C-2).
    this.events
      .stream('graph-runner')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((envelope) => {
        this.eventSeq += 1;
        if (envelope.type === 'node-status') {
          const checked = nodeStatusDataCopy.safeParse(envelope.data);
          if (checked.success) {
            this.run.update((run) =>
              run === null ? run : foldNodeStatus(run, checked.data),
            );
          }
        } else if (envelope.type === 'run-ended') {
          const checked = runEndedDataCopy.safeParse(envelope.data);
          if (checked.success) {
            this.run.update((run) =>
              run === null ? run : foldRunEnded(run, checked.data),
            );
          }
        } else if (envelope.type === 'run-started') {
          this.reads.next();
        }
      });

    // A reconcile tick re-reads the current run (the reconcile rule of C-2).
    this.events.reconcile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reads.next());

    // The id comes from the child route; a new id loads a new graph. The project id is read from the route's
    // snapshot, not from ActiveProjectSignal, which is not yet current during load (C-16).
    const route = inject(ActivatedRoute);
    route.paramMap
      .pipe(
        map((params) => params.get('graphId') ?? ''),
        distinctUntilChanged(),
        switchMap((id) => this.load(id, projectIdOfRoute(route.snapshot))),
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
    if (!this.editable() || current === undefined) return;
    const next = withConnection(current, connection);
    this.file.set(next);
    this.rebuildEdges(next);
    this.scheduleValidation();
  }

  /** A position change writes the file only where the point differs from the file's position (C4). */
  protected onMove(changes: readonly NodePositionChange[]): void {
    const before = this.file();
    if (!this.editable() || before === undefined) return;
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
    if (!this.editable() || current === undefined) return;
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
    if (!this.editable()) return;
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
          if (!this.editable() || current === undefined) return;
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
    if (!this.editable() || current === undefined) return;
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

  /** Sets a story node's file. An empty path removes it; the vflow node's data follows (C-10). */
  protected setPath(nodeId: string, path: string): void {
    const current = this.file();
    if (current === undefined) return;
    const next = withPath(current, nodeId, path);
    if (next === current) return;
    this.file.set(next);
    const node = next.nodes.find((candidate) => candidate.id === nodeId);
    if (node !== undefined) {
      this.nodes()
        .find((vnode) => vnode.id === nodeId)
        ?.data?.set(node);
    }
    this.scheduleValidation();
  }

  /** Sets an edge's relation from the picker's text, trimmed; the edges are rebuilt so the label shows (C-10). */
  protected setRelation(edgeId: string, relation: string): void {
    const current = this.file();
    if (current === undefined) return;
    const next = withRelation(current, edgeId, relation.trim());
    if (next === current) return;
    this.file.set(next);
    this.rebuildEdges(next);
    this.scheduleValidation();
  }

  /** Opens a story node's file in the files page, in the project of the route (D4, C-4). */
  protected openFile(path: string): void {
    const projectId = this.projectId();
    if (projectId === '') return;
    void this.router.navigate(['/projects', projectId, 'files'], {
      queryParams: { path },
    });
  }

  /** The file choices of a node's picker: its folder's files, and its current path (C-3). */
  protected choicesOf(node: {
    readonly kind: string;
    readonly path?: string;
  }): string[] {
    return pathChoicesOf(
      fileChoicesOf(this.files(), folderOfKind(node.kind)),
      node.path,
    );
  }

  /**
   * Lays the file out (C-9). The vflow nodes' points and data are set in place, so tool forms stay mounted.
   * Nothing is saved: the author saves the result like any edit.
   */
  protected arrange(): void {
    if (!this.editable()) return;
    const current = this.file();
    if (current === undefined) return;
    const next = arrangeOf(current);
    this.file.set(next);
    for (const vnode of this.nodes()) {
      const node = next.nodes.find((candidate) => candidate.id === vnode.id);
      if (node === undefined) continue;
      vnode.point.set({ x: node.position.x, y: node.position.y });
      vnode.data?.set(node);
    }
    this.scheduleValidation();
  }

  /** Saves the whole file. The response's issues replace the panel's; a refusal is shown in it. */
  protected save(): void {
    const current = this.file();
    const graphId = this.currentGraphId();
    if (!this.editable() || current === undefined || graphId === undefined) {
      return;
    }
    this.api
      .post(graphSavePath(graphId), current, validationResultCopy)
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

  /** Run: opens the input-values dialog for the whole recipe (C-5, C-10). */
  protected openRun(): void {
    this.openDialog(undefined, 'Run the whole recipe');
  }

  /** Run to here: opens the dialog for the target and its upstream (D13). */
  protected openRunTo(nodeId: string): void {
    this.openDialog(nodeId, `Run to ${nodeId}`);
  }

  protected closeDialog(): void {
    this.dialog.set(undefined);
  }

  /** The dialog's Start: posts the run (C-7). The dialog closes on success; a refusal is shown in it. */
  protected onStart(values: DialogValues): void {
    const open = this.dialog();
    const graphId = this.currentGraphId();
    if (open === undefined || graphId === undefined) return;
    this.dialog.set({ ...open, busy: true, failure: '' });
    this.starting.set(true);
    this.api
      .post(RUNS_PATH, runRequestOf(graphId, values, open.target), runStartCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.dialog.set(undefined);
          this.awaitingStartRead = true;
          this.reads.next();
        },
        error: (error: unknown) => {
          this.starting.set(false);
          this.dialog.update(
            (current) =>
              current && {
                ...current,
                busy: false,
                failure:
                  error instanceof ApiError
                    ? error.message
                    : 'The run did not start.',
              },
          );
        },
      });
  }

  /** Stop posts the run id only; the page changes nothing until `run-ended` arrives (C-8). */
  protected stop(): void {
    const run = this.currentRun();
    if (run === undefined) return;
    this.api
      .post(RUN_STOP_PATH, { runId: run.runId }, stopCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => this.reads.next() });
  }

  /** The run's status line: its label and its reason, when it has one. */
  protected runStatusOf(run: RunState): string {
    const label = RUN_STATUS_LABELS[run.status];
    return run.reason === undefined ? label : `${label} (${run.reason})`;
  }

  /** The dialog's fields for a run to `target`, or for the whole recipe (W3). */
  private openDialog(target: string | undefined, title: string): void {
    const current = this.file();
    if (!this.editable() || current === undefined) return;
    const forms = new Map<string, FormDescriptor['fields']>();
    for (const [name, detail] of this.details()) {
      if (typeof detail === 'object') forms.set(name, detail.form.fields);
    }
    this.dialog.set({
      title,
      target,
      fields: dialogFieldsOf(current, scopeOfRecipe(current, target), forms),
      busy: false,
      failure: '',
    });
  }

  /** The rows of a node: a tool node's rows exist only while it is ready. */
  protected rowsOf(id: string, node: FileNode): readonly PortRow[] {
    return portRowsOf(node, this.readyPorts().get(id));
  }

  protected readyViewsOf(id: string): ToolViews | undefined {
    return this.toolNodes().get(id)?.views;
  }

  /** The input rows of a ready tool node take chips (D10); no other row does. */
  protected isChipTarget(node: FileNode, row: PortRow): boolean {
    return node.kind === 'tool' && row.side === 'input';
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
    if (
      !this.editable() ||
      current === undefined ||
      node?.kind !== 'tool' ||
      views === undefined
    ) {
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

  /**
   * A chip dropped on a port of a ready tool node (C-4 to C-6). A drop outside every row does nothing. A refusal
   * shows its reason and writes nothing; an accepted drop clears the reason and pins the chip in the node's params.
   */
  protected onChipDrop(portId: string, event: CdkDragDrop<unknown>): void {
    if (!this.editable()) return;
    if (!event.isPointerOverContainer) return;
    const current = this.file();
    const { nodeId, key } = splitPort(portId);
    const node = current?.nodes.find((candidate) => candidate.id === nodeId);
    const views = this.readyViewsOf(nodeId);
    if (current === undefined || node?.kind !== 'tool' || views === undefined) {
      return;
    }
    const chip = event.item.data as EntityChip;
    const reason = chipDropRefusalOf(current, portId, chip, this.readyViews());
    this.dropReason.set(reason ?? '');
    if (reason !== undefined) return;
    const port = views.ports.inputs.find((candidate) => candidate.key === key);
    if (port === undefined) return;
    const params = pinnedParamsAfterDrop(node.params, port, chip);
    if (params === node.params) return;
    this.writeParams(current, node, params);
  }

  /** Removes one pinned chip: the item at its index of a list port, or the key of a scalar port (C-8). */
  protected removeChip(nodeId: string, key: string, index: number): void {
    if (!this.editable()) return;
    const current = this.file();
    const node = current?.nodes.find((candidate) => candidate.id === nodeId);
    const port = this.readyPorts()
      .get(nodeId)
      ?.inputs.find((candidate) => candidate.key === key);
    if (current === undefined || node?.kind !== 'tool' || port === undefined) {
      return;
    }
    const params = pinnedParamsAfterRemoval(node.params, key, port.list, index);
    this.writeParams(current, node, params);
  }

  /**
   * Writes a node's params as a settings edit does (D9): the file, the vflow node's data in place, and one
   * validation. Undefined params remove the key, so a node with nothing left has no params (D18).
   */
  private writeParams(
    current: GraphFile,
    node: Extract<FileNode, { kind: 'tool' }>,
    params: Readonly<Record<string, unknown>> | undefined,
  ): void {
    const next = { ...node };
    if (params === undefined) delete next.params;
    else next.params = params;
    this.file.set(replaceNode(current, next));
    this.nodes()
      .find((vnode) => vnode.id === node.id)
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

  /** Starts the chunked render of a new load. A graph of RENDER_CHUNK nodes or fewer is rendered at once. */
  private startChunks(count: number): void {
    this.renderGeneration += 1;
    clearTimeout(this.chunkTimer);
    if (count <= RENDER_CHUNK) {
      this.renderLimit.set(Number.POSITIVE_INFINITY);
      return;
    }
    this.renderLimit.set(RENDER_CHUNK);
    this.nextChunk(this.renderGeneration);
  }

  /** After the current chunk is rendered, adds the next one in a new task (one change detection per task). */
  private nextChunk(generation: number): void {
    afterNextRender(
      () => {
        this.chunkTimer = setTimeout(() => {
          if (generation !== this.renderGeneration) return;
          const next = this.renderLimit() + RENDER_CHUNK;
          if (next >= this.nodes().length) {
            this.renderLimit.set(Number.POSITIVE_INFINITY);
          } else {
            this.renderLimit.set(next);
            this.nextChunk(generation);
          }
        }, 0);
      },
      { injector: this.injector },
    );
  }

  private rebuildEdges(file: GraphFile): void {
    this.edges.set(vflowEdgesOf(file));
    labelWires(this.edges(), this.issues());
  }

  private load(id: string, projectId: string): Observable<void> {
    this.currentGraphId.set(id);
    this.projectId.set(projectId);
    this.loadFailed.set(false);
    this.refusal.set(undefined);
    this.reads.next();
    return this.api.get(graphPath(id), graphDetailCopy).pipe(
      switchMap((detail) =>
        forkJoin({
          reads: this.readTools(detail.graph),
          files: this.readFiles(detail.graph, projectId),
          entities: this.readEntities(detail.graph, projectId),
        }).pipe(map((joined) => ({ detail, ...joined }))),
      ),
      tap(({ detail, reads, files, entities }) => {
        this.file.set(detail.graph);
        this.files.set(files);
        this.entities.set(entities);
        this.dropReason.set('');
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
        this.startChunks(detail.graph.nodes.length);
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

  /** The project's files, one recursive read, for a story in a known project (C-6). A failed read gives no choices. */
  private readFiles(
    graph: GraphFile,
    projectId: string,
  ): Observable<readonly FileEntry[]> {
    if (graph.view !== 'story' || projectId === '') return of([]);
    return this.api
      .get(projectFilesPath(projectId), fileListCopy, {
        path: '.',
        recursive: 'true',
      })
      .pipe(
        map((list) => list.entries),
        catchError(() => of([])),
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

  /**
   * The project's entity list for the side list. It is undefined for a story graph, for no active project, and
   * for a failed read; the aside tells the last two apart.
   */
  private readEntities(
    graph: GraphFile,
    projectId: string,
  ): Observable<readonly EntityItem[] | undefined> {
    if (graph.view === 'story' || projectId === '') return of(undefined);
    return this.api.get(entitiesPath(projectId), entityListCopy).pipe(
      map((list) => list.entities),
      catchError(() => of(undefined)),
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
