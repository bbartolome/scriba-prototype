import { inject, Injectable } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';
import { forkJoin, map, type Observable } from 'rxjs';

/** An editor that can report unsaved text and save it before a leave. */
export interface UnsavedSource {
  /** True while the editor holds text that is not saved, or a save of it is in progress. */
  hasUnsavedText(): boolean;
  /** Saves the unsaved text. Emits once: true when the editor ends saved, false otherwise. */
  flush(): Observable<boolean>;
}

/** The editors on the page that hold text the author has not saved. */
@Injectable({ providedIn: 'root' })
export class UnsavedTextRegistry {
  private readonly sources = new Set<UnsavedSource>();

  /** Adds an editor. The function it returns removes the editor again. */
  register(source: UnsavedSource): () => void {
    this.sources.add(source);
    return () => {
      this.sources.delete(source);
    };
  }

  /** The registered editors that hold unsaved text. */
  unsaved(): UnsavedSource[] {
    return [...this.sources].filter((source) => source.hasUnsavedText());
  }
}

/** The leave prompt: true when the author chooses to leave with unsaved text. */
export function confirmUnsavedLeave(): boolean {
  return window.confirm('This page has unsaved text. Leave anyway?');
}

/**
 * Before a route is left, every editor with unsaved text is flushed. When each one ends saved the
 * leave goes on with no prompt; otherwise the author is asked, and Cancel keeps the page.
 */
export const unsavedTextGuard: CanDeactivateFn<unknown> = () => {
  const sources = inject(UnsavedTextRegistry).unsaved();
  if (sources.length === 0) {
    return true;
  }
  return forkJoin(sources.map((source) => source.flush())).pipe(
    map((results) => results.every((saved) => saved) || confirmUnsavedLeave()),
  );
};
