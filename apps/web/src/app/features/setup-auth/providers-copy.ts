import type { AppDefault } from '@bbartolome/scriba-contracts/providers';
import type { ResponseSchema } from '../../shell';

// Hand-written copy of the two providers reads the setup step makes: the list of provider ids and
// the app default. The feature reads the providers contract only through this copy and its types;
// providers-copy.spec.ts (P7) checks the copy against the contract.

/** The providers list route (`PROVIDERS_ROUTE` in routes.ts). */
export const PROVIDERS_PATH = '/api/providers';

/** The app default route (`APP_DEFAULT_ROUTE` in routes.ts). */
export const APP_DEFAULT_PATH = '/api/providers/app-default';

/** The stored providers, as the step reads them: only their ids. */
export type ProviderIds = { providers: { id: string }[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isList(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}

/** Response of GET /api/providers, reduced to the ids of its providers. */
export const providerIdsCopy: ResponseSchema<ProviderIds> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const { providers } = fields;
    if (!isList(providers)) {
      return { success: false, error: 'the providers field is not a list' };
    }
    const ids: { id: string }[] = [];
    for (const entry of providers) {
      const provider: Record<string, unknown> = isRecord(entry) ? entry : {};
      const { id } = provider;
      if (!isNonEmptyString(id)) {
        return { success: false, error: 'a provider has no id' };
      }
      ids.push({ id });
    }
    return { success: true, data: { providers: ids } };
  },
};

/** Response of GET /api/providers/app-default (`appDefaultSchema`). */
export const appDefaultCopy: ResponseSchema<AppDefault> = {
  safeParse(data) {
    const fields: Record<string, unknown> = isRecord(data) ? data : {};
    const { appDefault } = fields;
    if (appDefault === null) {
      return { success: true, data: { appDefault: null } };
    }
    const choice: Record<string, unknown> = isRecord(appDefault)
      ? appDefault
      : {};
    const { providerId, model } = choice;
    if (isNonEmptyString(providerId) && typeof model === 'string') {
      return {
        success: true,
        data: { appDefault: { providerId, model } },
      };
    }
    return { success: false, error: 'the app default does not match' };
  },
};

/**
 * Whether a usable provider exists: the app default is set and names a listed provider. This is the
 * rule the app uses to refuse an agent run without a provider (ProvidersResolver.hasChoice).
 */
export function isUsable(list: ProviderIds, current: AppDefault): boolean {
  const choice = current.appDefault;
  return (
    choice !== null &&
    list.providers.some((provider) => provider.id === choice.providerId)
  );
}
