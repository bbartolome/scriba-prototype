import {
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { FileEntry } from '@bbartolome/scriba-contracts/project-store';
import {
  catchError,
  distinctUntilChanged,
  EMPTY,
  filter,
  map,
  type Observable,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import {
  ActiveProjectSignal,
  API_CLIENT,
  ApiError,
  DeviceClassService,
  EditorLayout,
  MarkdownPreview,
  SSE_CLIENT,
} from '../../shell';
import { projectFilePath, readCopy } from '../../shell/project-store-copies';
import { fileListCopy, projectFilesPath } from './files-contract';
import { SearchPanel } from './search-panel';

/** One row of the tree: a file or a directory. `depth` is the number of parent directories. */
interface Row {
  readonly path: string;
  readonly name: string;
  readonly depth: number;
  readonly kind: FileEntry['kind'];
}

/**
 * The file the editor shows: structurally the Shell's `EditorReference`, which the barrel does not
 * export. Its `path` is a project-relative path, as `FileReference` is.
 */
interface FileTarget {
  readonly projectId: string;
  readonly path: string;
}

/** The answer of a read, or the message to show for its failure. */
type Outcome<T> = { ok: true; value: T } | { ok: false; message: string };

// The project root is `.`; the list is recursive, so one request gives the whole tree.
const LIST_PARAMS: Record<string, string> = { path: '.', recursive: 'true' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStrings(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

/** The data of a files-changed event, when it has the shape of filesChangedDataSchema. */
function changeOf(
  data: unknown,
): { projectId: string; paths: string[] } | undefined {
  if (!isRecord(data)) return undefined;
  const { projectId, paths } = data;
  if (typeof projectId !== 'string' || !isStrings(paths)) return undefined;
  return { projectId, paths };
}

/**
 * Compares two paths segment by segment. The server sorts whole strings, where `-` sorts before `/`,
 * so `drafts-old` would fall between `drafts` and `drafts/ch1.md`; comparing segments keeps a
 * directory's children after it.
 */
function compareSegments(a: readonly string[], b: readonly string[]): number {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const x = a[i] ?? '';
    const y = b[i] ?? '';
    if (x !== y) return x < y ? -1 : 1;
  }
  return a.length - b.length;
}

/** The tree's rows: dot-entries dropped, sorted by segment, one flat list indented by depth. */
function rowsOf(entries: readonly FileEntry[]): Row[] {
  return entries
    .map((entry) => ({ entry, segments: entry.path.split('/') }))
    .filter(({ segments }) =>
      segments.every((segment) => segment !== '' && !segment.startsWith('.')),
    )
    .sort((a, b) => compareSegments(a.segments, b.segments))
    .map(({ entry, segments }) => ({
      path: entry.path,
      name: segments[segments.length - 1] ?? entry.path,
      depth: segments.length - 1,
      kind: entry.kind,
    }));
}

/** The message of a failed read: an ApiError's own message, or the fallback for any other error. */
function failureMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'The request failed.';
}

/** The `offset` query parameter (a search result's passage) when it is an integer >= 0, else undefined. */
function offsetOf(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const offset = Number(value);
  return Number.isSafeInteger(offset) ? offset : undefined;
}

function outcomeOf<T>(source: Observable<T>): Observable<Outcome<T>> {
  return source.pipe(
    map((value): Outcome<T> => ({ ok: true, value })),
    catchError((error: unknown) =>
      of<Outcome<T>>({ ok: false, message: failureMessage(error) }),
    ),
  );
}

/**
 * The files of the active project at `/projects/:projectId/files`: a tree of the project's files and
 * a read-only Markdown preview of the file in `?path=`. The tree is read again on each files-changed
 * event for the project and on each reconcile tick; the open file is read again when an event names
 * its path or a tick arrives.
 */
@Component({
  imports: [EditorLayout, MarkdownPreview, RouterLink, SearchPanel],
  selector: 'app-files-page',
  styles: `
    :host {
      display: block;
      padding: 16px;
      overflow-wrap: anywhere;
    }

    .layout {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 16px;
    }

    ul {
      flex: 1 1 12rem;
      min-width: 0;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      padding: 4px 0;
    }

    a {
      display: inline-block;
      min-height: 32px;
    }

    .preview {
      position: relative;
      flex: 2 1 20rem;
      min-width: 0;
    }

    .editor[hidden] {
      display: none;
    }

    .anchor {
      position: absolute;
      left: 0;
      width: 0;
      height: 0;
    }
  `,
  template: `
    <h2>Files</h2>
    <app-search-panel />
    @if (listFailure(); as message) {
      <p role="alert">{{ message }}</p>
    }
    <div class="layout">
      <ul aria-label="Project files">
        @for (row of rows(); track row.path) {
          <li [style.padding-left.rem]="row.depth * 0.75">
            @if (row.kind === 'file') {
              <a
                [routerLink]="[]"
                [queryParams]="{ path: row.path }"
                [attr.aria-current]="row.path === selected() ? 'page' : null"
                >{{ row.name }}</a
              >
            } @else {
              <span>{{ row.name }}</span>
            }
          </li>
        }
      </ul>
      <section class="preview">
        @if (selected() === undefined) {
          <p>Choose a file in the tree to read it.</p>
        }
        @if (fileFailure(); as message) {
          <p role="alert">{{ message }}</p>
        }
        @if (target(); as file) {
          <div class="editor" [hidden]="!editorShown()">
            <app-editor-layout [reference]="file" />
          </div>
        }
        @if (!editorShown() && content() !== undefined) {
          <app-markdown-preview [content]="content() ?? ''" />
        }
        @if (content() !== undefined) {
          <span
            #anchor
            class="anchor"
            aria-hidden="true"
            [style.top.%]="anchorTop()"
          ></span>
        }
      </section>
    </div>
  `,
})
export class FilesPage {
  private readonly api = inject(API_CLIENT);
  private readonly events = inject(SSE_CLIENT);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectId = inject(ActiveProjectSignal).projectId;

  /** The project the view was last loaded for. A change of project starts the view again. */
  private loadedFor = this.projectId();

  protected readonly rows = signal<readonly Row[]>([]);
  protected readonly listFailure = signal<string | undefined>(undefined);

  /** The file named by `?path=`, if any. */
  protected readonly selected = signal<string | undefined>(undefined);
  protected readonly content = signal<string | undefined>(undefined);
  protected readonly fileFailure = signal<string | undefined>(undefined);

  private readonly devices = inject(DeviceClassService);
  protected readonly phone = computed(
    () => this.devices.deviceClass() === 'phone',
  );

  /** The open file for the editor: changes only when the project or the selected file does. */
  private readonly reference = computed<FileTarget | undefined>(() => {
    const projectId = this.projectId();
    const path = this.selected();
    return projectId === undefined || path === undefined
      ? undefined
      : { projectId, path };
  });

  /**
   * The file the editor is mounted on. It follows each new file, and keeps the last file when
   * `?path=` is removed. On a phone it is not mounted until a file is open on a larger class.
   */
  protected readonly target = linkedSignal<
    { reference: FileTarget | undefined; phone: boolean },
    FileTarget | undefined
  >({
    source: () => ({ reference: this.reference(), phone: this.phone() }),
    computation: (source, previous) => {
      if (
        source.reference !== undefined &&
        (!source.phone || previous?.value !== undefined)
      ) {
        return source.reference;
      }
      return previous?.value;
    },
  });

  /** The editor shows on a larger class, for a selected file that reads. */
  protected readonly editorShown = computed(
    () =>
      !this.phone() &&
      this.selected() !== undefined &&
      this.fileFailure() === undefined,
  );

  /** The `offset` of a search result, if any: the passage the file was opened for. */
  protected readonly offset = signal<number | undefined>(undefined);

  /** The zero-size mark in the preview at the offset's place, scrolled to once per request. */
  private readonly anchor = viewChild<ElementRef<HTMLElement>>('anchor');
  private scrolledFor: string | undefined;

  /** The mark's place, as a percentage of the content: the offset's share of its length. */
  protected readonly anchorTop = computed(() => {
    const offset = this.offset();
    const text = this.content();
    if (offset === undefined || text === undefined || text.length === 0) {
      return 0;
    }
    return Math.min(100, (offset / text.length) * 100);
  });

  private readonly listReads = new Subject<void>();
  private readonly fileReads = new Subject<string | undefined>();

  constructor() {
    // Only the answer to the newest request is shown: switchMap cancels the one before it.
    this.listReads
      .pipe(
        switchMap(() => {
          const project = this.projectId();
          return project === undefined
            ? EMPTY
            : outcomeOf(
                this.api.get(
                  projectFilesPath(project),
                  fileListCopy,
                  LIST_PARAMS,
                ),
              );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result.ok) {
          this.rows.set(rowsOf(result.value.entries));
          this.listFailure.set(undefined);
        } else {
          this.listFailure.set(result.message);
        }
      });

    this.fileReads
      .pipe(
        switchMap((path) => {
          const project = this.projectId();
          if (path === undefined || project === undefined) return EMPTY;
          return outcomeOf(
            this.api.get(projectFilePath(project), readCopy, { path }),
          ).pipe(map((result) => ({ path, result })));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ path, result }) => {
        if (path !== this.selected()) return;
        if (result.ok) {
          this.content.set(result.value.content);
          this.fileFailure.set(undefined);
        } else {
          this.content.set(undefined);
          this.fileFailure.set(result.message);
        }
      });

    this.events
      .stream('project-store')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((envelope) => {
        if (envelope.type !== 'files-changed') return;
        const change = changeOf(envelope.data);
        if (change === undefined || change.projectId !== this.projectId()) {
          return;
        }
        this.listReads.next();
        const open = this.selected();
        if (open !== undefined && change.paths.includes(open)) {
          this.fileReads.next(open);
        }
      });

    this.events.reconcile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.listReads.next();
        this.fileReads.next(this.selected());
      });

    // The Shell's project switch reuses this page: the view starts again for the new project.
    toObservable(this.projectId)
      .pipe(
        filter((id) => id !== this.loadedFor),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => {
        this.loadedFor = id;
        this.rows.set([]);
        this.listFailure.set(undefined);
        this.content.set(undefined);
        this.fileFailure.set(undefined);
        this.listReads.next();
        this.fileReads.next(this.selected());
      });

    // The file in `?path=`: a link in the tree changes the query, and the page shows the new file.
    this.route.queryParamMap
      .pipe(
        map((params) => params.get('path') ?? undefined),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((path) => {
        this.selected.set(path);
        this.content.set(undefined);
        this.fileFailure.set(undefined);
        this.fileReads.next(path);
      });

    // The passage of a search result: a tree link drops the offset, so its file is shown at the top.
    this.route.queryParamMap
      .pipe(
        map((params) => offsetOf(params.get('offset'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((offset) => {
        this.offset.set(offset);
        this.scrolledFor = undefined;
      });

    // Once the file of a search result shows, its mark scrolls into view, once per request.
    afterRenderEffect(() => {
      const path = this.selected();
      const offset = this.offset();
      const element = this.anchor()?.nativeElement;
      if (
        path === undefined ||
        offset === undefined ||
        this.content() === undefined ||
        element === undefined
      ) {
        return;
      }
      const key = `${path}#${offset}`;
      if (key === this.scrolledFor) return;
      this.scrolledFor = key;
      element.scrollIntoView({ block: 'center' });
    });

    this.listReads.next();
  }
}
