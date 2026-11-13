import { PROVIDERS_SECTION_SCHEMA_VERSION } from '@bbartolome/scriba-contracts/providers';
import type { SettingsSectionDef } from '../platform/platform.module';

// The providers section of settings.yaml, registered with Platform at boot. The default is null: the section
// stays absent until the seeder writes it, so the seeder can tell "absent" from "empty list".
export const PROVIDERS_SECTION_DEF: SettingsSectionDef = {
  key: 'providers',
  version: PROVIDERS_SECTION_SCHEMA_VERSION,
  defaultValue: null,
  migrations: {},
};
