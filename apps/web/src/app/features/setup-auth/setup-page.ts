import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { Router } from '@angular/router';
import type { Identity } from '@bbartolome/scriba-contracts/setup-auth';
import { API_CLIENT, ApiError } from '../../shell';
import { loadSetupAuthContract } from './setup-contract';
import { SignInNotice, tailnetExplanation } from './sign-in-notice';

type SetupAuthContract = Awaited<ReturnType<typeof loadSetupAuthContract>>;

/**
 * The setup page at `/setup`. It shows who the caller is and offers Continue, which completes
 * setup and goes to the landing. A 401 shows the sign-in notice; the two tailnet codes show their
 * explanations; any other error shows its message.
 */
@Component({
  imports: [MatButton, SignInNotice],
  selector: 'app-setup-page',
  styles: `
    :host {
      display: block;
      padding: 16px;
      overflow-wrap: anywhere;
    }
  `,
  template: `
    <h2>Setup</h2>
    @if (signedOut()) {
      <app-sign-in-notice />
    } @else if (explanation(); as text) {
      <p>{{ text }}</p>
    } @else if (identity(); as who) {
      <p>{{ identityText(who) }}</p>
      <p>You're in.</p>
      <button mat-flat-button [disabled]="busy()" (click)="onContinue()">
        Continue
      </button>
    }
    @if (failure(); as message) {
      <p role="alert">{{ message }}</p>
    }
  `,
})
export class SetupPage {
  private readonly api = inject(API_CLIENT);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private contract: SetupAuthContract | undefined;

  protected readonly identity = signal<Identity | undefined>(undefined);
  protected readonly signedOut = signal(false);
  protected readonly explanation = signal<string | undefined>(undefined);
  protected readonly failure = signal<string | undefined>(undefined);
  protected readonly busy = signal(false);

  constructor() {
    void this.load();
  }

  protected identityText(who: Identity): string {
    return who.via === 'loopback'
      ? 'Signed in from this computer (loopback).'
      : `Signed in over the tailnet as ${who.login}.`;
  }

  protected onContinue(): void {
    const contract = this.contract;
    if (contract === undefined || this.busy()) return;
    this.busy.set(true);
    this.failure.set(undefined);
    this.api
      .post(contract.SETUP_CONTINUE_ROUTE, {}, contract.setupStatusSchema)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(contract.LANDING_PATH, {
            replaceUrl: true,
          });
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.fail(error);
        },
      });
  }

  private async load(): Promise<void> {
    let contract: SetupAuthContract;
    try {
      contract = await loadSetupAuthContract();
    } catch (error: unknown) {
      this.failure.set(messageOf(error));
      return;
    }
    this.contract = contract;
    this.api
      .get(contract.IDENTITY_ROUTE, contract.identitySchema)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (who) => this.identity.set(who),
        error: (error: unknown) => this.fail(error),
      });
  }

  /** Shows the state an error calls for: the sign-in notice, a tailnet explanation or a message. */
  private fail(error: unknown): void {
    if (error instanceof ApiError && error.status === 401) {
      this.signedOut.set(true);
      return;
    }
    const codes = this.contract?.SETUP_AUTH_ERROR_CODES;
    const text =
      error instanceof ApiError && codes !== undefined
        ? tailnetExplanation(error.code, codes)
        : undefined;
    if (text !== undefined) {
      this.explanation.set(text);
      return;
    }
    this.failure.set(messageOf(error));
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed.';
}
