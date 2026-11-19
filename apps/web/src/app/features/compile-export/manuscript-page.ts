import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type {
  ManuscriptEntry,
  ManuscriptPart,
  ManuscriptView,
  ManuscriptWarning,
} from '@bbartolome/scriba-contracts/compile-export';
import {
  catchError,
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
  SSE_CLIENT,
} from '../../shell';
import {
  isFilesChangedData,
  isManuscriptUpdatedData,
  MANUSCRIPT_PART_VALUES,
  MANUSCRIPT_PATH,
  MANUSCRIPT_STATUS_VALUES,
  manuscriptViewCopy,
} from './manuscript-contract';

// The manuscript outline (CEX-17). It reads the view, shows it in three part sections, and refetches on
// manuscript-updated and on the files-changed events that touch the manuscript or project.yaml.

type Outcome<T> = { ok: true; value: T } | { ok: false; message: string };

/** The message of a failed read: an ApiError's own message, or the fallback for any other error. */
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

/** A files-changed path that can change the outline: project.yaml, the manuscript folder or a file in it. */
function touchesManuscript(path: string): boolean {
  return path === 'project.yaml' || path === 'drafts' || path.startsWith('drafts/');
}

const PART_HEADINGS: Record<ManuscriptPart, string> = {
  front: 'Front matter',
  body: 'Body',
  back: 'Back matter',
};

const ORDER_LINES: Record<ManuscriptView['orderSource'], string> = {
  alphabetical: 'Order: alphabetical',
  project: 'Order: project.yaml',
  'graph+project': 'Order: story graph, then project.yaml',
};

/** The one line that shows a warning of the order. */
function warningLine(warning: ManuscriptWarning): string {
  switch (warning.kind) {
    case 'graphCycle':
      return `Story graph cycle among ${warning.files.join(', ')}. The graph is ignored.`;
    case 'invalidGraph':
      return `Story graph skipped as invalid: ${warning.path}.`;
    case 'staleEntry':
      return `Order entry for a missing file ignored: ${warning.path}.`;
  }
}

/** One row of a part section. */
interface Row {
  readonly path: string;
  readonly name: string;
  readonly part: ManuscriptPart;
  readonly status: ManuscriptEntry['status'];
  readonly words: number;
  readonly graphOrdered: boolean;
}

interface Section {
  readonly part: ManuscriptPart;
  readonly heading: string;
  readonly rows: readonly Row[];
}

function toRow(entry: ManuscriptEntry): Row {
  return {
    path: entry.path,
    name: entry.path.slice(entry.path.lastIndexOf('/') + 1),
    part: entry.part,
    status: entry.status,
    words: entry.words,
    graphOrdered: entry.graphOrdered,
  };
}

@Component({
  selector: 'app-manuscript-page',
  imports: [RouterLink],
  template: `
    <h1>Manuscript</h1>

    @if (failure(); as message) {
      <p role="alert">{{ message }}</p>
    }

    @if (view(); as current) {
      <p>
        Body: {{ current.totals.body }} words. Manuscript:
        {{ current.totals.manuscript }} words.
      </p>
      <p>{{ orderLine() }}</p>
      @if (current.warnings.length > 0) {
        <ul>
          @for (line of warningLines(); track line) {
            <li>{{ line }}</li>
          }
        </ul>
      }

      @for (section of sections(); track section.part) {
        <section>
          <h2>{{ section.heading }}</h2>
          <ul [attr.data-part]="section.part">
            @for (row of section.rows; track row.path) {
              <li [attr.data-path]="row.path">
                <a
                  [routerLink]="['/projects', projectId(), 'files']"
                  [queryParams]="{ path: row.path }"
                  >{{ row.name }}</a
                >
                <select [attr.aria-label]="'Status of ' + row.name">
                  @for (value of statuses; track value) {
                    <option [value]="value" [selected]="value === row.status">
                      {{ value }}
                    </option>
                  }
                </select>
                <select [attr.aria-label]="'Part of ' + row.name">
                  @for (value of parts; track value) {
                    <option [value]="value" [selected]="value === row.part">
                      {{ value }}
                    </option>
                  }
                </select>
                <span>{{ row.words }} words</span>
                @if (row.graphOrdered) {
                  <span>Graph order</span>
                }
              </li>
            }
          </ul>
        </section>
      }
    }
  `,
})
export class ManuscriptPage {
  private readonly api = inject(API_CLIENT);
  private readonly events = inject(SSE_CLIENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectId = inject(ActiveProjectSignal).projectId;
  private readonly devices = inject(DeviceClassService);

  protected readonly statuses = MANUSCRIPT_STATUS_VALUES;
  protected readonly parts = MANUSCRIPT_PART_VALUES;

  /** The view last answered by the server. */
  protected readonly view = signal<ManuscriptView | undefined>(undefined);
  protected readonly failure = signal<string | undefined>(undefined);

  /** Writes are allowed on tablet and desktop only (D14). Used by the drag and the controls. */
  protected readonly editable = computed(() => {
    const deviceClass = this.devices.deviceClass();
    return deviceClass === 'tablet' || deviceClass === 'desktop';
  });

  protected readonly orderLine = computed(() => {
    const current = this.view();
    return current === undefined ? '' : ORDER_LINES[current.orderSource];
  });

  protected readonly warningLines = computed(
    () => this.view()?.warnings.map(warningLine) ?? [],
  );

  protected readonly sections = computed<Section[]>(() => {
    const entries = this.view()?.entries ?? [];
    return MANUSCRIPT_PART_VALUES.map((part) => ({
      part,
      heading: PART_HEADINGS[part],
      rows: entries.filter((entry) => entry.part === part).map(toRow),
    }));
  });

  /** Each read of the view. A new read cancels the one before it; a failed read ends only itself (P8). */
  private readonly reads = new Subject<void>();

  constructor() {
    this.reads
      .pipe(
        switchMap(() =>
          outcomeOf(this.api.get(MANUSCRIPT_PATH, manuscriptViewCopy)),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result.ok) {
          this.view.set(result.value);
          this.failure.set(undefined);
        } else {
          this.failure.set(result.message);
        }
      });

    this.events
      .stream('compile-export')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((envelope) => {
        if (envelope.type !== 'manuscript-updated') return;
        if (!isManuscriptUpdatedData(envelope.data)) return;
        if (envelope.data.projectId !== this.projectId()) return;
        this.reads.next();
      });

    this.events
      .stream('project-store')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((envelope) => {
        if (envelope.type !== 'files-changed') return;
        if (!isFilesChangedData(envelope.data)) return;
        if (envelope.data.projectId !== this.projectId()) return;
        if (!envelope.data.paths.some(touchesManuscript)) return;
        this.reads.next();
      });

    this.reads.next();
  }
}
