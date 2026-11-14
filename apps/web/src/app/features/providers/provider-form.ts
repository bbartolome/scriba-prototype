import {
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import type {
  Preset,
  ProviderConfigInput,
} from '@bbartolome/scriba-contracts/providers';
import { KeyField } from './key-field';
import { ModelListState, ModelPicker } from './model-picker';
import {
  contractUrl,
  finiteNumber,
  integerAtLeast,
  PROVIDER_DEFAULTS_COPY,
} from './providers-copies';
import { TEXTS } from './providers-texts';
import {
  CreateBody,
  errorMessage,
  failureMessage,
  ProviderFields,
  ProvidersStore,
} from './providers-store';

/** What the form opens on: a new provider from a preset (none for a custom URL), or a saved one. */
export type FormTarget =
  { mode: 'add'; preset?: Preset } | { mode: 'edit'; providerId: string };

type FieldName =
  | 'label'
  | 'baseURL'
  | 'temperature'
  | 'contextSize'
  | 'maxTokens'
  | 'timeout'
  | 'retries'
  | 'key';

/**
 * The add and edit form of one provider. Add mode becomes edit mode for the new provider once its
 * create (and key save) has ended. Save follows D6 and D7; the two message fields are the alert
 * (role "alert") and the status (role "status").
 */
@Component({
  selector: 'app-provider-form',
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatFormField,
    MatLabel,
    MatInput,
    ModelPicker,
    KeyField,
  ],
  styles: `
    .provider-form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      max-width: 40rem;
      min-width: 0;
      padding: 0.5rem 0;
    }
    .problem {
      color: var(--mat-sys-error);
      margin: 0;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  `,
  template: `
    <form class="provider-form" (submit)="$event.preventDefault()">
      <h3>{{ heading() }}</h3>
      @if (preset(); as current) {
        @for (hint of current.hints; track hint) {
          <p>{{ hint }}</p>
        }
      }
      @if (labelRequired()) {
        <mat-form-field>
          <mat-label>{{ texts.nameLabel }}</mat-label>
          <input matInput name="label" [formControl]="form.controls.label" />
        </mat-form-field>
        @if (problems().label; as message) {
          <p class="problem">{{ message }}</p>
        }
      }
      <mat-form-field>
        <mat-label>{{ texts.baseUrlLabel }}</mat-label>
        <input matInput name="baseURL" [formControl]="form.controls.baseURL" />
      </mat-form-field>
      @if (problems().baseURL; as message) {
        <p class="problem">{{ message }}</p>
      }
      <app-model-picker
        [state]="modelList()"
        [value]="model()"
        (valueChange)="setModel($event)"
        (retry)="retryModels()"
      />
      <mat-form-field>
        <mat-label>{{ texts.temperatureLabel }}</mat-label>
        <input
          matInput
          type="number"
          step="any"
          name="temperature"
          [formControl]="form.controls.temperature"
        />
      </mat-form-field>
      @if (problems().temperature; as message) {
        <p class="problem">{{ message }}</p>
      }
      <mat-form-field>
        <mat-label>{{ texts.contextLabel }}</mat-label>
        <input
          matInput
          type="number"
          name="contextSize"
          [formControl]="form.controls.contextSize"
        />
      </mat-form-field>
      @if (problems().contextSize; as message) {
        <p class="problem">{{ message }}</p>
      }
      <p>{{ texts.contextHint }}</p>
      <mat-form-field>
        <mat-label>{{ texts.maxTokensLabel }}</mat-label>
        <input
          matInput
          type="number"
          name="maxTokens"
          [formControl]="form.controls.maxTokens"
        />
      </mat-form-field>
      @if (problems().maxTokens; as message) {
        <p class="problem">{{ message }}</p>
      }
      <mat-form-field>
        <mat-label>{{ texts.timeoutLabel }}</mat-label>
        <input
          matInput
          type="number"
          name="timeout"
          [formControl]="form.controls.timeout"
        />
      </mat-form-field>
      @if (problems().timeout; as message) {
        <p class="problem">{{ message }}</p>
      }
      <p>{{ texts.timeoutHint }}</p>
      <mat-form-field>
        <mat-label>{{ texts.retriesLabel }}</mat-label>
        <input
          matInput
          type="number"
          name="retries"
          [formControl]="form.controls.retries"
        />
      </mat-form-field>
      @if (problems().retries; as message) {
        <p class="problem">{{ message }}</p>
      }
      <app-key-field
        [control]="form.controls.key"
        [keySet]="keySet()"
        [keyHint]="keyHint()"
        [required]="keyRequired()"
        [settled]="keySettled()"
        (remove)="removeKey()"
      />
      @if (problems().key; as message) {
        <p class="problem">{{ message }}</p>
      }
      @if (alert(); as message) {
        <p role="alert" class="problem">{{ message }}</p>
      }
      @if (status(); as message) {
        <p role="status">{{ message }}</p>
      }
      <div class="actions">
        <button
          matButton="filled"
          type="button"
          [disabled]="!canSave()"
          (click)="save()"
        >
          {{ texts.save }}
        </button>
        <button matButton type="button" (click)="close()">
          {{ texts.close }}
        </button>
      </div>
    </form>
  `,
})
export class ProviderForm implements OnInit {
  readonly target = input.required<FormTarget>();
  readonly closed = output<void>();

