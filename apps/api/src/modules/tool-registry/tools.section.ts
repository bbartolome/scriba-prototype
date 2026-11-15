import { TOOLS_SECTION_SCHEMA_VERSION } from '@bbartolome/scriba-contracts/tool-registry';
import type { SettingsSectionDef } from '../platform/platform.module';

// The tools section of settings.yaml, registered with Platform at boot. The default is null: the section stays
// absent until the first override, so a fresh install writes no `tools` key.
export const TOOLS_SECTION_DEF: SettingsSectionDef = {
  key: 'tools',
  version: TOOLS_SECTION_SCHEMA_VERSION,
  defaultValue: null,
  migrations: {},
};
