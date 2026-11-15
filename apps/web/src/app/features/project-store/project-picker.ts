import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { Router } from '@angular/router';
import type {
  ProjectSummary,
  Sample,
} from '@bbartolome/scriba-contracts/project-store';
import { Observable } from 'rxjs';
import { API_CLIENT, ApiError } from '../../shell';
import {
  ACTIVE_PROJECT_PATH,
  activeCopy,
  issueLines,
  PROJECT_IMPORT_PATH,
  PROJECT_NEW_PATH,
  PROJECT_START_FROM_SAMPLE_PATH,
  projectSummaryCopy,
  SAMPLES_PATH,
  sampleListCopy,
} from './project-store-contract';
import { messageOf, ProjectsState } from './projects-state';

/** A refusal as the page shows it: the server's message, then one line per issue. */
interface Problem {
  message: string;
  details: string[];
}

function problemOf(error: unknown): Problem {
  if (error instanceof ApiError) {
    return { message: error.message, details: issueLines(error.details) };
  }
  return { message: messageOf(error), details: [] };
}

/**
 * The project picker at `/projects`. It lists the library's projects with their status and offers
 * the actions each status allows: Switch, Import, New and Start from sample. A created or started
 * project is made active and opened at its chat; an import only lists the project.
 */
@Component({
  imports: [MatButton],
  selector: 'app-project-picker',
  styles: `
    :host {
      display: block;
      padding: 16px;
      overflow-wrap: anywhere;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 12px;
      padding: 8px 0;
      border-bottom: 1px solid currentColor;
    }

    li > div:first-child {
      flex: 1 1 12rem;
      min-width: 0;
    }

    code,
    .status {
      margin-left: 4px;
      font-size: 12px;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 32rem;
      margin-bottom: 16px;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    input {
      box-sizing: border-box;
      width: 100%;
      min-height: 44px;
      padding: 8px;
      font: inherit;
    }

    section {
      margin-bottom: 16px;
    }

    [role='alert'] {
      color: inherit;
      font-weight: 600;
    }
  `,
  template: `
    <h2>Projects</h2>
    @if (failure(); as problem) {
      <div role="alert">
        <p>{{ problem.message }}</p>
        @if (problem.details.length > 0) {
          <ul>
            @for (line of problem.details; track $index) {
              <li>{{ line }}</li>
            }
          </ul>
        }
      </div>
    }
    @if (state.failure(); as message) {
      <p role="alert">{{ message }}</p>
    }
    @if (state.projects(); as list) {
      @if (list.length === 0) {
        <p>No projects yet. Create one below, or start from a sample.</p>
      }
      <ul>
        @for (project of list; track project.id) {
          <li>
            <div>
              <strong>{{ project.title || project.id }}</strong>
              <code>{{ project.id }}</code>
              <span class="status">{{ project.status }}</span>
              @if (project.error; as text) {
                <p>{{ text }}</p>
              }
            </div>
            @if (project.active) {
              <span>Active</span>
            } @else if (project.status === 'ok') {
              <button
                mat-button
                type="button"
                [disabled]="busy()"
                (click)="activate(project.id)"
              >
                Switch
              </button>
            }
            @if (isImportable(project)) {
              <button
                mat-button
                type="button"
                [disabled]="busy()"
                (click)="importProject(project.id)"
              >
                Import
              </button>
            }
          </li>
        }
      </ul>
    }

    <h2>New project</h2>
    <form
      aria-label="New project"
      (submit)="create($event, newTitle.value, newFolder.value, newPack.value)"
    >
      <label>
        Title
        <input name="title" #newTitle required />
      </label>
      <label>
        Folder name
        <input name="folderName" #newFolder />
      </label>
      <label>
        Genre pack
        <input name="genrePack" #newPack />
      </label>
      <button mat-flat-button type="submit" [disabled]="busy()">
        Create project
      </button>
    </form>

    <h2>Start from a sample</h2>
    @if (samplesFailure(); as message) {
      <p role="alert">{{ message }}</p>
    }
    @for (sample of samples(); track sample.id) {
      <section [attr.aria-label]="sample.title">
        <h3>{{ sample.title }}</h3>
        <p>{{ sample.description }}</p>
        <button mat-button type="button" (click)="open(sample.id)">
          Start from sample
        </button>
        @if (opened() === sample.id) {
          <form
            (submit)="
              startFromSample($event, sample, sampleFolder.value, sampleTitle.value)
            "
          >
            <label>
              Folder name
              <input
                name="folderName"
                #sampleFolder
                [value]="sample.id"
                required
              />
            </label>
            <label>
              Title
              <input name="title" #sampleTitle [value]="sample.title" required />
            </label>
            <button mat-flat-button type="submit" [disabled]="busy()">
              Create from sample
            </button>
          </form>
        }
      </section>
    }
  `,
})
export class ProjectPicker {
  private readonly api = inject(API_CLIENT);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly state = inject(ProjectsState);

