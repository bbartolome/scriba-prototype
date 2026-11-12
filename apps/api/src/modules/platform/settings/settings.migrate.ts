import {
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_SECTION_KEYS,
} from '@bbartolome/scriba-contracts/platform';
import { BootError } from '../boot/boot-error';
import type {
  SettingsSection,
  SettingsSectionDef,
  SettingsSectionKey,
} from './settings.types';

const ROLLBACK =
  'To roll back, restore a settings.yaml.bak-* backup made before the upgrade, or run the app version that wrote this file.';

export interface MigrationResult {
  next: Record<string, unknown>;
  changed: boolean;
}

const isMapping = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isVersion = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1;

const cannotRead = (path: string, reason: string): BootError =>
  new BootError(`Cannot read ${path}: ${reason}.`);

// Copies the section with schemaVersion as its first key. Other keys keep their order.
export function withSchemaVersion(
  section: Record<string, unknown>,
  schemaVersion: number,
): SettingsSection {
  const next: SettingsSection = { schemaVersion };
  for (const [key, value] of Object.entries(section)) {
    if (key !== 'schemaVersion') next[key] = value;
  }
  return next;
}

function migrateSection(
  found: Record<string, unknown>,
  def: SettingsSectionDef,
  from: number,
): SettingsSection {
  let current = withSchemaVersion(found, from);
  for (let version = from; version < def.version; version++) {
    current = withSchemaVersion(def.migrations[version](current), version + 1);
  }
  return current;
}

// Pure, with no file I/O. Pass 1 makes every check and plans the changes, and throws before any change.
// Pass 2 builds the new document. Sections are handled in SETTINGS_SECTION_KEYS order.
export function migrateSettings(
  file: Record<string, unknown>,
  defs: SettingsSectionDef[],
  path: string,
): MigrationResult {
  const top = file.schemaVersion;
  if (!isVersion(top)) {
    throw cannotRead(
      path,
      'top-level schemaVersion must be an integer of at least 1',
    );
  }
  if (top > SETTINGS_SCHEMA_VERSION) {
    throw new BootError(
      `Cannot start: ${path} has top-level schemaVersion ${top}, but this app supports schemaVersion ${SETTINGS_SCHEMA_VERSION}. ${ROLLBACK}`,
    );
  }

  const behind = new Map<
    SettingsSectionKey,
    { def: SettingsSectionDef; found: Record<string, unknown>; from: number }
  >();
  const defaults = new Map<SettingsSectionKey, SettingsSection>();
  for (const key of SETTINGS_SECTION_KEYS) {
    const def = defs.find((candidate) => candidate.key === key);
    if (def === undefined) continue;
    const found = file[key];
    if (found === undefined) {
      if (def.defaultValue !== null) {
        defaults.set(
          key,
          withSchemaVersion(structuredClone(def.defaultValue), def.version),
        );
      }
      continue;
    }
    if (!isMapping(found)) {
      throw cannotRead(path, `section "${key}" must be a mapping`);
    }
    const version = found.schemaVersion;
    if (!isVersion(version)) {
      throw cannotRead(
        path,
        `section "${key}" needs an integer schemaVersion of at least 1`,
      );
    }
    if (version > def.version) {
      throw new BootError(
        `Cannot start: ${path} has section "${key}" at schemaVersion ${version}, but this app supports schemaVersion ${def.version}. ${ROLLBACK}`,
      );
    }
    if (version < def.version) {
      for (let from = version; from < def.version; from++) {
        if (def.migrations[from] === undefined) {
          throw new Error(
            `No migration step for section "${key}" from schemaVersion ${from} to ${from + 1}.`,
          );
        }
      }
      behind.set(key, { def, found, from: version });
    }
  }

  const migrated = new Map<string, SettingsSection>();
  for (const [key, { def, found, from }] of behind) {
    migrated.set(key, migrateSection(found, def, from));
  }

  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(file)) {
    if (key === 'schemaVersion') next[key] = SETTINGS_SCHEMA_VERSION;
    else next[key] = migrated.has(key) ? migrated.get(key) : value;
  }
  for (const [key, value] of defaults) next[key] = value;

  return {
    next,
    changed: migrated.size > 0 || defaults.size > 0,
  };
}
