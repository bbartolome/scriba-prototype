import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { TailscaleStatus } from '@bbartolome/scriba-contracts/setup-auth';
import { API_CLIENT, ApiError } from '../../shell';
import { loadTailscaleContract } from './setup-contract';
import { tailnetExplanation } from './sign-in-notice';

type TailscaleContract = Awaited<ReturnType<typeof loadTailscaleContract>>;

/** The Tailscale admin console, linked from the two prerequisite hints. */
const ADMIN_CONSOLE_URL = 'https://login.tailscale.com/admin';

/**
 * The poll interval, in ms, while the document is visible. It is above the server's 2000 ms cache
 * of the socket read, so each poll reads the socket.
 */
export const TAILSCALE_POLL_MS = 5000;

/**
 * The Tailscale status: the state, the login link, the tailnet URL and the two prerequisite hints.
 * It is shown in the wizard's Tailscale step and in the settings page. While the document is
 * visible it reads the status route at once and then every TAILSCALE_POLL_MS; while it is hidden
 * it does not read. It sends no read after it is destroyed. Tailscale stays optional, so the panel
 * adds no button; the wizard's own Skip is the skip.
 */
@Component({
  selector: 'app-tailscale-panel',
  styles: `
    :host {
      display: block;
      overflow-wrap: anywhere;
    }
  `,
  template: `
    @if (status(); as s) {
      @if (!s.available) {
        <p>Tailscale is unavailable.</p>
      } @else {
        @switch (s.backendState) {
          @case ('NeedsLogin') {
            @if (s.authURL; as authURL) {
              <p>Tailscale is waiting for login.</p>
              <p>
                <a [href]="authURL" target="_blank" rel="noopener"
                  >Log in to Tailscale</a
                >
              </p>
            } @else {
              <p>Tailscale is logged out.</p>
            }
          }
          @case ('Running') {
            <p>Tailscale is running.</p>
            @if (s.tailnetURL; as tailnetURL) {
              <p>
                <a [href]="tailnetURL" target="_blank" rel="noopener"
                  >Open Scriba over the tailnet</a
                >
              </p>
            }
          }
          @default {
            <p>Tailscale state: {{ s.backendState }}.</p>
          }
        }
        @if (s.magicDNSEnabled === false) {
          <p>MagicDNS is off. Turn it on in the Tailscale admin console.</p>
          <p>
            <a [href]="adminConsoleURL" target="_blank" rel="noopener"
              >Tailscale admin console</a
            >
          </p>
        }
        @if (s.httpsCertsEnabled === false) {
          <p>
            HTTPS certificates are off for this tailnet. Turn them on in the
            Tailscale admin console.
          </p>
          <p>
            <a [href]="adminConsoleURL" target="_blank" rel="noopener"
              >Tailscale admin console</a
            >
          </p>
        }
      }
    }
    @if (explanation(); as text) {
      <p>{{ text }}</p>
    }
    @if (failure(); as message) {
      <p role="alert">{{ message }}</p>
    }
  `,
})
export class TailscalePanel {
  private readonly api = inject(API_CLIENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loaded = loadTailscaleContract();
  private contract: TailscaleContract | undefined;
  private destroyed = false;
  private timer: ReturnType<typeof setInterval> | undefined;

  protected readonly adminConsoleURL = ADMIN_CONSOLE_URL;
  protected readonly status = signal<TailscaleStatus | undefined>(undefined);
  protected readonly explanation = signal<string | undefined>(undefined);
  protected readonly failure = signal<string | undefined>(undefined);

  constructor() {
    this.destroyRef.onDestroy(() => this.dispose());
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    void this.load();
  }

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.resume();
    } else {
      this.pause();
    }
  };

  private async load(): Promise<void> {
    let contract: TailscaleContract;
    try {
      contract = await this.loaded;
    } catch (error: unknown) {
      if (!this.destroyed) this.fail(error);
      return;
    }
    if (this.destroyed) return;
    this.contract = contract;
    if (document.visibilityState === 'visible') {
      this.resume();
    }
  }

  /** Reads now, and then every TAILSCALE_POLL_MS, until the document is hidden or the panel is gone. */
  private resume(): void {
    const contract = this.contract;
    if (contract === undefined || this.destroyed) return;
    this.pause();
    this.read(contract);
    this.timer = setInterval(() => this.read(contract), TAILSCALE_POLL_MS);
  }

  private pause(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private dispose(): void {
    this.destroyed = true;
    this.pause();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private read(contract: TailscaleContract): void {
    if (this.destroyed) return;
    this.api
      .get(contract.TAILSCALE_STATUS_ROUTE, contract.tailscaleStatusSchema)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => this.status.set(value),
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
      this.explanation.set(text);
    } else {
      this.failure.set(messageOf(error));
    }
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed.';
}
