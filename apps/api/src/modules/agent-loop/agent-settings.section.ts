import {
  AGENT_SECTION_SCHEMA_VERSION,
  AGENT_SETTINGS_DEFAULTS,
} from '@bbartolome/scriba-contracts/agent-loop';
import type { SettingsSectionDef } from '../platform/platform.module';

// The agent section of settings.yaml, registered with Platform at boot. The default has research off and step cap 12.
export const AGENT_SETTINGS_SECTION_DEF: SettingsSectionDef = {
  key: 'agent',
  version: AGENT_SECTION_SCHEMA_VERSION,
  defaultValue: AGENT_SETTINGS_DEFAULTS,
  migrations: {},
};
