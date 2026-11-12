import { copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import {
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_SECTION_KEYS,
} from '@bbartolome/scriba-contracts/platform';
import { BootError } from '../boot/boot-error';
import { SCRIBA_ENV, type ScribaEnv } from '../boot/env';
import {
  backupFileName,
  errorReason,
  readSettingsFile,
  settingsFilePath,
  writeSettingsAtomic,
} from './settings.file';
import { migrateSettings, withSchemaVersion } from './settings.migrate';
import type {
  SettingsSection,
  SettingsSectionDef,
  SettingsSectionKey,
} from './settings.types';

// Owns settings.yaml. Modules register their section before boot, then read and write it here.
@Injectable()
export class SettingsService implements OnApplicationBootstrap {
  private readonly defs = new Map<SettingsSectionKey, SettingsSectionDef>();

  constructor(@Inject(SCRIBA_ENV) private readonly env: ScribaEnv) {}

  register(def: SettingsSectionDef): void {
    if (!(SETTINGS_SECTION_KEYS as readonly string[]).includes(def.key)) {
      throw new Error(`Unknown settings section "${def.key}".`);
    }
    if (this.defs.has(def.key)) {
      throw new Error(`Settings section "${def.key}" is already registered.`);
    }
    if (!Number.isInteger(def.version) || def.version < 1) {
      throw new Error(
        `Settings section "${def.key}" needs an integer version of at least 1.`,
      );
    }
    if (
      def.defaultValue !== null &&
      def.defaultValue.schemaVersion !== def.version
    ) {
      throw new Error(
        `The default for settings section "${def.key}" must have schemaVersion ${def.version}.`,
      );
    }
    this.defs.set(def.key, def);
  }

  read(key: SettingsSectionKey): SettingsSection | undefined {
    const doc = readSettingsFile(this.path());
    const section = doc?.[key];
    return section === undefined ? undefined : (section as SettingsSection);
  }

  write(key: SettingsSectionKey, section: SettingsSection): void {
    const def = this.defs.get(key);
    if (def === undefined) {
      throw new Error(`Settings section "${key}" is not registered.`);
    }
    if (section.schemaVersion !== def.version) {
      throw new Error(
        `Settings section "${key}" must be written at schemaVersion ${def.version}, not ${section.schemaVersion}.`,
      );
    }
    const path = this.path();
    const doc: Record<string, unknown> = readSettingsFile(path) ?? {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
    };
    doc[key] = withSchemaVersion(section, def.version);
    writeSettingsAtomic(path, doc);
  }

  onApplicationBootstrap(): void {
    const path = this.path();
    const file = readSettingsFile(path);
    const { next, changed } = migrateSettings(
      file ?? { schemaVersion: SETTINGS_SCHEMA_VERSION },
      [...this.defs.values()],
      path,
    );
    if (file !== undefined) {
      if (!changed) return;
      this.backup(path);
    }
    writeSettingsAtomic(path, next);
  }

  private backup(path: string): void {
    const target = join(dirname(path), backupFileName(new Date()));
    try {
      copyFileSync(path, target);
    } catch (error) {
      throw new BootError(`Cannot write ${target}: ${errorReason(error)}.`);
    }
  }

  private path(): string {
    return settingsFilePath(this.env.SCRIBA_BOOKS_DIR);
  }
}
