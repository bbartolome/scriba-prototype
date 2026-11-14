import { Component, effect, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { maskedKey, TEXTS } from './providers-texts';

/**
 * The write-only key field (D8). It shows the key state and, when a key is set, Replace and Remove.
 * The typed text lives only in the form's key control; nothing here renders a key.
 */
@Component({
  selector: 'app-key-field',
  imports: [ReactiveFormsModule, MatButton, MatFormField, MatLabel, MatInput],
  styles: `
    .key-state {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }
  `,
  template: `
    <div class="key-state">
      @if (keySet()) {
        <span>{{ texts.keySet }}</span>
        @if (keyHint(); as hint) {
          <span>{{ masked(hint) }}</span>
        }
        <button matButton type="button" (click)="toggleReplace()">
          {{ texts.replace }}
        </button>
        <button matButton type="button" (click)="remove.emit()">
          {{ texts.removeKey }}
        </button>
      } @else {
        <span>{{ texts.noKey }}</span>
      }
    </div>
    @if (!keySet() || replacing()) {
      <mat-form-field>
        <mat-label>{{ texts.keyLabel }}</mat-label>
        <input
          matInput
          name="key"
          type="password"
          autocomplete="new-password"
          spellcheck="false"
          [attr.aria-required]="required() ? 'true' : null"
          [formControl]="control()"
        />
      </mat-form-field>
    }
  `,
})
export class KeyField {
  readonly control = input.required<FormControl<string>>();
  readonly keySet = input.required<boolean>();
  readonly keyHint = input<string | undefined>(undefined);
  readonly required = input(false);
  /** Counts the key steps that have ended. A change ends a Replace, so the input is hidden again. */
  readonly settled = input(0);
  readonly remove = output<void>();

  protected readonly texts = TEXTS;
  protected readonly replacing = signal(false);

  constructor() {
    effect(() => {
      this.keySet();
      this.settled();
      this.replacing.set(false);
    });
  }

  protected masked(hint: string): string {
    return maskedKey(hint);
  }

  /** Shows the input; a second press hides it and clears what was typed. */
  protected toggleReplace(): void {
    if (this.replacing()) {
      this.control().setValue('');
      this.replacing.set(false);
    } else {
      this.replacing.set(true);
    }
  }
}
