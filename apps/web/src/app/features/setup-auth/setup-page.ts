import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { Router } from '@angular/router';
import type {
  Identity,
  SetupStatus,
  SetupStep,
} from '@bbartolome/scriba-contracts/setup-auth';
import { API_CLIENT, ApiError, type ApiPath } from '../../shell';
import { ComposeWarning } from './compose-warning';
import { loadSetupAuthContract } from './setup-contract';
import { SignInNotice, tailnetExplanation } from './sign-in-notice';
import { StepBody } from './step-body';
import { WIZARD_STEPS } from './steps';

type SetupAuthContract = Awaited<ReturnType<typeof loadSetupAuthContract>>;

/**
 * The setup wizard at `/setup`. It shows who the caller is, then the five steps with their states.
 * Next moves on and writes nothing. Mark done and Skip write the step's state and move on. Skip the
 * rest and Finish complete setup and go to the landing. A 401 shows the sign-in notice; the two
 * tailnet codes show their explanations; any other error shows its message.
 */
@Component({
  imports: [ComposeWarning, MatButton, SignInNotice, StepBody],
  selector: 'app-setup-page',
  styles: `
    :host {
      display: block;
      padding: 16px;
      overflow-wrap: anywhere;
    }

    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  `,
  template: `
    <h2>Setup</h2>
    @if (signedOut()) {
      <app-sign-in-notice />
    } @else if (explanation(); as text) {
      <p>{{ text }}</p>
    } @else if (identity(); as who) {
      @if (status(); as loaded) {
        @if (loaded.compose.state !== 'ok') {
          <app-compose-warning [compose]="loaded.compose" />
        }
        <ol>
          @for (item of steps; track item.key) {
            <li>{{ item.title }}: {{ loaded.steps[item.key] }}</li>
          }
        </ol>
        <app-step-body [step]="step()" [who]="who" />
        <div class="controls">
          @if (isLastStep()) {
            <button
              mat-flat-button
              [disabled]="busy()"
              (click)="writeState('done')"
            >
              Mark done
            </button>
            <button
              mat-stroked-button
              [disabled]="busy()"
              (click)="writeState('skipped')"
            >
              Skip
            </button>
            <button mat-flat-button [disabled]="busy()" (click)="finish()">
              Finish
            </button>
          } @else {
            @if (step() !== 'access') {
              <button
                mat-flat-button
                [disabled]="busy()"
                (click)="writeState('done')"
              >
                Mark done
              </button>
              <button
                mat-stroked-button
                [disabled]="busy()"
                (click)="writeState('skipped')"
              >
                Skip
              </button>
            }
            <button mat-stroked-button [disabled]="busy()" (click)="advance()">
              Next
            </button>
            <button mat-stroked-button [disabled]="busy()" (click)="finish()">
              Skip the rest
            </button>
          }
        </div>
      }
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

  protected readonly steps = WIZARD_STEPS;
  protected readonly identity = signal<Identity | undefined>(undefined);
  protected readonly status = signal<SetupStatus | undefined>(undefined);
  protected readonly step = signal<SetupStep>('access');
  protected readonly signedOut = signal(false);
  protected readonly explanation = signal<string | undefined>(undefined);
  protected readonly failure = signal<string | undefined>(undefined);
  protected readonly busy = signal(false);

  private readonly position = computed(() =>
    WIZARD_STEPS.findIndex((item) => item.key === this.step()),
  );
  protected readonly isLastStep = computed(
    () => this.position() === WIZARD_STEPS.length - 1,
  );

  constructor() {
    void this.load();
  }

  /** Next: moves on to the following step and writes nothing. */
  protected advance(): void {
    if (this.busy()) return;
    this.moveOn();
  }

  /** Mark done or Skip: writes the step's state, then moves on, or finishes on the last step. */
  protected writeState(state: 'done' | 'skipped'): void {
    const contract = this.contract;
    if (contract === undefined || this.busy()) return;
    const path = contract.SETUP_STEP_ROUTE.replace(
      ':step',
      this.step(),
    ) as ApiPath;
    this.begin();
    this.api
      .post(path, { state }, contract.setupStatusSchema)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status) => {
          this.status.set(status);
          this.busy.set(false);
          if (this.isLastStep()) {
            this.finish();
          } else {
            this.moveOn();
          }
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.fail(error);
        },
      });
  }

  /** Skip the rest and Finish: completes setup and goes to the landing. */
  protected finish(): void {
    const contract = this.contract;
    if (contract === undefined || this.busy()) return;
    this.begin();
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

  private moveOn(): void {
    const next = WIZARD_STEPS[this.position() + 1];
    if (next !== undefined) {
      this.step.set(next.key);
    }
  }

  private begin(): void {
    this.busy.set(true);
    this.failure.set(undefined);
  }

  private async load(): Promise<void> {
    // The initial read is inside the try: a synchronous throw of the read reaches the alert line.
    try {
      const contract = await loadSetupAuthContract();
      this.contract = contract;
      this.api
        .get(contract.IDENTITY_ROUTE, contract.identitySchema)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (who) => {
            this.identity.set(who);
            this.readStatus(contract);
          },
          error: (error: unknown) => this.fail(error),
        });
    } catch (error: unknown) {
      this.failure.set(messageOf(error));
    }
  }

  /** Reads the status after a 200 identity: the step states and the compose check. */
  private readStatus(contract: SetupAuthContract): void {
    this.api
      .get(contract.SETUP_STATUS_ROUTE, contract.setupStatusSchema)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status) => this.status.set(status),
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
