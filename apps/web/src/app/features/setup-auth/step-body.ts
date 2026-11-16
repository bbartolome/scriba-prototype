import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type {
  Identity,
  SetupStep,
} from '@bbartolome/scriba-contracts/setup-auth';
import { ProvidersPanel } from '../providers/providers.routes';

/**
 * The body of one wizard step. Access shows the current identity. The providers case embeds the
 * Model providers panel, or a link to `/providers` until that route exists. The other three steps
 * are placeholders for now; each of their own units replaces its own case.
 */
@Component({
  imports: [ProvidersPanel, RouterLink],
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
        <p>The first project is not set up yet.</p>
      }
    }
  `,
})
export class StepBody {
  private readonly router = inject(Router);
  readonly step = input.required<SetupStep>();
  readonly who = input.required<Identity>();

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
