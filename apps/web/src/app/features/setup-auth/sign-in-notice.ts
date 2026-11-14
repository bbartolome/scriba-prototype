import { Component } from '@angular/core';

/** Prints the setup link on the computer that runs Scriba, at each start. */
export const SIGN_IN_COMMAND = 'cat ~/Books/.scriba/setup-url';

/** Its output also holds the setup link. */
export const DOCKER_LOGS_COMMAND = 'docker compose logs scriba';

const IDENTITY_MISSING_TEXT =
  'Scriba did not get your Tailscale identity. Sign this device in to Tailscale as a user (a tagged device has no user identity), then open Scriba at its tailnet address again.';

const NOT_ALLOWED_TEXT =
  "This Tailscale login is not on the owner's allowlist. To change the allowlist, use the computer that runs Scriba and its setup link.";

/**
 * The explanation of a tailnet error code, or `undefined` for any other code. `codes` is the
 * contract's SETUP_AUTH_ERROR_CODES, so the codes are compared with the contract's own values.
 */
export function tailnetExplanation(
  code: string,
  codes: {
    readonly TAILNET_IDENTITY_MISSING: string;
    readonly TAILNET_NOT_ALLOWED: string;
  },
): string | undefined {
  if (code === codes.TAILNET_IDENTITY_MISSING) return IDENTITY_MISSING_TEXT;
  if (code === codes.TAILNET_NOT_ALLOWED) return NOT_ALLOWED_TEXT;
  return undefined;
}

/** Shown when the identity read answers 401: how to get in from the computer that runs Scriba. */
@Component({
  selector: 'app-sign-in-notice',
  styles: `
    :host {
      display: block;
    }
  `,
  template: `
    <p>This browser is not signed in to Scriba.</p>
    <p>
      On the computer that runs Scriba, run
      <code>{{ signInCommand }}</code> and open the link it prints.
    </p>
    <p>
      The same link is in the output of
      <code>{{ dockerLogsCommand }}</code
      >.
    </p>
  `,
})
export class SignInNotice {
  protected readonly signInCommand = SIGN_IN_COMMAND;
  protected readonly dockerLogsCommand = DOCKER_LOGS_COMMAND;
}
