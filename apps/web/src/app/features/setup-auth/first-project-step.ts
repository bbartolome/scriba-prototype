import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import type {
  ProjectList,
  ProjectSummary,
  Sample,
} from '@bbartolome/scriba-contracts/project-store';
import { forkJoin } from 'rxjs';
import { API_CLIENT } from '../../shell';
import {
  ACTIVE_PROJECT_PATH,
  activeCopy,
  PROJECT_IMPORT_PATH,
  PROJECT_NEW_PATH,
  PROJECT_START_FROM_SAMPLE_PATH,
  PROJECTS_PATH,
  projectListCopy,
  projectSummaryCopy,
  SAMPLES_PATH,
  sampleListCopy,
} from './first-project-copy';
import { loadSetupAuthContract } from './setup-contract';

/**
 * The body of the first-project step. It lists the projects of the library and offers Open or Import
 * for each that can be used. New and Start from sample create a project and activate it. Its reads run
 * when the step is shown; it writes only when the author clicks a button. It reports to the page
 * through three outputs: whether a listed project is active, that an activation succeeded, and any
 * error. The page writes the step's state.
 */
@Component({
  imports: [MatButton],
  selector: 'app-first-project-step',
  styles: `
    :host {
      display: block;
    }

    label {
      display: block;
      margin-bottom: 8px;
    }

    input,
    select {
      width: 100%;
      box-sizing: border-box;
    }

    .group {
      margin-bottom: 16px;
    }
  `,
  template: `
    <div>
      @for (project of projects(); track project.id) {
        <div>
          <p>
            {{ project.title ?? project.id }}: {{ project.status
            }}{{ project.active ? ' (active)' : '' }}
          </p>
          @if (project.error) {
            <p>{{ project.error }}</p>
          }
          @if (project.status === 'ok' && !project.active) {
            <button
              mat-stroked-button
              [disabled]="busy()"
              (click)="open(project.id)"
            >
              Open
            </button>
          } @else if (project.status === 'importable') {
            <button
              mat-stroked-button
              [disabled]="busy()"
              (click)="importProject(project.id)"
            >
              Import
            </button>
          }
        </div>
      } @empty {
        <p>No project in the library yet.</p>
      }
    </div>
    <div class="group">
      <label>Title <input #newTitle name="newTitle" type="text" /></label>
      <label
        >Folder name (optional)
        <input #newFolder name="newFolder" type="text" />
      </label>
      <button
        mat-flat-button
        [disabled]="busy()"
        (click)="newProject(newTitle.value, newFolder.value)"
      >
        New project
      </button>
    </div>
    <div class="group">
      <label
        >Sample
        <select #sample name="sample">
          @for (item of samples(); track item.id) {
            <option [value]="item.id">{{ item.title }}</option>
          }
        </select>
      </label>
      <label>Title <input #sampleTitle name="sampleTitle" type="text" /></label>
      <label
        >Folder name
        <input #sampleFolder name="sampleFolder" type="text" />
      </label>
      <button
        mat-flat-button
        [disabled]="busy()"
        (click)="
          startFromSample(sample.value, sampleTitle.value, sampleFolder.value)
        "
      >
        Start from sample
      </button>
    </div>
  `,
})
export class FirstProjectStep {
  private readonly api = inject(API_CLIENT);
  private readonly destroyRef = inject(DestroyRef);

  /** Whether some listed project is active. Emitted after each read of the list. */
  readonly activeChanged = output<boolean>();
  /** An activation succeeded: a project is now active. */
  readonly activated = output<void>();
  /** A request failed; the page shows the message. */
  readonly failed = output<unknown>();

  protected readonly projects = signal<ProjectSummary[]>([]);
  protected readonly samples = signal<Sample[]>([]);
  protected readonly busy = signal(false);
  /** The stored default genre pack, or undefined when none is stored. A plain field, not a signal. */
  private genrePack: string | undefined;

  constructor() {
    void this.load();
  }

  /**
   * New: creates the project with the stored genre pack, activates it, then re-reads the list. The
   * folder name and the genre pack are sent only when they are given.
   */
  protected newProject(title: string, folder: string): void {
    if (this.busy()) return;
    const body: Record<string, string> = { title: title.trim() };
    if (folder.trim() !== '') {
      body['folderName'] = folder.trim();
    }
    if (this.genrePack !== undefined && this.genrePack.trim() !== '') {
      body['genrePack'] = this.genrePack.trim();
    }
    this.busy.set(true);
    this.api
      .post(PROJECT_NEW_PATH, body, projectSummaryCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => this.activate(summary.id, true),
        error: (error: unknown) => this.stop(error),
      });
  }

  /** Start from sample: creates the project from a sample, activates it, then re-reads the list. */
  protected startFromSample(
    sampleId: string,
    title: string,
    folder: string,
  ): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.api
      .post(
        PROJECT_START_FROM_SAMPLE_PATH,
        {
          sampleId: sampleId.trim(),
          folderName: folder.trim(),
          title: title.trim(),
        },
        projectSummaryCopy,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => this.activate(summary.id, true),
        error: (error: unknown) => this.stop(error),
      });
  }

  /** Open: activates a listed project, then re-reads the list. Creates nothing. */
  protected open(projectId: string): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.activate(projectId, false);
  }

  /** Import: adds an existing folder to the library and re-reads the list. It does not activate. */
  protected importProject(projectId: string): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.api
      .post(PROJECT_IMPORT_PATH, { projectId }, projectSummaryCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.refresh(),
        error: (error: unknown) => this.stop(error),
      });
  }

  private async load(): Promise<void> {
    try {
      const contract = await loadSetupAuthContract();
      forkJoin([
        this.api.get(PROJECTS_PATH, projectListCopy),
        this.api.get(SAMPLES_PATH, sampleListCopy),
        this.api.get(contract.PREFERENCES_ROUTE, contract.preferencesSchema),
      ])
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: ([list, samples, preferences]) => {
            this.genrePack = preferences.defaultGenrePack;
            this.samples.set(samples);
            this.showProjects(list);
          },
          error: (error: unknown) => this.failed.emit(error),
        });
    } catch (error: unknown) {
      this.failed.emit(error);
    }
  }

  /**
   * Activates a project, then emits `activated` and re-reads the list. When the activation fails, the
   * list is re-read only if `refreshOnFailure` is set (New and Start from sample show the new project).
   */
  private activate(projectId: string, refreshOnFailure: boolean): void {
    this.api
      .post(ACTIVE_PROJECT_PATH, { projectId }, activeCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.activated.emit();
          this.refresh();
        },
        error: (error: unknown) => {
          this.failed.emit(error);
          if (refreshOnFailure) {
            this.refresh();
          } else {
            this.busy.set(false);
          }
        },
      });
  }

  /** Re-reads the list only. Used after each action. */
  private refresh(): void {
    this.api
      .get(PROJECTS_PATH, projectListCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.showProjects(list),
        error: (error: unknown) => this.stop(error),
      });
  }

  private showProjects(list: ProjectList): void {
    this.projects.set(list.projects);
    this.busy.set(false);
    this.activeChanged.emit(list.projects.some((project) => project.active));
  }

  private stop(error: unknown): void {
    this.busy.set(false);
    this.failed.emit(error);
  }
}
