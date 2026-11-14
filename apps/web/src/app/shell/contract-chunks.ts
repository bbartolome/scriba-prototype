/**
 * Loads the setup-auth values the landing reads: the status route and its schema. The load is
 * dynamic, so zod's CommonJS build (about 564 kB) stays in its own chunk, out of the initial bundle.
 * This is the only dynamic contract load in the Shell.
 */
export function loadSetupStatusContract(): Promise<
  Pick<
    typeof import('@bbartolome/scriba-contracts/setup-auth'),
    'SETUP_STATUS_ROUTE' | 'setupStatusSchema'
  >
> {
  return import('@bbartolome/scriba-contracts/setup-auth');
}
