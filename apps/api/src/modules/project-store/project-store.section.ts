import { PROJECTS_SECTION_SCHEMA_VERSION } from '@bbartolome/scriba-contracts/project-store';
import type { SettingsSectionDef } from '../platform/platform.module';

// The projects section of settings.yaml, registered with Platform at boot. The default has no active project.
export const PROJECTS_SECTION_DEF: SettingsSectionDef = {
  key: 'projects',
  version: PROJECTS_SECTION_SCHEMA_VERSION,
  defaultValue: {
    schemaVersion: PROJECTS_SECTION_SCHEMA_VERSION,
    active: null,
  },
  migrations: {},
};
