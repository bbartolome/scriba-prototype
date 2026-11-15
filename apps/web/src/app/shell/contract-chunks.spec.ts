import { loadSetupStatusContract } from './contract-chunks';

type Contract = typeof import('@bbartolome/scriba-contracts/setup-auth');
const CONTRACT = '@bbartolome/scriba-contracts/setup-auth';
const STATUS = {
  steps: {
    access: 'done',
    tailscale: 'pending',
    providers: 'pending',
    preferences: 'pending',
    firstProject: 'pending',
  },
  complete: false,
  compose: { state: 'unknown', expected: 3 },
};

describe('SHL-21 the Shell setup-status contract loader', () => {
  afterEach(() => {
    vi.doUnmock(CONTRACT);
  });

  it('returns SETUP_STATUS_ROUTE and setupStatusSchema with named exports and with only a default export', async () => {
    // Named exports and no usable default (the shape under ng test).
    vi.doMock(CONTRACT, async (importOriginal) => {
      const actual = await importOriginal<Contract>();
      return {
        default: undefined,
        SETUP_STATUS_ROUTE: actual.SETUP_STATUS_ROUTE,
        setupStatusSchema: actual.setupStatusSchema,
      };
    });
    const named = await loadSetupStatusContract();
    expect(named.SETUP_STATUS_ROUTE).toBe('/api/setup-auth/status');
    expect(named.setupStatusSchema.parse(STATUS)).toEqual(STATUS);

    // Only default: the production build's shape, mocked as X5 mocks it.
    vi.doMock(CONTRACT, async (importOriginal) => ({
      default: await importOriginal(),
    }));
    const defaultOnly = await loadSetupStatusContract();
    expect(defaultOnly.SETUP_STATUS_ROUTE).toBe('/api/setup-auth/status');
    expect(defaultOnly.setupStatusSchema.parse(STATUS)).toEqual(STATUS);
  });
});
