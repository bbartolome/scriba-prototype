import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import type {
  EffectiveModel,
  ProviderRead,
} from '@bbartolome/scriba-contracts/providers';
import { filter, map } from 'rxjs';
import { API_CLIENT, SSE_CLIENT } from '../../shell';
import {
  ACTIVE_PROJECT_PATH,
  activeProjectCopy,
  EFFECTIVE_MODEL_PATH,
  effectiveModelCopy,
  PROJECT_MODEL_CLEAR_PATH,
  PROJECT_MODEL_PATH,
  projectModelResponseCopy,
  PROVIDERS_PATH,
  providerListCopy,
} from './providers-copies';
import { TEXTS } from './providers-texts';
import { failureMessage } from './providers-store';

/**
 * The "This project" section of the providers page: the model the active project uses, its source,
 * and a form to set or clear the project's own choice. It reads the active project from the Project
 * store's endpoint, and it refreshes on a project switch and on a reconcile tick.
 */
@Component({
  selector: 'app-project-model-panel',
  imports: [MatButton, MatFormField, MatHint, MatLabel, MatInput],
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .form-row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .problem {
      color: var(--mat-sys-error);
    }
  `,
  template: `
    @if (activeError(); as message) {
      <h2>{{ texts.projectHeading }}</h2>
      <p role="alert" class="problem">{{ message }}</p>
    } @else if (visible()) {
      <h2>{{ texts.projectHeading }}</h2>
      @if (effective(); as readout) {
        <p>
          {{
            texts.modelInUse(readout.choice.model, readout.choice.providerId)
          }}
        </p>
        <p>{{ sourceText(readout.source) }}</p>
        @if (readout.warning; as warning) {
          <p role="alert" class="problem">{{ warning }}</p>
        }
      } @else if (effectiveError(); as message) {
        <p role="alert" class="problem">{{ message }}</p>
      } @else {
        <p>{{ texts.loading }}</p>
      }

      @if (providersError(); as message) {
        <p role="alert" class="problem">{{ message }}</p>
      }
      @if (providers(); as list) {
        <div class="form-row">
          <mat-form-field>
            <mat-label>{{ texts.projectProviderLabel }}</mat-label>
            <select
              matNativeControl
              name="projectProvider"
              aria-label="{{ texts.projectProviderLabel }}"
              (change)="chooseProvider($event)"
            >
              <option value="" [selected]="providerChoice() === ''">
                {{ texts.useAppDefault }}
              </option>
              @for (provider of list; track provider.id) {
                <option
                  [value]="provider.id"
                  [selected]="provider.id === providerChoice()"
                >
                  {{ provider.id }}
                </option>
              }
            </select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ texts.projectModelLabel }}</mat-label>
            <input
              matInput
              name="projectModel"
              aria-label="{{ texts.projectModelLabel }}"
              [value]="modelText()"
              (input)="typeModel($event)"
            />
            <mat-hint>{{ texts.projectModelHint }}</mat-hint>
          </mat-form-field>
          <button matButton type="button" (click)="save()">
            {{ texts.saveProject }}
          </button>
        </div>
      }
      @if (saveError(); as message) {
        <p role="alert" class="problem">{{ message }}</p>
      }
    }
  `,
})
export class ProjectModelPanel {
  private readonly api = inject(API_CLIENT);
  private readonly events = inject(SSE_CLIENT);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly texts = TEXTS;

  /** The active project's id: a string when one is active, null when none is, undefined before a read. */
  private readonly active = signal<string | null | undefined>(undefined);
  protected readonly visible = computed(
    () => typeof this.active() === 'string',
  );
  protected readonly activeError = signal<string | undefined>(undefined);
  protected readonly providers = signal<ProviderRead[] | undefined>(undefined);
  protected readonly providersError = signal<string | undefined>(undefined);
  protected readonly effective = signal<EffectiveModel | undefined>(undefined);
  protected readonly effectiveError = signal<string | undefined>(undefined);
  protected readonly saveError = signal<string | undefined>(undefined);

  /** The form's values: the provider id ('' for the app default) and the model text. */
  protected readonly providerChoice = signal('');
  protected readonly modelText = signal('');

  // One counter per read: a reply of an older read is ignored (as ProjectsState.read does).
  private activeSeq = 0;
  private providersSeq = 0;
  private effectiveSeq = 0;
  private lastProject: string | undefined;
  /** True when the form should take the readout's values on the next effective reply. */
  private seedForm = true;

  constructor() {
    this.events
      .stream('project-store')
      .pipe(
        filter((envelope) => envelope.type === 'project-switched'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.refresh());
    this.events.reconcile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh());
    this.refresh();
  }

  protected sourceText(source: EffectiveModel['source']): string {
    if (source === 'project') return TEXTS.sourceProject;
    if (source === 'app') return TEXTS.sourceApp;
    return TEXTS.sourceAuto;
  }

  protected chooseProvider(event: Event): void {
    this.providerChoice.set((event.target as HTMLSelectElement).value);
  }

  protected typeModel(event: Event): void {
    this.modelText.set((event.target as HTMLInputElement).value);
  }

  /** Reads the active project first, then the provider list and the readout for it. */
  private refresh(): void {
    const seq = ++this.activeSeq;
    this.api
      .get(ACTIVE_PROJECT_PATH, activeProjectCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reply) => {
          if (seq !== this.activeSeq) return;
          this.activeError.set(undefined);
          this.loadFor(reply.active);
        },
        error: (error: unknown) => {
          if (seq !== this.activeSeq) return;
          this.active.set(undefined);
          this.activeError.set(failureMessage(error, TEXTS.projectLoadFailed));
        },
      });
  }

  private loadFor(projectId: string | null): void {
    this.active.set(projectId);
    if (projectId === null) {
      this.lastProject = undefined;
      this.providers.set(undefined);
      this.effective.set(undefined);
      this.effectiveError.set(undefined);
      return;
    }
    if (projectId !== this.lastProject) {
      this.lastProject = projectId;
      this.seedForm = true;
      this.effective.set(undefined);
      this.effectiveError.set(undefined);
    }
    this.loadProviders();
    this.loadEffective(projectId);
  }

  private loadProviders(): void {
    const seq = ++this.providersSeq;
    this.api
      .get(PROVIDERS_PATH, providerListCopy)
      .pipe(
        map((list) => list.providers),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (list) => {
          if (seq !== this.providersSeq) return;
          this.providers.set(list);
          this.providersError.set(undefined);
        },
        error: (error: unknown) => {
          if (seq !== this.providersSeq) return;
          this.providers.set(undefined);
          this.providersError.set(
            failureMessage(error, TEXTS.projectLoadFailed),
          );
        },
      });
  }

  private loadEffective(projectId: string): void {
    const seq = ++this.effectiveSeq;
    this.api
      .get(EFFECTIVE_MODEL_PATH, effectiveModelCopy, { projectId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (readout) => {
          if (seq !== this.effectiveSeq) return;
          this.effectiveError.set(undefined);
          this.effective.set(readout);
          if (this.seedForm) {
            this.seedForm = false;
            this.seed(readout);
          }
        },
        error: (error: unknown) => {
          if (seq !== this.effectiveSeq) return;
          this.effective.set(undefined);
          this.effectiveError.set(
            failureMessage(error, TEXTS.projectLoadFailed),
          );
        },
      });
  }

  /** The form starts at the project's own choice when it has one, and blank otherwise (D6). */
  private seed(readout: EffectiveModel): void {
    const own = readout.source === 'project' ? readout.choice : undefined;
    this.providerChoice.set(own?.providerId ?? '');
    this.modelText.set(own?.model ?? '');
  }

  /** Sets the project's choice, or clears it when the app default is chosen. The readout then refreshes. */
  protected save(): void {
    const clearing = this.providerChoice() === '';
    this.saveError.set(undefined);
    const request = clearing
      ? this.api.post(
          PROJECT_MODEL_CLEAR_PATH,
          undefined,
          projectModelResponseCopy,
        )
      : this.api.post(
          PROJECT_MODEL_PATH,
          { providerId: this.providerChoice(), model: this.modelText() },
          projectModelResponseCopy,
        );
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.seedForm = true;
        this.refresh();
      },
      error: (error: unknown) =>
        this.saveError.set(failureMessage(error, TEXTS.genericFailure)),
    });
  }
}
