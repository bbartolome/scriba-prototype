import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { ProjectSummary } from '@bbartolome/scriba-contracts/project-store';
import { filter } from 'rxjs';
import { API_CLIENT, SSE_CLIENT } from '../../shell';
import { PROJECTS_PATH, projectListCopy } from './project-store-contract';

/** The message of a failed read: the error's own message, or a fallback for a value that is not an Error. */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed.';
}

/**
 * The project list of this tab, shared by the picker and the nav widget. The picker reads it when it
 * opens, and the widget reads it on a project URL. Once it has been requested here, each project-switched
 * event and each reconcile tick reads it again. Only the answer to the newest read is kept.
 */
@Injectable({ providedIn: 'root' })
export class ProjectsState {
  private readonly api = inject(API_CLIENT);
  private readonly events = inject(SSE_CLIENT);
  private readonly rootRef = inject(DestroyRef);
  private latest = 0;

  /** True once a read has been requested in this tab. */
  readonly requested = signal(false);

  /** The entries of the last successful read. */
  readonly projects = signal<ProjectSummary[] | undefined>(undefined);

  /** The message of the last read, when that read failed. */
  readonly failure = signal<string | undefined>(undefined);

  /**
   * The title of the active project, or its id when it has no title. Undefined when no project is
   * active, when the list has not been read, or when the last read failed.
   */
  readonly activeLabel = computed<string | undefined>(() => {
    if (this.failure() !== undefined) return undefined;
    const active = this.projects()?.find((project) => project.active);
    if (active === undefined) return undefined;
    return active.title === undefined || active.title === ''
      ? active.id
      : active.title;
  });

  constructor() {
    this.events
      .stream('project-store')
      .pipe(
        filter((envelope) => envelope.type === 'project-switched'),
        takeUntilDestroyed(this.rootRef),
      )
      .subscribe(() => this.refresh());
    this.events.reconcile$
      .pipe(takeUntilDestroyed(this.rootRef))
      .subscribe(() => this.refresh());
  }

  /** Reads the list. The read is cancelled when `owner` is destroyed. */
  read(owner: DestroyRef): void {
    this.requested.set(true);
    const request = ++this.latest;
    this.api
      .get(PROJECTS_PATH, projectListCopy)
      .pipe(takeUntilDestroyed(owner))
      .subscribe({
        next: (list) => {
          if (request !== this.latest) return;
          this.projects.set(list.projects);
          this.failure.set(undefined);
        },
        error: (error: unknown) => {
          if (request !== this.latest) return;
          this.failure.set(messageOf(error));
        },
      });
  }

  /** Reads again, once a read has been requested in this tab. Before that, an event sends nothing. */
  private refresh(): void {
    if (this.requested()) {
      this.read(this.rootRef);
    }
  }
}
