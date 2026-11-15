import { Component, computed, input } from '@angular/core';
import type { ComposeVersionStatus } from '@bbartolome/scriba-contracts/setup-auth';

/** The update one-liner (units/SAU-10-compose-version-status.md line 21; scripts/entrypoint.sh line 20). */
export const COMPOSE_UPDATE_COMMAND =
  'docker run --rm -e SETUP=true bbartolome/scriba | bash';

/**
 * Shows a compose version that does not match, or is not reported, with the one-liner that updates
 * the install. It renders nothing for `ok`. It has no `role="alert"`.
 */
@Component({
  selector: 'app-compose-warning',
  template: `
    @if (warning(); as text) {
      <p>
        {{ text }} To update, run the one-liner in the install folder:
        <code>{{ command }}</code>
      </p>
    }
  `,
})
export class ComposeWarning {
  readonly compose = input.required<ComposeVersionStatus>();

  protected readonly command = COMPOSE_UPDATE_COMMAND;

  protected readonly warning = computed<string | undefined>(() => {
    const status = this.compose();
    if (status.state === 'mismatch') {
      return `This install runs compose version ${status.actual ?? 'unknown'}, but this Scriba needs compose version ${status.expected}.`;
    }
    if (status.state === 'unknown') {
      return 'This install does not report its compose version, so it cannot be checked.';
    }
    return undefined;
  });
}
