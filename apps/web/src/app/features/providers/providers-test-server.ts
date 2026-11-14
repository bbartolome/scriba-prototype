import type {
  ModelChoice,
  Preset,
  ProviderConfig,
  ProviderRead,
} from '@bbartolome/scriba-contracts/providers';
import type { FakeApiClient } from '../../shell/testing/test-doubles';

// Helpers for the providers specs. Types only from the contract, and no vitest import: the app
// compiles this file, and its tsconfig has no test types. Every body these helpers register is
// returned, so a test can keep the bodies it served and check the panel against them.

/**
 * The read view of a provider. Without a key, `keySet` is false. A key of four characters or fewer
 * is set with no hint; a longer key gets its last four characters as the hint (MPR-06's rule).
 */
export function readView(config: ProviderConfig, key?: string): ProviderRead {
  if (key === undefined || key === '') {
    return { ...config, keySet: false };
  }
  if (key.length <= 4) {
    return { ...config, keySet: true };
  }
  return { ...config, keySet: true, keyHint: key.slice(-4) };
}

/** Registers the model list of one provider, and returns the body it registered. */
export function serveModels(
  api: FakeApiClient,
  id: string,
  models: string[],
): { models: string[] } {
  const body = { models };
  api.respond('GET', `/api/providers/${encodeURIComponent(id)}/models`, body);
  return body;
}

/** What the server holds: the reads' bodies, and each provider's model list (empty when not given). */
export interface ProvidersServerState {
  providers: ProviderRead[];
  presets: Preset[];
  appDefault: ModelChoice | null;
  models?: Record<string, string[]>;
}

/** Registers the three reads and the model list of every provider, and returns the bodies it registered. */
export function installProvidersServer(
  api: FakeApiClient,
  state: ProvidersServerState,
): unknown[] {
  const list = { providers: state.providers };
  const presets = { presets: state.presets };
  const appDefault = { appDefault: state.appDefault };
  api.respond('GET', '/api/providers', list);
  api.respond('GET', '/api/providers/presets', presets);
  api.respond('GET', '/api/providers/app-default', appDefault);
  const served: unknown[] = [list, presets, appDefault];
  for (const provider of state.providers) {
    served.push(
      serveModels(api, provider.id, state.models?.[provider.id] ?? []),
    );
  }
  return served;
}
