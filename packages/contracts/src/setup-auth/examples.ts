// Example payloads for the contract tests and for fake API clients. Data only.
const EXAMPLE_STEPS = {
  access: 'done',
  tailscale: 'pending',
  providers: 'skipped',
  preferences: 'pending',
  firstProject: 'pending',
} as const;

export const SETUP_AUTH_EXAMPLES = {
  identityLoopback: { via: 'loopback' },
  identityTailnet: { via: 'tailnet', login: 'ada@example.com' },
  tailscaleNeedsLogin: {
    available: true,
    backendState: 'NeedsLogin',
    authURL: 'https://login.tailscale.com/a/0123456789abcdef',
  },
  tailscaleRunning: {
    available: true,
    backendState: 'Running',
    dnsName: 'scriba.tail1234.ts.net',
    tailnetURL: 'https://scriba.tail1234.ts.net',
    magicDNSEnabled: true,
    httpsCertsEnabled: true,
    ownerLogin: 'ada@example.com',
  },
  tailscaleUnavailable: { available: false, backendState: 'NoState' },
  setupStatus: {
    steps: EXAMPLE_STEPS,
    complete: false,
    compose: { state: 'unknown', expected: 3 },
  },
  composeOk: { state: 'ok', expected: 3, actual: 3 },
  composeMismatch: { state: 'mismatch', expected: 3, actual: 2 },
  composeUnknown: { state: 'unknown', expected: 3 },
  stepUpdateDone: { state: 'done' },
  stepUpdateSkipped: { state: 'skipped' },
  preferences: { authorName: 'Ada', defaultGenrePack: 'mystery' },
  preferencesEmpty: {},
  allowlist: { enabled: true, logins: ['ada@example.com'] },
  setupAuthSection: {
    schemaVersion: 1,
    steps: EXAMPLE_STEPS,
    complete: false,
    preferences: { authorName: 'Ada' },
    allowlist: { enabled: false, logins: [] },
  },
  handshakeQuery: { token: 'setup-token-example' },
} as const;
