/**
 * Loads the setup-auth values the setup page uses: the identity route and its schema, the status
 * and step routes, the preferences route and its schema, the Continue route, the landing path and the
 * error codes. loadTailscaleContract and loadAllowlistContract load the Tailscale status route and
 * schema, and the allowlist route and schema, for the Tailscale and allowlist panels. The load is
 * dynamic, so zod's CommonJS build stays in its own chunk, out of the initial bundle. This is the
 * only file of the feature that refers to the contract at run time.
 *
 * The contract is CommonJS. In the production build its dynamic import has only `default`; under
 * Vitest it has the named exports. The values are read from `default` when there is one.
 */
type SetupAuthModule = typeof import('@bbartolome/scriba-contracts/setup-auth');
type LoadedModule = SetupAuthModule & { default?: SetupAuthModule };

export async function loadSetupAuthContract(): Promise<
  Pick<
    SetupAuthModule,
    | 'IDENTITY_ROUTE'
    | 'identitySchema'
    | 'SETUP_STATUS_ROUTE'
    | 'SETUP_STEP_ROUTE'
    | 'PREFERENCES_ROUTE'
    | 'preferencesSchema'
    | 'SETUP_CONTINUE_ROUTE'
    | 'setupStatusSchema'
    | 'LANDING_PATH'
    | 'SETUP_AUTH_ERROR_CODES'
  >
> {
  const mod: LoadedModule =
    await import('@bbartolome/scriba-contracts/setup-auth');
  return mod.default ?? mod;
}

/**
 * Loads the setup-auth values the settings page uses: the identity, status, sign-out and
 * preferences routes and their schemas, the setup path and the error codes. It reads the module the
 * same way as loadSetupAuthContract.
 */
export async function loadSettingsContract(): Promise<
  Pick<
    SetupAuthModule,
    | 'IDENTITY_ROUTE'
    | 'identitySchema'
    | 'SETUP_STATUS_ROUTE'
    | 'setupStatusSchema'
    | 'SIGN_OUT_ROUTE'
    | 'PREFERENCES_ROUTE'
    | 'preferencesSchema'
    | 'SETUP_PAGE_PATH'
    | 'SETUP_AUTH_ERROR_CODES'
  >
> {
  const mod: LoadedModule =
    await import('@bbartolome/scriba-contracts/setup-auth');
  return mod.default ?? mod;
}

/**
 * Loads the Tailscale status route and its schema, and the error codes, for the Tailscale panel.
 * It reads the module the same way as loadSetupAuthContract.
 */
export async function loadTailscaleContract(): Promise<
  Pick<
    SetupAuthModule,
    | 'TAILSCALE_STATUS_ROUTE'
    | 'tailscaleStatusSchema'
    | 'SETUP_AUTH_ERROR_CODES'
  >
> {
  const mod: LoadedModule =
    await import('@bbartolome/scriba-contracts/setup-auth');
  return mod.default ?? mod;
}

/**
 * Loads the allowlist route and its schema, and the error codes, for the allowlist panel. It reads
 * the module the same way as loadSetupAuthContract.
 */
export async function loadAllowlistContract(): Promise<
  Pick<
    SetupAuthModule,
    'ALLOWLIST_ROUTE' | 'allowlistSchema' | 'SETUP_AUTH_ERROR_CODES'
  >
> {
  const mod: LoadedModule =
    await import('@bbartolome/scriba-contracts/setup-auth');
  return mod.default ?? mod;
}
