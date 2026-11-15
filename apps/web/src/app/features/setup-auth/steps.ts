import type { SetupStep } from '@bbartolome/scriba-contracts/setup-auth';

/** The wizard's five steps, in wizard order. The keys are the contract's SETUP_STEP_KEYS. */
export const WIZARD_STEPS: readonly {
  readonly key: SetupStep;
  readonly title: string;
}[] = [
  { key: 'access', title: 'Access' },
  { key: 'tailscale', title: 'Tailscale' },
  { key: 'providers', title: 'Model providers' },
  { key: 'preferences', title: 'Preferences' },
  { key: 'firstProject', title: 'First project' },
];