  protected readonly store = inject(ProvidersStore);
  protected readonly texts = TEXTS;

  /** The provider this form edits. Undefined in add mode, until the create has ended. */
  protected readonly providerId = signal<string | undefined>(undefined);
  /** The form's alert field: a failed create, update, key save or Remove. */
  protected readonly alert = signal<string | undefined>(undefined);
  /** The form's status field: `Saved.` after a save that went through. */
  protected readonly status = signal<string | undefined>(undefined);
  protected readonly modelList = signal<ModelListState>({ state: 'unsaved' });
  /** How many key steps have ended in this form (see KeyField's `settled`). */
  protected readonly keySettled = signal(0);

  protected readonly form = new FormGroup({
    label: new FormControl('', { nonNullable: true }),
    baseURL: new FormControl('', { nonNullable: true }),
    model: new FormControl('', { nonNullable: true }),
    temperature: new FormControl<number | null>(
      PROVIDER_DEFAULTS_COPY.temperature,
    ),
    contextSize: new FormControl<number | null>(
      PROVIDER_DEFAULTS_COPY.contextSize,
    ),
    maxTokens: new FormControl<number | null>(PROVIDER_DEFAULTS_COPY.maxTokens),
    timeout: new FormControl<number | null>(PROVIDER_DEFAULTS_COPY.timeout),
    retries: new FormControl<number | null>(PROVIDER_DEFAULTS_COPY.retries),
    key: new FormControl('', { nonNullable: true }),
  });

  private readonly values = signal(this.form.getRawValue());

  protected readonly preset = computed(() => {
    const target = this.target();
    return target.mode === 'add' ? target.preset : undefined;
  });

  protected readonly heading = computed(() => {
    const id = this.providerId();
    if (id !== undefined) {
      return TEXTS.editHeading(id);
    }
    const preset = this.preset();
    return preset ? TEXTS.addPresetHeading(preset.label) : TEXTS.addCustom;
  });

  /** Add mode with no preset: the form needs a name (sent as `label`). */
  protected readonly labelRequired = computed(
    () => this.providerId() === undefined && this.preset() === undefined,
  );

  /** Add mode of a preset that needs a key. */
  protected readonly keyRequired = computed(
    () =>
      this.providerId() === undefined && this.preset()?.keyRequired === true,
  );

  private readonly saved = computed(() => {
    const id = this.providerId();
    return id === undefined
      ? undefined
      : this.store.providers()?.find((provider) => provider.id === id);
  });

  protected readonly keySet = computed(() => this.saved()?.keySet ?? false);
  protected readonly keyHint = computed(() => this.saved()?.keyHint);
  protected readonly model = computed(() => this.values().model);
  /** The typed key, as the key control holds it. It is sent only in a key/set body (D8). */
  protected readonly typedKey = computed(() => this.values().key);

  /** The seven editable fields, or undefined while a field is invalid (D13). The update and create bodies use them. */
  private readonly fields = computed<ProviderFields | undefined>(() => {
    const values = this.values();
    const baseURL = contractUrl(values.baseURL);
    const temperature = finiteNumber(values.temperature);
    const contextSize = integerAtLeast(values.contextSize, 1);
    const maxTokens = integerAtLeast(values.maxTokens, 1);
    const timeout = integerAtLeast(values.timeout, 0);
    const retries = integerAtLeast(values.retries, 0);
    if (
      baseURL === undefined ||
      temperature === undefined ||
      contextSize === undefined ||
      maxTokens === undefined ||
      timeout === undefined ||
      retries === undefined
    ) {
      return undefined;
    }
    return {
      baseURL,
      model: values.model,
      temperature,
      contextSize,
      maxTokens,
      timeout,
      retries,
    };
  });

  /** The config as the contract's connection-test draft takes it (kind included), or undefined while a field is invalid (D13). */
  protected readonly draft = computed<ProviderConfigInput | undefined>(() => {
    const fields = this.fields();
    return fields === undefined
      ? undefined
      : { kind: 'openai-compatible', ...fields };
  });

