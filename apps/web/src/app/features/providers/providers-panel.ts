import { Component, computed, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import type {
  Preset,
  ProviderRead,
} from '@bbartolome/scriba-contracts/providers';
import { ApiError } from '../../shell';
import { DEFAULT_IN_USE_CODE, NOT_FOUND_CODE } from './providers-copies';
import { TEXTS, maskedKey } from './providers-texts';
import { failureMessage, ProvidersStore } from './providers-store';
import { FormTarget, ProviderForm } from './provider-form';

/**
 * The providers panel: the provider rows, the app default, the add buttons and the one open form.
 * It is standalone and needs only the Shell's API client (through its store), so a host page with
 * no settings route can render it.
 */
@Component({
  selector: 'app-providers-panel',
  imports: [MatButton, MatFormField, MatLabel, MatInput, ProviderForm],
  providers: [ProvidersStore],
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .rows {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0;
      min-width: 0;
    }
    .badge {
      border-radius: 0.5rem;
      padding: 0 0.5rem;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    .add-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .problem {
      color: var(--mat-sys-error);
    }
  `,
  template: `
    @if (alert(); as message) {
      <p role="alert" class="problem">{{ message }}</p>
    }
    <h2>{{ texts.heading }}</h2>
    @if (store.providers() === undefined) {
      @if (store.providersError(); as message) {
        <p role="alert" class="problem">{{ message }}</p>
        <button matButton type="button" (click)="store.loadProviders()">
          {{ texts.tryAgain }}
        </button>
      } @else {
        <p>{{ texts.loading }}</p>
      }
    } @else {
      <ul aria-label="{{ texts.listLabel }}" class="rows">
        @for (provider of store.providers(); track provider.id) {
          <li class="row">
            <strong class="provider-id">{{ provider.id }}</strong>
            @if (provider.model !== '') {
              <span>{{ provider.model }}</span>
            }
            <span class="key-state">
              @if (provider.keySet) {
                <span>{{ texts.keySet }}</span>
                @if (provider.keyHint; as hint) {
                  <span>{{ masked(hint) }}</span>
                }
              } @else {
                <span>{{ texts.noKey }}</span>
              }
            </span>
            @if (provider.id === defaultId()) {
              <span class="badge">{{ texts.defaultBadge }}</span>
            }
            @if (pendingDelete() === provider.id) {
              <p>{{ texts.deletePrompt(provider.id) }}</p>
              <button
                matButton
                type="button"
                (click)="confirmDelete(provider.id)"
              >
                {{ texts.confirmDelete }}
              </button>
              <button
                matButton
                type="button"
                (click)="pendingDelete.set(undefined)"
              >
                {{ texts.cancel }}
              </button>
            } @else {
              <button matButton type="button" (click)="edit(provider.id)">
                {{ texts.edit }}
              </button>
              <button
                matButton
                type="button"
                (click)="pendingDelete.set(provider.id)"
              >
                {{ texts.deleteButton }}
              </button>
            }
          </li>
        }
      </ul>
    }

    @if (store.appDefaultError(); as message) {
      <p role="alert" class="problem">{{ message }}</p>
      <button matButton type="button" (click)="store.loadAppDefault()">
        {{ texts.tryAgain }}
      </button>
    } @else if (
      store.providers() !== undefined && store.appDefault() !== undefined
    ) {
      <mat-form-field>
        <mat-label>{{ texts.appDefaultLabel }}</mat-label>
        <select
          matNativeControl
          name="appDefault"
          (change)="chooseDefault($event)"
        >
          @if (noDefault()) {
            <option value="" disabled [selected]="true">
              {{ texts.noDefault }}
            </option>
          }
          @for (provider of store.providers(); track provider.id) {
            <option
              [value]="provider.id"
              [selected]="provider.id === defaultId()"
            >
              {{ optionLabel(provider) }}
            </option>
          }
        </select>
      </mat-form-field>
    }

    <h2>{{ texts.addHeading }}</h2>
    @if (store.presetsError(); as message) {
      <p role="alert" class="problem">{{ message }}</p>
      <button matButton type="button" (click)="store.loadPresets()">
        {{ texts.tryAgain }}
      </button>
    }
    <div class="add-buttons">
      @for (preset of store.presets() ?? []; track preset.id) {
        <button matButton type="button" (click)="add(preset)">
          {{ preset.label }}
        </button>
      }
      <button matButton type="button" (click)="addCustom()">
        {{ texts.customUrl }}
      </button>
    </div>

    @for (open of forms(); track open.key) {
      <app-provider-form [target]="open.target" (closed)="closeForm()" />
    }
  `,
})
export class ProvidersPanel {
  protected readonly store = inject(ProvidersStore);
  protected readonly texts = TEXTS;

  /** The one open form. A new key per open, so each open is a new form. */
  protected readonly forms = signal<{ key: number; target: FormTarget }[]>([]);
  protected readonly pendingDelete = signal<string | undefined>(undefined);
  protected readonly alert = signal<string | undefined>(undefined);
  private nextFormKey = 0;

  protected readonly defaultId = computed(
    () => this.store.appDefault()?.providerId,
  );

  /** No default is set, or the stored one names no listed provider (D11). */
  protected readonly noDefault = computed(() => {
    const id = this.defaultId();
    return (
      id === undefined ||
      !(this.store.providers() ?? []).some((provider) => provider.id === id)
    );
  });

  protected masked(hint: string): string {
    return maskedKey(hint);
  }

  protected optionLabel(provider: ProviderRead): string {
    return provider.model === ''
      ? provider.id
      : TEXTS.providerOption(provider.id, provider.model);
  }

  protected add(preset: Preset): void {
    this.open({ mode: 'add', preset });
  }

  protected addCustom(): void {
    this.open({ mode: 'add' });
  }

  protected edit(providerId: string): void {
    this.open({ mode: 'edit', providerId });
  }

  protected closeForm(): void {
    this.forms.set([]);
  }

  /** Sets the app default to a provider with an empty model, so it follows that provider's model (S10). */
  protected chooseDefault(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const previous = this.defaultId();
    this.alert.set(undefined);
    this.store
      .setAppDefault({ providerId: select.value, model: '' })
      .subscribe({
        error: (error: unknown) => {
          this.alert.set(failureMessage(error, TEXTS.genericFailure));
          select.value = previous ?? '';
        },
      });
  }

  protected confirmDelete(id: string): void {
    this.pendingDelete.set(undefined);
    this.alert.set(undefined);
    this.store.remove(id).subscribe({
      next: () => {
        const open = this.forms()[0]?.target;
        if (open?.mode === 'edit' && open.providerId === id) {
          this.closeForm();
        }
      },
      error: (error: unknown) => this.deleteFailed(error),
    });
  }

  private deleteFailed(error: unknown): void {
    if (
      error instanceof ApiError &&
      error.status === 409 &&
      error.code === DEFAULT_IN_USE_CODE
    ) {
      this.alert.set(TEXTS.deleteInUse);
      return;
    }
    if (
      error instanceof ApiError &&
      error.status === 404 &&
      error.code === NOT_FOUND_CODE
    ) {
      this.alert.set(TEXTS.deleteNotFound);
      this.store.loadProviders();
      return;
    }
    this.alert.set(failureMessage(error, TEXTS.genericFailure));
  }

  private open(target: FormTarget): void {
    this.pendingDelete.set(undefined);
    this.forms.set([{ key: this.nextFormKey++, target }]);
  }
}
