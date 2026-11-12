import type { SETTINGS_SECTION_KEYS } from '@bbartolome/scriba-contracts/platform';

// One of the fixed section keys in the contract. A new section needs a new key there.
export type SettingsSectionKey = (typeof SETTINGS_SECTION_KEYS)[number];

// One section of settings.yaml. Its schemaVersion is its first key when written.
export type SettingsSection = { schemaVersion: number } & Record<
  string,
  unknown
>;

// Moves a section up by one schemaVersion. The runner stamps the new version after the step returns.
export type SettingsMigrationStep = (
  section: SettingsSection,
) => SettingsSection;

export interface SettingsSectionDef {
  key: SettingsSectionKey;
  version: number; // current schemaVersion, an integer of at least 1
  defaultValue: SettingsSection | null; // null = leave the section absent
  migrations: Record<number, SettingsMigrationStep>; // key = fromVersion
}
