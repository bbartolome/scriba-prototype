import { SETUP_AUTH_SECTION_SCHEMA_VERSION } from '@bbartolome/scriba-contracts/setup-auth';
import type { SettingsSectionDef } from '../platform/platform.module';

// The setupAuth section of settings.yaml, registered with Platform at boot. The default is the first-run state.
export const SETUP_AUTH_SECTION_DEF: SettingsSectionDef = {
  key: 'setupAuth',
  version: SETUP_AUTH_SECTION_SCHEMA_VERSION,
  defaultValue: {
    schemaVersion: SETUP_AUTH_SECTION_SCHEMA_VERSION,
    steps: {
      access: 'pending',
      tailscale: 'pending',
      providers: 'pending',
      preferences: 'pending',
      firstProject: 'pending',
    },
    complete: false,
    preferences: {},
    allowlist: { enabled: false, logins: [] },
  },
  migrations: {},
};