  /** The message for each invalid field. Empty when the form is valid. */
  protected readonly problems = computed(() => {
    const values = this.values();
    const found: Partial<Record<FieldName, string>> = {};
    if (contractUrl(values.baseURL) === undefined) {
      found.baseURL = TEXTS.urlInvalid;
    }
    if (finiteNumber(values.temperature) === undefined) {
      found.temperature = TEXTS.numberInvalid;
    }
    if (integerAtLeast(values.contextSize, 1) === undefined) {
      found.contextSize = TEXTS.wholeAtLeastOne;
    }
    if (integerAtLeast(values.maxTokens, 1) === undefined) {
      found.maxTokens = TEXTS.wholeAtLeastOne;
    }
    if (integerAtLeast(values.timeout, 0) === undefined) {
      found.timeout = TEXTS.wholeAtLeastZero;
    }
    if (integerAtLeast(values.retries, 0) === undefined) {
      found.retries = TEXTS.wholeAtLeastZero;
    }
    if (this.labelRequired() && !/[A-Za-z0-9]/.test(values.label)) {
      found.label = TEXTS.nameInvalid;
    }
    if (this.keyRequired() && values.key === '') {
      found.key = TEXTS.keyRequired;
    }
    return found;
  });

  protected readonly canSave = computed(
    () =>
      this.draft() !== undefined && Object.keys(this.problems()).length === 0,
  );

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.values.set(this.form.getRawValue()));
  }

  ngOnInit(): void {
    const target = this.target();
    if (target.mode === 'edit') {
      const saved = this.store
        .providers()
        ?.find((provider) => provider.id === target.providerId);
      if (saved) {
        this.form.patchValue({
          baseURL: saved.baseURL,
          model: saved.model,
          temperature: saved.temperature,
          contextSize: saved.contextSize,
          maxTokens: saved.maxTokens,
          timeout: saved.timeout,
          retries: saved.retries,
        });
      }
      this.providerId.set(target.providerId);
      this.requestModels(target.providerId);
    } else {
      this.form.patchValue({
        baseURL: target.preset?.baseURL ?? '',
        ...PROVIDER_DEFAULTS_COPY,
      });
    }
  }

  protected setModel(model: string): void {
    this.form.controls.model.setValue(model);
  }

  protected retryModels(): void {
    const id = this.providerId();
    if (id !== undefined) {
      this.requestModels(id);
    }
  }

  /** Save: the create or the update, then the key step if a key was typed (D6, D7). */
  protected save(): void {
    const fields = this.fields();
    if (fields === undefined || !this.canSave()) {
      return;
    }
    const key = this.form.controls.key.value;
    const id = this.providerId();
    this.alert.set(undefined);
    this.status.set(undefined);
    if (id === undefined) {
      const preset = this.preset();
      const body: CreateBody = preset
        ? { ...fields, kind: 'openai-compatible', presetId: preset.id }
        : {
            ...fields,
            kind: 'openai-compatible',
            label: this.form.controls.label.value,
          };
      this.store.create(body).subscribe({
        next: (read) => {
          this.providerId.set(read.id);
          this.afterSave(read.id, key);
        },
        error: (error: unknown) =>
          this.alert.set(failureMessage(error, TEXTS.genericFailure)),
      });
    } else {
      this.store.update(id, fields).subscribe({
        next: () => this.afterSave(id, key),
        error: (error: unknown) =>
          this.alert.set(failureMessage(error, TEXTS.genericFailure)),
      });
    }
  }

  /** Deletes the key of the saved provider. Its reply replaces the row, then the list is read. */
  protected removeKey(): void {
    const id = this.providerId();
    if (id === undefined) {
      return;
    }
    this.store.clearKey(id).subscribe({
      next: () => this.requestModels(id),
      error: (error: unknown) =>
        this.alert.set(failureMessage(error, TEXTS.genericFailure)),
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  private afterSave(id: string, key: string): void {
    if (key === '') {
      this.finish(id, true);
      return;
    }
    this.store.setKey(id, key).subscribe({
      next: () => this.finish(id, true),
      error: () => {
        this.alert.set(TEXTS.keySaveFailed);
        this.finish(id, false);
      },
    });
  }

  /** The key step has ended: clear the key, show `Saved.` if it went through, and read the list. */
  private finish(id: string, saved: boolean): void {
    this.form.controls.key.setValue('');
    this.keySettled.update((count) => count + 1);
    this.providerId.set(id);
    if (saved) {
      this.status.set(TEXTS.saved);
    }
    this.requestModels(id);
  }

  private requestModels(id: string): void {
    this.modelList.set({ state: 'loading' });
    this.store.listModels(id).subscribe({
      next: (models) =>
        this.modelList.set(
          models.length === 0 ? { state: 'empty' } : { state: 'ready', models },
        ),
      error: (error: unknown) =>
        this.modelList.set({ state: 'failed', message: errorMessage(error) }),
    });
  }
}
