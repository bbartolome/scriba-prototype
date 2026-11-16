import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Preferences } from '@bbartolome/scriba-contracts/setup-auth';
import { API_CLIENT, ThemeToggle } from '../../shell';
import { PreferencesForm } from './preferences-form';
import { loadSetupAuthContract } from './setup-contract';

type SetupAuthContract = Awaited<ReturnType<typeof loadSetupAuthContract>>;

/**
 * The preferences step. It reads the stored values when it is shown and posts only the changed
 * fields on Save. It emits `saved` after a save so the page marks the step done. It embeds the
 * Shell's device-local theme toggle, which makes no server call.
 */
@Component({
  imports: [PreferencesForm, ThemeToggle],
  selector: 'app-preferences-step',
  template: `
    @if (stored(); as values) {
      <app-preferences-form
        [stored]="values"
        (save)="onSave($event)"
      />
    }
    <p>Theme is kept on this device only.</p>
    <app-theme-toggle />
  `,
})
export class PreferencesStep {
  private readonly api = inject(API_CLIENT);
  private readonly destroyRef = inject(DestroyRef);
  private contract: SetupAuthContract | undefined;

  protected readonly stored = signal<Preferences | undefined>(undefined);
  private readonly saving = signal(false);

  /** Emitted after a successful save. */
  readonly saved = output<void>();

  /** Emitted with the error of a failed read or save. */
  readonly failed = output<unknown>();

  constructor() {
    void this.load();
  }

  protected onSave(changed: Partial<Preferences>): void {
    const contract = this.contract;
    if (contract === undefined || this.saving()) return;
    this.saving.set(true);
    this.api
      .post(contract.PREFERENCES_ROUTE, changed, contract.preferencesSchema)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (values) => {
          this.stored.set(values);
          this.saving.set(false);
          this.saved.emit();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.failed.emit(error);
        },
      });
  }

  private async load(): Promise<void> {
    try {
      const contract = await loadSetupAuthContract();
      this.contract = contract;
      this.api
        .get(contract.PREFERENCES_ROUTE, contract.preferencesSchema)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (values) => this.stored.set(values),
          error: (error: unknown) => this.failed.emit(error),
        });
    } catch (error: unknown) {
      this.failed.emit(error);
    }
  }
}
