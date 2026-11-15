import { Component, input } from '@angular/core';
import type {
  Identity,
  SetupStep,
} from '@bbartolome/scriba-contracts/setup-auth';

/**
 * The body of one wizard step. Access shows the current identity. The other four steps are
 * placeholders for now; each of their own units replaces its own case.
 */
@Component({
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
        <p>Model providers are not set up yet.</p>
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
  readonly step = input.required<SetupStep>();
  readonly who = input.required<Identity>();

  protected identityText(): string {
    const who = this.who();
    return who.via === 'loopback'
      ? 'Signed in from this computer (loopback).'
      : `Signed in over the tailnet as ${who.login}.`;
  }
}
