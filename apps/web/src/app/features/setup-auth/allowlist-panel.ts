import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import type { Allowlist } from '@bbartolome/scriba-contracts/setup-auth';
import { API_CLIENT, ApiError } from '../../shell';
import { loadAllowlistContract } from './setup-contract';
import { tailnetExplanation } from './sign-in-notice';

type AllowlistContract = Awaited<ReturnType<typeof loadAllowlistContract>>;

/** The lockout text. It names the way back, and the server's own text is not shown. */
const LOCKOUT_TEXT =
  'This change would leave this Tailscale login out of the allowlist, so it was refused. Make the change from the computer that runs Scriba.';

/**
 * The owner allowlist: the on/off switch and the logins it lists. The switch sends a change; the
 * logins are shown read-only, because the panel adds and removes none. A refused change keeps the
 * saved list and sets the switch back to it.
 */
@Component({
  imports: [MatSlideToggle],
  selector: 'app-allowlist-panel',
  styles: `
    :host {
      display: block;
      overflow-wrap: anywhere;
    }
  `,
  template: `
    <mat-slide-toggle
      [checked]="saved()?.enabled ?? false"
      (change)="onToggle($event)"
    >
      Allow only listed Tailscale logins
    </mat-slide-toggle>
    @if (saved(); as list) {
      @if (list.logins.length > 0) {
        <ul>
          @for (login of list.logins; track login) {
            <li>{{ login }}</li>
          }
        </ul>
      } @else {
        <p>No logins are listed.</p>
      }
    }
    @if (lockout()) {
      <p role="alert">{{ lockoutText }}</p>
    }
    @if (explanation(); as text) {
      <p>{{ text }}</p>
    }
    @if (failure(); as message) {
      <p role="alert">{{ message }}</p>
    }
  `,
})
export class AllowlistPanel {
  private readonly api = inject(API_CLIENT);
  private readonly destroyRef = inject(DestroyRef);
  // Loaded once. A change waits for it, so a switch set before the load is not lost.
  private readonly loaded = loadAllowlistContract();
  private contract: AllowlistContract | undefined;

  protected readonly lockoutText = LOCKOUT_TEXT;
  protected readonly saved = signal<Allowlist | undefined>(undefined);
  protected readonly lockout = signal(false);
  protected readonly explanation = signal<string | undefined>(undefined);
  protected readonly failure = signal<string | undefined>(undefined);

  constructor() {
    void this.load();
  }

  /** Posts the new switch value only. A refusal keeps the saved list and resets the switch. */
  protected onToggle(event: MatSlideToggleChange): void {
    void this.loaded.then(
      (contract) => {
        this.api
          .post(
            contract.ALLOWLIST_ROUTE,
            { enabled: event.checked },
            contract.allowlistSchema,
          )
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (list) => {
              this.saved.set(list);
              this.lockout.set(false);
              this.explanation.set(undefined);
              this.failure.set(undefined);
            },
            error: (error: unknown) => {
              event.source.checked = this.saved()?.enabled ?? false;
              this.fail(error, contract);
            },
          });
      },
      () => undefined,
    );
  }

  private async load(): Promise<void> {
    try {
      const contract = await this.loaded;
      this.contract = contract;
      this.api
        .get(contract.ALLOWLIST_ROUTE, contract.allowlistSchema)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (list) => this.saved.set(list),
          error: (error: unknown) => {
            this.fail(error, contract);
          },
        });
    } catch (error: unknown) {
      this.failure.set(messageOf(error));
    }
  }

  /** Shows the lockout text for its code, a tailnet explanation, or the message of any other error. */
  private fail(error: unknown, contract: AllowlistContract): void {
    const codes = contract.SETUP_AUTH_ERROR_CODES;
    if (error instanceof ApiError && error.code === codes.ALLOWLIST_LOCKOUT) {
      this.lockout.set(true);
      return;
    }
    const text =
      error instanceof ApiError
        ? tailnetExplanation(error.code, codes)
        : undefined;
    if (text !== undefined) {
      this.explanation.set(text);
    } else {
      this.failure.set(messageOf(error));
    }
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed.';
}
