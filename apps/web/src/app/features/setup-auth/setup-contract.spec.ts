import { loadSetupAuthContract } from './setup-contract';

const seen = vi.hoisted(() => ({ factoryRuns: 0 }));

// The production build's import shape: the dynamic import of the CommonJS contract gives a
// namespace with only `default`. This file holds X5 alone, because the mock applies to every
// import of the specifier in the file.
vi.mock('@bbartolome/scriba-contracts/setup-auth', async (importOriginal) => {
  seen.factoryRuns += 1;
  return { default: await importOriginal() };
});

describe('X5 the setup-auth contract load with only a default export', () => {
  it('reads the values through the default export', async () => {
    const contract = await loadSetupAuthContract();

    expect(seen.factoryRuns).toBe(1);
    expect(contract.IDENTITY_ROUTE).toBe('/api/setup-auth/identity');
    expect(contract.SETUP_CONTINUE_ROUTE).toBe('/api/setup-auth/continue');
    expect(contract.LANDING_PATH).toBe('/');
    expect(contract.SETUP_AUTH_ERROR_CODES.TAILNET_NOT_ALLOWED).toBe(
      'AUTH_TAILNET_NOT_ALLOWED',
    );
    expect(contract.identitySchema.parse({ via: 'loopback' })).toEqual({
      via: 'loopback',
    });
    expect(typeof contract.setupStatusSchema.parse).toBe('function');
  });
});
