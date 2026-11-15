import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { Router } from '@angular/router';
import type { VersionInfo } from '@bbartolome/scriba-contracts/platform';
import type {
  Identity,
  Preferences,
  SetupStatus,
} from '@bbartolome/scriba-contracts/setup-auth';
import { API_CLIENT, ApiError } from '../../shell';
import type { ApiPath, ResponseSchema } from '../../shell';
import { ProvidersPanel } from '../providers/providers.routes';
import { ComposeWarning } from './compose-warning';
import { PreferencesForm } from './preferences-form';
import { VERSION_PATH, versionInfoCopy } from './platform-copy';
import { loadSettingsContract } from './setup-contract';
import {
  DOCKER_LOGS_COMMAND,
  SIGN_IN_COMMAND,
  tailnetExplanation,
} from './sign-in-notice';

type SettingsContract = Awaited<ReturnType<typeof loadSettingsContract>>;

/**
 * Response of POST /api/setup-auth/sign-out: a 204 with no body (setup-session.controller.ts line
 * 122). The contract has no schema for it, so the page accepts `null` or `undefined` here.
 */
const signOutCopy: ResponseSchema<null> = {
  safeParse(data) {
    return data === null || data === undefined
      ? { success: true, data: null }
      : { success: false, error: 'A 204 has no body.' };
  },
};

/**
 * The settings page at `/settings`. It shows this device's connection, the preferences, the model
 * providers, the versions with the compose warning, the recovery steps, a way to run setup again,
 * and sign-out for this browser. Each read is independent; a tailnet code shows its explanation and
 * any other error shows its message.
 */
@Component({
  imports: [ComposeWarning, MatButton, PreferencesForm, ProvidersPanel],
  selector: 'app-settings-page',
  styles: `
    :host {
      display: block;
      padding: 16px;
      overflow-wrap: anywhere;
    }
  `,
  template: `
    <h2>Settings</h2>
    @for (text of explanations(); track $index) {
      <p>{{ text }}</p>
    }
    @for (message of failures(); track $index) {
      <p role="alert">{{ message }}</p>
    }

    <section>
      <h3>This device</h3>
      @if (identity(); as who) {
        <p>{{ identityText(who) }}</p>
      }
      <button
        mat-flat-button
        type="button"
        [disabled]="busy()"
        (click)="onSignOut()"
      >
        Sign out this browser
      </button>
      <p>
        Signs out this browser only. A copy of the cookie elsewhere stays valid
        until the setup token changes.
      </p>
    </section>

    <section>
      <h3>Preferences</h3>
      @if (preferences(); as stored) {
        <app-preferences-form
          [stored]="stored"
          (save)="onSavePreferences($event)"
        />
      }
    </section>

    <section>
      <h3>Model providers</h3>
      <app-providers-panel />
    </section>

    <section>
      <h3>Versions</h3>
      @if (version(); as info) {
        <p>Scriba {{ info.version }} (revision {{ info.revision }})</p>
        <p>Compose version {{ info.composeVersion }}</p>
      }
      @if (status(); as current) {
        <app-compose-warning [compose]="current.compose" />
      }
    </section>

    <section>
      <h3>Recovery</h3>
      <ol>
        <li>
          Re-open the setup URL: <code>{{ signInCommand }}</code
          >, or find it in <code>{{ dockerLogsCommand }}</code
          >.
        </li>
        <li>
          Replace a leaked token: delete
          <code>~/Books/.scriba/setup-token</code> and run
          <code>docker compose restart</code> in the install folder. Scriba
          makes a new token and rewrites the setup URL, and every existing
          cookie stops working.
        </li>
        <li>
          Last resort: stop the stack with <code>docker compose stop</code>,
          delete the contents of <code>~/Books/.scriba/</code> (settings,
          secrets, search indexes, your own tool packs in
          <code>packs/user/</code>, and the setup token), then start the stack
          again with <code>docker compose restart</code>. Your projects are not
          touched.
        </li>
        <li>
          Allowlist locked out a tailnet device: use the Mac and the setup URL.
        </li>
      </ol>
    </section>

    <section>
      <h3>Setup</h3>
      <button mat-flat-button type="button" (click)="onRerunSetup()">
        Re-run setup
      </button>
    </section>
  `,
})
export class SettingsPage {
  private readonly api = inject(API_CLIENT);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  // Loaded once. Each action waits for it, so a click made before the load is not lost.
  private readonly loaded = loadSettingsContract();
  private contract: SettingsContract | undefined;

