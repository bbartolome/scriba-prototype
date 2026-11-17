import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { DraftVersion } from '@bbartolome/scriba-contracts/project-store';
import {
  catchError,
  exhaustMap,
  map,
  type Observable,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import {
  API_CLIENT,
  ApiError,
  DeviceClassService,
  DiffView,
  SSE_CLIENT,
} from '../../shell';
import { projectFilePath, readCopy } from '../../shell/project-store-copies';
import {
  draftRestorePath,
  draftVersionListCopy,
  draftVersionReadCopy,
  draftVersionReadPath,
  draftVersionsPath,
} from './versions-contract';

/** The answer of a request, or the message to show for its failure. */
type Outcome<T> = { ok: true; value: T } | { ok: false; message: string };

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

/** The message of a failed request: an ApiError's own message, or the fallback for any other error. */
function failureMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'The request failed.';
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
 * The version history of one top-level draft, shown beside its preview on the files page. It lists
 * the draft's saved versions, newest first, and shows a selected version as a diff against the
 * draft's current text. On tablet and desktop it also restores a version, after a confirmation. It is
 * read again on each files-changed event for its project and on each reconcile tick.
 */
@Component({
  imports: [DiffView],
  selector: 'app-version-history',
  styles: `
    :host {
      display: block;
      flex: 1 1 16rem;
      min-width: 0;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      padding: 4px 0;
    }

    button {
      display: inline-block;
      min-height: 44px;
      padding-block: 0.5rem;
    }
  `,
  template: `
    <section aria-labelledby="version-history-heading">
      <h3 id="version-history-heading">Version history</h3>
      @if (listFailure(); as message) {
        <p role="alert">{{ message }}</p>
      }
      @if (loaded() && listFailure() === undefined && versions().length === 0) {
        <p>No versions yet.</p>
      }
      <ul aria-label="Versions">
        @for (version of versions(); track version.id) {
          <li>
            <button
              type="button"
              [attr.aria-pressed]="selected() === version.id"
              (click)="select(version.id)"
            >
              {{ version.createdAt }}, {{ version.size }} bytes
            </button>
          </li>
        }
      </ul>
      @if (versionFailure(); as message) {
        <p role="alert">{{ message }}</p>
      }
      @if (currentFailure(); as message) {
        <p role="alert">{{ message }}</p>
      }
      @if (diff(); as texts) {
        <app-diff-view
          [path]="draftPath()"
          [base]="texts.base"
          [proposed]="texts.proposed"
        />
      }
      @if (restorable() && selected() !== undefined) {
        <button
          type="button"
          [disabled]="restoring()"
          (click)="confirming.set(true)"
        >
          Restore this version
        </button>
      }
      @if (confirming()) {
        <div role="group" aria-label="Confirm restore">
          <p>
            Restore this version? The current text is saved as a new version
            first.
          </p>
          <button type="button" [disabled]="restoring()" (click)="restore()">
            Confirm restore
          </button>
          <button type="button" (click)="confirming.set(false)">Cancel</button>
        </div>
      }
      @if (restoreFailure(); as message) {
        <p role="alert">{{ message }}</p>
      }
    </section>
  `,
})
export class VersionHistory implements OnInit {
  private readonly api = inject(API_CLIENT);
  private readonly events = inject(SSE_CLIENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly devices = inject(DeviceClassService);

  readonly projectId = input.required<string>();
  readonly draftPath = input.required<string>();

  protected readonly versions = signal<readonly DraftVersion[]>([]);
  protected readonly loaded = signal(false);
  protected readonly listFailure = signal<string | undefined>(undefined);

  /** The draft's current text, read from the project store. */
  protected readonly current = signal<string | undefined>(undefined);
  protected readonly currentFailure = signal<string | undefined>(undefined);

  /** The version the user selected, and its text once read. */
  protected readonly selected = signal<string | undefined>(undefined);
  protected readonly version = signal<string | undefined>(undefined);
  protected readonly versionFailure = signal<string | undefined>(undefined);

  protected readonly confirming = signal(false);
  protected readonly restoring = signal(false);
  protected readonly restoreFailure = signal<string | undefined>(undefined);

  /** The diff of the version against the current draft: the current text is the base. */
  protected readonly diff = computed(() => {
    const base = this.current();
    const proposed = this.version();
    return base === undefined || proposed === undefined
      ? undefined
      : { base, proposed };
  });

  /** Restore is not offered on the phone class: the history is read-only there. */
  protected readonly restorable = computed(
    () => this.devices.deviceClass() !== 'phone',
  );

  private readonly listReads = new Subject<void>();
  private readonly currentReads = new Subject<void>();
  private readonly versionReads = new Subject<string>();
  private readonly restores = new Subject<string>();

  constructor() {
    // Only the answer to the newest request is shown: switchMap cancels the one before it.
    this.listReads
      .pipe(
        switchMap(() =>
          outcomeOf(
            this.api.get(
              draftVersionsPath(this.projectId()),
              draftVersionListCopy,
              { draftPath: this.draftPath() },
            ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.loaded.set(true);
        if (result.ok) {
          this.versions.set(result.value.versions);
          this.listFailure.set(undefined);
        } else {
          this.versions.set([]);
          this.listFailure.set(result.message);
        }
      });

    this.currentReads
      .pipe(
        switchMap(() =>
          outcomeOf(
            this.api.get(projectFilePath(this.projectId()), readCopy, {
              path: this.draftPath(),
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result.ok) {
          this.current.set(result.value.content);
          this.currentFailure.set(undefined);
        } else {
          this.current.set(undefined);
          this.currentFailure.set(result.message);
        }
      });

    // A version's text never changes, so it is read once per selection. Its answer applies only
    // while that version is still the selected one.
    this.versionReads
      .pipe(
        switchMap((id) =>
          outcomeOf(
            this.api.get(
              draftVersionReadPath(this.projectId()),
              draftVersionReadCopy,
              {
                draftPath: this.draftPath(),
                id,
              },
            ),
          ).pipe(map((result) => ({ id, result }))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ id, result }) => {
        if (id !== this.selected()) return;
        if (result.ok) {
          this.version.set(result.value.content);
          this.versionFailure.set(undefined);
        } else {
          this.version.set(undefined);
          this.versionFailure.set(result.message);
        }
      });

    // A restore is sent once per confirmation: exhaustMap ignores a request while one is in flight.
    this.restores
      .pipe(
        exhaustMap((id) =>
          outcomeOf(
            this.api.post(
              draftRestorePath(this.projectId()),
              { draftPath: this.draftPath(), id },
              draftVersionReadCopy,
            ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.restoring.set(false);
        this.confirming.set(false);
        if (result.ok) {
          this.restoreFailure.set(undefined);
          this.listReads.next();
          this.currentReads.next();
        } else {
          this.restoreFailure.set(result.message);
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
        this.currentReads.next();
      });

    this.events.reconcile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.listReads.next();
        this.currentReads.next();
      });
  }

  ngOnInit(): void {
    this.listReads.next();
    this.currentReads.next();
  }

  /** Selects a version: its text is read, and the diff shows once it arrives. */
  protected select(id: string): void {
    this.selected.set(id);
    this.version.set(undefined);
    this.versionFailure.set(undefined);
    this.confirming.set(false);
    this.restoreFailure.set(undefined);
    this.versionReads.next(id);
  }

  /** Sends the restore of the selected version, once the user has confirmed it. */
  protected restore(): void {
    const id = this.selected();
    if (id === undefined || this.restoring()) return;
    this.restoring.set(true);
    this.restoreFailure.set(undefined);
    this.restores.next(id);
  }
}
