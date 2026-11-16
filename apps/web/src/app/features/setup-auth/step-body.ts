import { Component, inject, input, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type {
  Identity,
  SetupStep,
} from '@bbartolome/scriba-contracts/setup-auth';
import { FirstProjectStep } from './first-project-step';
import { ProvidersPanel } from '../providers/providers.routes';

/**
 * The body of one wizard step. Access shows the current identity. The providers case embeds the
 * Model providers panel, or a link to `/providers` until that route exists. The first-project case
 * embeds the first-project step and forwards its three events. The preferences case is a placeholder
 * for now; its own unit replaces it.
 */
@Component({
  imports: [FirstProjectStep, ProvidersPanel, RouterLink],
  selector: 'app-step-body',
  template: `
    @switch (step()) {
      @case ('access') {
        <p>{{ identityText() }}</p>
        <p>You're in.</p>
      }
      @case ('tailscale') {
        <p>Tailscale is unavailable.</p>
      }
      @case ('providers') {
        @if (panelAvailable()) {
          <app-providers-panel />
        } @else {
          <p><a routerLink="/providers">Model providers</a></p>
        }
      }
      @case ('preferences') {
        <p>Preferences are not set up yet.</p>
      }
      @case ('firstProject') {
        <app-first-project-step
          (activeChanged)="firstProjectActive.emit($event)"
          (activated)="firstProjectActivated.emit()"
          (failed)="firstProjectFailed.emit($event)"
        />
      }
    }
  `,
})
export class StepBody {
  private readonly router = inject(Router);
  readonly step = input.required<SetupStep>();
  readonly who = input.required<Identity>();
  readonly firstProjectActive = output<boolean>();
  readonly firstProjectActivated = output<void>();
  readonly firstProjectFailed = output<unknown>();

  /** Whether the root route table has the `/providers` route, which MPR-11 adds. */
  protected panelAvailable(): boolean {
    return this.router.config.some((route) => route.path === 'providers');
  }

  protected identityText(): string {
    const who = this.who();
    return who.via === 'loopback'
      ? 'Signed in from this computer (loopback).'
      : `Signed in over the tailnet as ${who.login}.`;
  }
}
