import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  MatButtonToggle,
  MatButtonToggleChange,
  MatButtonToggleGroup,
} from '@angular/material/button-toggle';
import { RouterLink } from '@angular/router';
import type {
  SearchPassage,
  SearchRequest,
} from '@bbartolome/scriba-contracts/project-store';
import {
  catchError,
  filter,
  map,
  type Observable,
  of,
  Subject,
  switchMap,
  timer,
} from 'rxjs';
import { ActiveProjectSignal, API_CLIENT, ApiError } from '../../shell';
import { projectSearchPath, searchResultCopy } from './search-contract';

type Scope = 'sources' | 'entities';

/** What the panel shows below the controls. */
type View =
  | { readonly kind: 'idle' }
  | { readonly kind: 'no-scope' }
  | { readonly kind: 'results'; readonly passages: readonly SearchPassage[] }
  | { readonly kind: 'failed'; readonly message: string };

/** A search asked for: the text, and whether it waits for the typing to settle. */
interface Ask {
  readonly text: string;
  readonly settle: boolean;
}

/** Typed text is searched this long after the last keystroke. */
const SETTLE_MS = 250;

/** The message of a failed search: an ApiError's own message, or the fallback for any other error. */
function failureMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'The request failed.';
}

/**
 * The search box of the files page: a text box, a scope toggle (Sources, Entities) and the ranked
 * passages of the active project. Selecting a passage opens its file at the passage's offset.
 */
@Component({
  imports: [MatButtonToggleGroup, MatButtonToggle, RouterLink],
  selector: 'app-search-panel',
  styles: `
    :host {
      display: block;
      margin-bottom: 16px;
    }

    label {
      display: block;
    }

    input {
      display: block;
      box-sizing: border-box;
      width: 100%;
      max-width: 32rem;
      min-height: 32px;
    }

    mat-button-toggle-group {
      margin: 8px 0;
    }

    ol {
      max-height: 50vh;
      overflow: auto;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      padding: 4px 0;
    }

    a {
      display: block;
      min-height: 32px;
    }

    .path {
      display: block;
      font-weight: 600;
    }

    .snippet {
      display: block;
    }
  `,
  template: `
    <label for="project-search">Search the project</label>
    <input id="project-search" type="search" #box (input)="typed(box.value)" />
    <mat-button-toggle-group
      multiple
      aria-label="Search scope"
      [value]="scopes"
      (change)="scopeChanged($event)"
    >
      <mat-button-toggle value="sources">Sources</mat-button-toggle>
      <mat-button-toggle value="entities">Entities</mat-button-toggle>
    </mat-button-toggle-group>
    @let current = view();
    @if (current.kind === 'no-scope') {
      <p role="status">Choose at least one folder to search.</p>
    }
    @if (current.kind === 'failed') {
      <p role="alert">{{ current.message }}</p>
    }
    @if (current.kind === 'results') {
      @if (current.passages.length === 0) {
        <p role="status">No matches.</p>
      } @else {
        <ol aria-label="Search results">
          @for (passage of current.passages; track $index) {
            <li>
              <a
                [routerLink]="[]"
                [queryParams]="{ path: passage.path, offset: passage.offset }"
              >
                <span class="path">{{ passage.path }}</span>
                <span class="snippet">{{ passage.snippet }}</span>
              </a>
            </li>
          }
        </ol>
      }
    }
  `,
})
export class SearchPanel {
  private readonly api = inject(API_CLIENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectId = inject(ActiveProjectSignal).projectId;
  private readonly box =
    viewChild.required<ElementRef<HTMLInputElement>>('box');

  /** The project the panel last worked for. A change of project clears it. */
  private loadedFor = this.projectId();

  /** The text in the box, as last typed. */
  private text = '';

  /** The scopes on. Both are on at the start, which searches both folders. */
  protected scopes: readonly Scope[] = ['sources', 'entities'];

  protected readonly view = signal<View>({ kind: 'idle' });

  private readonly asks = new Subject<Ask>();

  constructor() {
    this.asks
      .pipe(
        // A settling ask waits SETTLE_MS, and a newer ask cancels the wait. An immediate ask is at once.
        switchMap(({ text, settle }) =>
          (settle ? timer(SETTLE_MS) : of(0)).pipe(map(() => text)),
        ),
        // Only the answer to the newest search is shown: switchMap cancels the one before it.
        switchMap((text) => this.searchFor(text)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((view) => this.view.set(view));

    // The Shell's project switch reuses this page: the panel starts again for the new project.
    toObservable(this.projectId)
      .pipe(
        filter((id) => id !== this.loadedFor),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => {
        this.loadedFor = id;
        this.text = '';
        this.box().nativeElement.value = '';
        this.asks.next({ text: '', settle: false });
      });
  }

  /** A keystroke. Blank text clears the results at once; other text waits for the typing to settle. */
  protected typed(value: string): void {
    this.text = value;
    this.asks.next({ text: value, settle: value.trim() !== '' });
  }

  /** A scope toggle. The search runs at once, for the text in the box. */
  protected scopeChanged(event: MatButtonToggleChange): void {
    // With `multiple`, the group's value is the list of the scopes that are on.
    this.scopes = event.value as Scope[];
    this.asks.next({ text: this.text, settle: false });
  }

  /** The view for one search: idle for blank text, a message for no scope, else the answer. */
  private searchFor(text: string): Observable<View> {
    const query = text.trim();
    const project = this.projectId();
    if (query === '' || project === undefined) {
      return of<View>({ kind: 'idle' });
    }
    if (this.scopes.length === 0) {
      return of<View>({ kind: 'no-scope' });
    }
    // Both scopes on sends no `scope`, which the server reads as both folders.
    const body: SearchRequest =
      this.scopes.length === 2 ? { query } : { query, scope: [...this.scopes] };
    return this.api
      .post(projectSearchPath(project), body, searchResultCopy)
      .pipe(
        map((passages): View => ({ kind: 'results', passages })),
        catchError((error: unknown) =>
          of<View>({ kind: 'failed', message: failureMessage(error) }),
        ),
      );
  }
}
