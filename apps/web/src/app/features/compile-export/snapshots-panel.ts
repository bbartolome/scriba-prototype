import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { SnapshotSummary } from '@bbartolome/scriba-contracts/compile-export';
import { catchError, map, type Observable, of, Subject, switchMap } from 'rxjs';
import {
  ActiveProjectSignal,
  API_CLIENT,
  ApiError,
  DeviceClassService,
  SSE_CLIENT,
} from '../../shell';
import { manuscriptViewCopy } from './manuscript-contract';
import {
  isSnapshotEventData,
  PRE_RESTORE_LABEL,
  SNAPSHOT_RESTORE_PATH,
  SNAPSHOTS_PATH,
  snapshotListCopy,
  snapshotSummaryCopy,
} from './snapshot-contract';

// The snapshots panel on the manuscript route (CEX-19). It lists the snapshots, creates one with a label,
// and restores one behind a native confirm. It refreshes on snapshot-created and snapshot-restored only.

type Outcome<T> = { ok: true; value: T } | { ok: false; message: string };

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

/** The question a restore asks before it runs: the pre-restore snapshot and the deletions (P3). */
function restoreMessage(id: string): string {
  return `Restore ${id}? The current manuscript is saved first as a snapshot labelled ${PRE_RESTORE_LABEL}. Files that are not in this snapshot are deleted.`;
}

@Component({
  selector: 'app-snapshots-panel',
  template: `
    <section>
      <h2>Snapshots</h2>

      <input
        type="text"
        aria-label="Snapshot label"
        [disabled]="!editable()"
        (input)="label.set($any($event.target).value)"
      />
      <button type="button" [disabled]="!canCreate()" (click)="create()">
        Snapshot
      </button>

      @if (failure(); as message) {
        <p role="alert">{{ message }}</p>
      }

      @if (snapshots(); as list) {
        @if (list.length === 0) {
          <p>No snapshots yet.</p>
        } @else {
          <ul>
            @for (snapshot of list; track snapshot.id) {
              <li [attr.data-snapshot-id]="snapshot.id">
                <span>{{ snapshot.label }}</span>
                <time [attr.datetime]="snapshot.createdAt">{{
                  snapshot.createdAt
                }}</time>
                <span>{{ snapshot.fileCount }} files</span>
                @if (snapshot.words; as words) {
                  <span
                    >Words: {{ words.total }} ({{ words.body }} in the
                    body)</span
                  >
                } @else {
                  <span>Words: unknown</span>
                }
                @if (snapshot.unreadable) {
                  <span>Unreadable: cannot be restored</span>
                } @else {
                  <button
                    type="button"
                    [attr.aria-label]="'Restore ' + snapshot.id"
                    [disabled]="!editable()"
                    (click)="restore(snapshot)"
                  >
                    Restore
                  </button>
                }
              </li>
            }
          </ul>
        }
      }
    </section>
  `,
})
export class SnapshotsPanel {
  private readonly api = inject(API_CLIENT);
  private readonly events = inject(SSE_CLIENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectId = inject(ActiveProjectSignal).projectId;
  private readonly devices = inject(DeviceClassService);

  /** The rows as the server gives them, newest first. Undefined until the first read answers. */
  protected readonly snapshots = signal<readonly SnapshotSummary[] | undefined>(
    undefined,
  );
  protected readonly failure = signal<string | undefined>(undefined);
  protected readonly label = signal('');

  /** Writes are allowed on tablet and desktop only, as on the page (P9). */
  protected readonly editable = computed(() => {
    const deviceClass = this.devices.deviceClass();
    return deviceClass === 'tablet' || deviceClass === 'desktop';
  });

  protected readonly canCreate = computed(
    () => this.editable() && this.label().trim().length > 0,
  );

  /** Each read of the list. A new read cancels the one before it; a failed read ends only itself. */
  private readonly reads = new Subject<void>();

  constructor() {
    this.reads
      .pipe(
        switchMap(() =>
          outcomeOf(this.api.get(SNAPSHOTS_PATH, snapshotListCopy)),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result.ok) {
          this.snapshots.set(result.value.snapshots);
          this.failure.set(undefined);
        } else {
          this.failure.set(result.message);
        }
      });

    this.events
      .stream('compile-export')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((envelope) => {
        if (
          envelope.type !== 'snapshot-created' &&
          envelope.type !== 'snapshot-restored'
        ) {
          return;
        }
        if (!isSnapshotEventData(envelope.data)) return;
        if (envelope.data.projectId !== this.projectId()) return;
        this.reads.next();
      });

    this.reads.next();
  }

  /** Creates a snapshot with the trimmed label. The snapshot-created event refreshes the list (P4). */
  protected create(): void {
    const trimmed = this.label().trim();
    if (!this.editable() || trimmed.length === 0) return;
    this.api
      .post(SNAPSHOTS_PATH, { label: trimmed }, snapshotSummaryCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (error: unknown) => this.failure.set(failureMessage(error)),
      });
  }

  /** Restores one readable snapshot, after the confirm names the pre-restore snapshot (P2, P5). */
  protected restore(row: SnapshotSummary): void {
    if (!this.editable() || row.unreadable) return;
    if (!window.confirm(restoreMessage(row.id))) return;
    this.api
      .post(SNAPSHOT_RESTORE_PATH, { id: row.id }, manuscriptViewCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (error: unknown) => this.failure.set(failureMessage(error)),
      });
  }
}
