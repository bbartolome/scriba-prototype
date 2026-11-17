import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type {
  GraphSummary,
  RunState,
} from '@bbartolome/scriba-contracts/graph-runner';
import type { PendingChange } from '@bbartolome/scriba-contracts/project-store';
import { catchError, EMPTY, map, mergeMap, Observable, Subject } from 'rxjs';
import {
  ActiveProjectSignal,
  API_CLIENT,
  DeviceClassService,
  SSE_CLIENT,
} from '../../shell';
import {
  currentRunCopy,
  graphDeletePath,
  graphIdCopy,
  graphListCopy,
  graphRenamePath,
  GRAPH_CREATE_PATH,
  GRAPHS_PATH,
  noBodyCopy,
  pendingListCopy,
  pendingPath,
  RUN_CURRENT_PATH,
} from './graph-runner-contract';

/** Which source one read re-fetches. */
type Read = 'graphs' | 'run' | 'pending';

const ALL_READS: readonly Read[] = ['graphs', 'run', 'pending'];

/** The one plain line shown when a read or a command fails. The last shown state is kept. */
const FAILURE = 'The server did not answer. The last shown state is kept.';

/** One row of the list, with its badge and its latest run status. */
interface GraphRow {
  readonly graph: GraphSummary;
  readonly viewLabel: string;
  readonly pending: boolean;
  readonly status: RunState['status'] | undefined;
}

/**
 * The graphs list of the project: name, view, node count, validity, a pending-change badge and the
 * latest run status (read-only). Create, rename and delete are offered on tablet and desktop only.
 */
@Component({
  imports: [RouterLink],
  selector: 'app-graph-list-page',
  template: `
    <h2>Graphs</h2>
    @if (failure(); as message) {
      <p role="alert">{{ message }}</p>
    }
    @if (controls()) {
      <div class="create">
        <label for="graph-name">Graph name</label>
        <input
          id="graph-name"
          type="text"
          [value]="newName()"
          (input)="newName.set($any($event.target).value)"
        />
        <label for="graph-view">View</label>
        <select
          id="graph-view"
          [value]="newView()"
          (change)="newView.set($any($event.target).value)"
        >
          <option value="story">Story</option>
          <option value="recipe">Recipe</option>
        </select>
        <button type="button" (click)="create()">Create</button>
      </div>
    }
    @if (rows().length === 0) {
      <p>No graphs yet.</p>
    }
    <ul>
      @for (row of rows(); track row.graph.id) {
        <li>
          <a
            [routerLink]="['/projects', projectId(), 'graphs', row.graph.id]"
            >{{ row.graph.name }}</a
          >
          @if (row.viewLabel !== '') {
            <span>{{ row.viewLabel }}</span>
          }
          @if (row.graph.nodeCount !== null) {
            <span>Nodes: {{ row.graph.nodeCount }}</span>
          }
          @if (!row.graph.valid) {
            <span>Invalid</span>
          }
          @if (row.pending) {
            <span>Pending change</span>
          }
          @if (row.status !== undefined) {
            <span>{{ row.status }}</span>
          }
          @if (controls()) {
            <button type="button" (click)="startRename(row.graph.id)">
              Rename
            </button>
            @if (renaming() === row.graph.id) {
              <label for="rename-input">New name</label>
              <input
                id="rename-input"
                type="text"
                [value]="renameName()"
                (input)="renameName.set($any($event.target).value)"
              />
              <button type="button" (click)="saveRename(row.graph.id)">
                Save name
              </button>
            }
            <button type="button" (click)="remove(row.graph.id)">Delete</button>
          }
        </li>
      }
    </ul>
  `,
})
export class GraphListPage {
  private readonly api = inject(API_CLIENT);
  private readonly events = inject(SSE_CLIENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeProject = inject(ActiveProjectSignal);
  private readonly device = inject(DeviceClassService);

  protected readonly projectId = computed(
    () => this.activeProject.projectId() ?? '',
  );

  /** Create, rename and delete are offered on tablet and desktop only. */
  protected readonly controls = computed(
    () => this.device.deviceClass() !== 'phone',
  );

  private readonly graphs = signal<readonly GraphSummary[]>([]);
  private readonly run = signal<RunState | null>(null);
  private readonly pending = signal<readonly PendingChange[]>([]);
  protected readonly failure = signal<string | undefined>(undefined);

  protected readonly newName = signal('');
  protected readonly newView = signal<'story' | 'recipe'>('story');
  protected readonly renaming = signal<string | undefined>(undefined);
  protected readonly renameName = signal('');

  private readonly reads = new Subject<Read>();

  /** The project id the view was loaded for; undefined until the first id arrives. */
  private loadedFor: string | undefined;

  /** The rows: each graph with its view label, its badge and the status of the current run. */
  protected readonly rows = computed<readonly GraphRow[]>(() => {
    const changed = new Set(this.pending().map((change) => change.targetPath));
    const run = this.run();
    return this.graphs().map((graph) => ({
      graph,
      viewLabel:
        graph.view === 'story'
          ? 'Story'
          : graph.view === 'recipe'
            ? 'Recipe'
            : '',
      pending: changed.has(`graphs/${graph.id}.json`),
      // A story never runs, so only a recipe row can show a status, and only the latest run's recipe.
      status:
        run !== null && graph.view === 'recipe' && run.graphId === graph.id
          ? run.status
          : undefined,
    }));
  });

  constructor() {
    // Each read is one request; the answer is applied only if the project is still the same.
    this.reads
      .pipe(
        mergeMap((read) => this.readOf(read)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    // A graph-runner event re-reads the current run only; the event's data is not folded in.
    this.events
      .stream('graph-runner')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reads.next('run'));

    // A reconcile tick re-reads all three sources.
    this.events.reconcile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.readAll());

    // The project id is undefined until the router's NavigationEnd sets it, so the first read waits
    // for it here. The Shell's project switch reuses this page: a new id resets the view and re-reads.
    toObservable(this.activeProject.projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        if (id === undefined || id === this.loadedFor) return;
        this.loadedFor = id;
        this.graphs.set([]);
        this.run.set(null);
        this.pending.set([]);
        this.failure.set(undefined);
        this.renaming.set(undefined);
        this.readAll();
      });
  }

