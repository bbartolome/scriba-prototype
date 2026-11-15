import { Component, computed, input, output, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import type { Preferences } from '@bbartolome/scriba-contracts/setup-auth';

type PreferenceKey = keyof Preferences;

const PREFERENCE_KEYS: readonly PreferenceKey[] = [
  'authorName',
  'defaultGenrePack',
];

/**
 * The two preference fields, both free text. The form keeps its own drafts and emits only the
 * fields whose text differs from the stored value. The Save button is disabled when none differ.
 * The form makes no API call; the page posts what it emits.
 */
@Component({
  imports: [MatButton],
  selector: 'app-preferences-form',
  styles: `
    :host {
      display: block;
    }

    label {
      display: block;
      margin-bottom: 12px;
    }

    input {
      display: block;
      width: 100%;
      max-width: 320px;
      margin-top: 4px;
    }
  `,
  template: `
    <label>
      Author name
      <input
        type="text"
        name="authorName"
        [value]="shownValue('authorName')"
        (input)="onInput('authorName', $event)"
      />
    </label>
    <label>
      Default genre pack
      <input
        type="text"
        name="defaultGenrePack"
        [value]="shownValue('defaultGenrePack')"
        (input)="onInput('defaultGenrePack', $event)"
      />
    </label>
    <button
      mat-flat-button
      type="button"
      [disabled]="!hasChanges()"
      (click)="onSave()"
    >
      Save preferences
    </button>
  `,
})
export class PreferencesForm {
  /** The stored values. The page sets them again from the answer of each save. */
  readonly stored = input.required<Preferences>();

  /** The changed fields only. */
  readonly save = output<Partial<Preferences>>();

  private readonly drafts = signal<Partial<Record<PreferenceKey, string>>>({});

  protected readonly changes = computed<Partial<Preferences>>(() => {
    const drafts = this.drafts();
    const stored = this.stored();
    const changed: Partial<Preferences> = {};
    for (const key of PREFERENCE_KEYS) {
      const draft = drafts[key];
      if (draft !== undefined && draft !== (stored[key] ?? '')) {
        changed[key] = draft;
      }
    }
    return changed;
  });

  protected readonly hasChanges = computed(
    () => Object.keys(this.changes()).length > 0,
  );

  protected shownValue(key: PreferenceKey): string {
    return this.drafts()[key] ?? this.stored()[key] ?? '';
  }

  protected onInput(key: PreferenceKey, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.drafts.update((drafts) => ({ ...drafts, [key]: value }));
  }

  protected onSave(): void {
    const changed = this.changes();
    if (Object.keys(changed).length === 0) return;
    this.save.emit(changed);
  }
}