  protected readonly signInCommand = SIGN_IN_COMMAND;
  protected readonly dockerLogsCommand = DOCKER_LOGS_COMMAND;

  protected readonly identity = signal<Identity | undefined>(undefined);
  protected readonly status = signal<SetupStatus | undefined>(undefined);
  protected readonly version = signal<VersionInfo | undefined>(undefined);
  protected readonly preferences = signal<Preferences | undefined>(undefined);
  protected readonly explanations = signal<string[]>([]);
  protected readonly failures = signal<string[]>([]);
  protected readonly busy = signal(false);

  constructor() {
    void this.load();
  }

  protected identityText(who: Identity): string {
    return who.via === 'loopback'
      ? 'Signed in from this computer (loopback).'
      : `Signed in over the tailnet as ${who.login}.`;
  }

  protected onSignOut(): void {
    this.whenLoaded((contract) => {
      if (this.busy()) return;
      this.busy.set(true);
      this.api
        .post(contract.SIGN_OUT_ROUTE, {}, signOutCopy)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            void this.router.navigateByUrl(contract.SETUP_PAGE_PATH);
          },
          error: (error: unknown) => {
            this.busy.set(false);
            this.fail(error);
          },
        });
    });
  }

  protected onSavePreferences(changed: Partial<Preferences>): void {
    this.whenLoaded((contract) => {
      this.api
        .post(contract.PREFERENCES_ROUTE, changed, contract.preferencesSchema)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (saved) => this.preferences.set(saved),
          error: (error: unknown) => this.fail(error),
        });
    });
  }

  protected onRerunSetup(): void {
    this.whenLoaded((contract) => {
      void this.router.navigateByUrl(contract.SETUP_PAGE_PATH);
    });
  }

  /** Runs an action once the contract is loaded. A failed load has its own alert, so none runs then. */
  private whenLoaded(action: (contract: SettingsContract) => void): void {
    void this.loaded.then(action, () => undefined);
  }

  private async load(): Promise<void> {
    // The contract load is inside the try: a failed load reaches the alert line.
    try {
      const contract = await this.loaded;
      this.contract = contract;
      this.read(contract.IDENTITY_ROUTE, contract.identitySchema, (who) =>
        this.identity.set(who),
      );
      this.read(contract.SETUP_STATUS_ROUTE, contract.setupStatusSchema, (s) =>
        this.status.set(s),
      );
      this.read(VERSION_PATH, versionInfoCopy, (info) =>
        this.version.set(info),
      );
      this.read(
        contract.PREFERENCES_ROUTE,
        contract.preferencesSchema,
        (stored) => this.preferences.set(stored),
      );
    } catch (error: unknown) {
      this.failures.update((list) => [...list, messageOf(error)]);
    }
  }

  private read<T>(
    path: ApiPath,
    schema: ResponseSchema<T>,
    store: (value: T) => void,
  ): void {
    this.api
      .get(path, schema)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: store,
        error: (error: unknown) => this.fail(error),
      });
  }

  /** Shows a tailnet code's explanation, or the message of any other error. */
  private fail(error: unknown): void {
    const codes = this.contract?.SETUP_AUTH_ERROR_CODES;
    const text =
      error instanceof ApiError && codes !== undefined
        ? tailnetExplanation(error.code, codes)
        : undefined;
    if (text !== undefined) {
      this.explanations.update((list) => [...list, text]);
    } else {
      this.failures.update((list) => [...list, messageOf(error)]);
    }
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed.';
}