  protected readonly samples = signal<Sample[]>([]);
  protected readonly samplesFailure = signal<string | undefined>(undefined);
  protected readonly opened = signal<string | undefined>(undefined);
  protected readonly failure = signal<Problem | undefined>(undefined);
  protected readonly busy = signal(false);

  constructor() {
    this.state.read(this.destroyRef);
    this.api
      .get(SAMPLES_PATH, sampleListCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.samples.set(list),
        error: (error: unknown) => this.samplesFailure.set(messageOf(error)),
      });
  }

  /** Import is offered for a folder that is not yet a valid project: an invalid or an importable one. */
  protected isImportable(project: ProjectSummary): boolean {
    return project.status === 'invalid' || project.status === 'importable';
  }

  /** New: the title is required; the folder name and the genre pack are sent only when filled. */
  protected create(
    event: Event,
    title: string,
    folderName: string,
    genrePack: string,
  ): void {
    event.preventDefault();
    const body: { title: string; folderName?: string; genrePack?: string } = {
      title: title.trim(),
    };
    if (folderName.trim() !== '') body.folderName = folderName.trim();
    if (genrePack.trim() !== '') body.genrePack = genrePack.trim();
    if (body.title === '') {
      this.failure.set({ message: 'Give the project a title.', details: [] });
      return;
    }
    this.submit(
      this.api.post(PROJECT_NEW_PATH, body, projectSummaryCopy),
      (summary) => this.activate(summary.id, true),
    );
  }

  /** Opens the form of one sample card. */
  protected open(sampleId: string): void {
    this.opened.set(sampleId);
  }

  /** Start from sample: the folder name and the title the author filled in. */
  protected startFromSample(
    event: Event,
    sample: Sample,
    folderName: string,
    title: string,
  ): void {
    event.preventDefault();
    this.submit(
      this.api.post(
        PROJECT_START_FROM_SAMPLE_PATH,
        {
          sampleId: sample.id,
          folderName: folderName.trim(),
          title: title.trim(),
        },
        projectSummaryCopy,
      ),
      (summary) => this.activate(summary.id, true),
    );
  }

  /** Import lists the folder as a project; it does not activate it. The list is read again. */
  protected importProject(projectId: string): void {
    this.submit(
      this.api.post(PROJECT_IMPORT_PATH, { projectId }, projectSummaryCopy),
      () => {
        this.busy.set(false);
        this.state.read(this.destroyRef);
      },
    );
  }

  /**
   * Makes the project active, then opens its chat. After a create, a refused activation keeps the page
   * here and reads the list again, so the new project shows in it.
   */
  protected activate(projectId: string, afterCreate = false): void {
    this.submit(
      this.api.post(ACTIVE_PROJECT_PATH, { projectId }, activeCopy),
      () => {
        void this.router.navigateByUrl(
          `/projects/${encodeURIComponent(projectId)}/chat`,
        );
      },
      () => {
        if (afterCreate) this.state.read(this.destroyRef);
      },
    );
  }

  /** Sends one request. Its refusal is shown as the page's problem; the request is cancelled with the page. */
  private submit<T>(
    source: Observable<T>,
    onAnswer: (answer: T) => void,
    onFailure: () => void = () => undefined,
  ): void {
    this.busy.set(true);
    this.failure.set(undefined);
    source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: onAnswer,
      error: (error: unknown) => {
        this.busy.set(false);
        this.failure.set(problemOf(error));
        onFailure();
      },
    });
  }
}
