import {
  loadAllowlistContract,
  loadSettingsContract,
  loadTailscaleContract,
} from './setup-contract';

// The production build's import shape: the dynamic import of the CommonJS contract has only
// `default`. This file holds Y1 alone, because the mock applies to every import of the specifier.
vi.mock('@bbartolome/scriba-contracts/setup-auth', async (importOriginal) => {
  return { default: await importOriginal() };
});

it('Y1 the settings contract load reads its values through default when the module has only a default', async () => {
  const contract = await loadSettingsContract();

  expect(contract.IDENTITY_ROUTE).toBe('/api/setup-auth/identity');
  expect(contract.SETUP_STATUS_ROUTE).toBe('/api/setup-auth/status');
  expect(contract.SIGN_OUT_ROUTE).toBe('/api/setup-auth/sign-out');
  expect(contract.PREFERENCES_ROUTE).toBe('/api/setup-auth/preferences');
  expect(contract.SETUP_PAGE_PATH).toBe('/setup');
  expect(contract.preferencesSchema.parse({ authorName: 'Ada' })).toEqual({
    authorName: 'Ada',
  });

  const tailscale = await loadTailscaleContract();
  expect(tailscale.TAILSCALE_STATUS_ROUTE).toBe(
    '/api/setup-auth/tailscale/status',
  );
  expect(
    tailscale.tailscaleStatusSchema.parse({
      available: false,
      backendState: 'NoState',
    }),
  ).toEqual({ available: false, backendState: 'NoState' });
  expect(tailscale.SETUP_AUTH_ERROR_CODES).toEqual(
    contract.SETUP_AUTH_ERROR_CODES,
  );

  const allowlist = await loadAllowlistContract();
  expect(allowlist.ALLOWLIST_ROUTE).toBe('/api/setup-auth/allowlist');
  expect(
    allowlist.allowlistSchema.parse({
      enabled: true,
      logins: ['ada@example.com'],
    }),
  ).toEqual({
    enabled: true,
    logins: ['ada@example.com'],
  });
  expect(allowlist.SETUP_AUTH_ERROR_CODES).toEqual(
    contract.SETUP_AUTH_ERROR_CODES,
  );
});
