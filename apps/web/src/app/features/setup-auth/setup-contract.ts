/**
 * Loads the setup-auth values the setup page uses: the identity route and its schema, the Continue
 * route, the landing path and the error codes. The load is dynamic, so zod's CommonJS build stays
 * in its own chunk, out of the initial bundle. This is the only file of the feature that refers to
 * the contract at run time.
 */
export function loadSetupAuthContract(): Promise<
  Pick<
    typeof import('@bbartolome/scriba-contracts/setup-auth'),
    | 'IDENTITY_ROUTE'
    | 'identitySchema'
    | 'SETUP_CONTINUE_ROUTE'
    | 'setupStatusSchema'
    | 'LANDING_PATH'
    | 'SETUP_AUTH_ERROR_CODES'
  >
> {
  return import('@bbartolome/scriba-contracts/setup-auth');
}