  protected create(): void {
    const name = this.newName().trim();
    if (name === '') return;
    this.command(
      this.api.post(
        GRAPH_CREATE_PATH,
        { name, view: this.newView() },
        graphIdCopy,
      ),
    );
  }

  protected startRename(id: string): void {
    this.renaming.set(id);
    this.renameName.set('');
  }

  protected saveRename(id: string): void {
    const name = this.renameName().trim();
    if (name === '') return;
    this.renaming.set(undefined);
    this.command(this.api.post(graphRenamePath(id), { name }, graphIdCopy));
  }

  protected remove(id: string): void {
    this.command(this.api.post(graphDeletePath(id), {}, noBodyCopy));
  }

  private readAll(): void {
    for (const read of ALL_READS) this.reads.next(read);
  }

  /** A command re-reads all three sources when it succeeds. A failure shows the one line. */
  private command(request: Observable<unknown>): void {
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.failure.set(undefined);
        this.readAll();
      },
      error: () => this.failure.set(FAILURE),
    });
  }

  private readOf(read: Read): Observable<void> {
    const project = this.activeProject.projectId();
    if (project === undefined) return EMPTY;
    return this.sourceOf(read, project).pipe(
      map((apply) => {
        if (project !== this.activeProject.projectId()) return;
        apply();
        this.failure.set(undefined);
      }),
      catchError(() => {
        this.failure.set(FAILURE);
        return EMPTY;
      }),
    );
  }

  private sourceOf(read: Read, project: string): Observable<() => void> {
    switch (read) {
      case 'graphs':
        return this.api.get(GRAPHS_PATH, graphListCopy).pipe(
          map(
            ({ graphs }) =>
              () =>
                this.graphs.set(graphs),
          ),
        );
      case 'run':
        return this.api.get(RUN_CURRENT_PATH, currentRunCopy).pipe(
          map(
            ({ run }) =>
              () =>
                this.run.set(run),
          ),
        );
      case 'pending':
        return this.api.get(pendingPath(project), pendingListCopy).pipe(
          map(
            ({ changes }) =>
              () =>
                this.pending.set(changes),
          ),
        );
    }
  }
}
