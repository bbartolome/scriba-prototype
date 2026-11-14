import { Component, computed, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { TEXTS } from './providers-texts';

/** The five states of the model list (D9). */
export type ModelListState =
  | { state: 'unsaved' }
  | { state: 'loading' }
  | { state: 'ready'; models: string[] }
  | { state: 'empty' }
  | { state: 'failed'; message?: string };

/**
 * The model control. A dropdown when the list loads; free text, with an explanation, when the
 * provider is unsaved, lists nothing, or the list fails. Presentational: the form holds the state.
 */
@Component({
  selector: 'app-model-picker',
  imports: [MatButton, MatFormField, MatLabel, MatInput],
  styles: `
    .note {
      margin: 0.25rem 0;
    }
  `,
  template: `
    @switch (state().state) {
      @case ('ready') {
        <mat-form-field>
          <mat-label>{{ texts.modelLabel }}</mat-label>
          <select
            matNativeControl
            name="model"
            aria-label="Model"
            (change)="pick($event)"
          >
            <option value="" [selected]="value() === ''">
              {{ texts.automatic }}
            </option>
            @for (model of models(); track model) {
              <option [value]="model" [selected]="model === value()">
                {{ model }}
              </option>
            }
            @if (unlisted()) {
              <option [value]="value()" selected>
                {{ texts.notListed(value()) }}
              </option>
            }
          </select>
        </mat-form-field>
      }
      @case ('loading') {
        <mat-form-field>
          <mat-label>{{ texts.modelLabel }}</mat-label>
          <select matNativeControl name="model" aria-label="Model" disabled>
            <option value="">{{ texts.loadingModels }}</option>
          </select>
        </mat-form-field>
      }
      @default {
        <mat-form-field>
          <mat-label>{{ texts.modelLabel }}</mat-label>
          <input
            matInput
            name="model"
            aria-label="Model"
            [value]="value()"
            (input)="type($event)"
          />
        </mat-form-field>
        @switch (state().state) {
          @case ('unsaved') {
            <p class="note">{{ texts.modelUnsaved }}</p>
          }
          @case ('empty') {
            <p class="note">{{ texts.modelEmpty }}</p>
          }
          @case ('failed') {
            <p class="note">{{ texts.modelFailed }}</p>
            @if (failureMessage(); as message) {
              <p class="note">{{ message }}</p>
            }
            <button matButton type="button" (click)="retry.emit()">
              {{ texts.tryAgain }}
            </button>
          }
        }
      }
    }
  `,
})
export class ModelPicker {
  readonly state = input<ModelListState>({ state: 'unsaved' });
  readonly value = input.required<string>();
  readonly valueChange = output<string>();
  readonly retry = output<void>();

  protected readonly texts = TEXTS;

  protected readonly models = computed(() => {
    const current = this.state();
    return current.state === 'ready' ? current.models : [];
  });

  /** A stored model that the list does not name is kept as an extra option (D9). */
  protected readonly unlisted = computed(() => {
    const current = this.value();
    return current !== '' && !this.models().includes(current);
  });

  protected readonly failureMessage = computed(() => {
    const current = this.state();
    return current.state === 'failed' ? current.message : undefined;
  });

  protected pick(event: Event): void {
    this.valueChange.emit((event.target as HTMLSelectElement).value);
  }

  protected type(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
