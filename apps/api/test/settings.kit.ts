import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Module,
  Post,
  type Type,
} from '@nestjs/common';
import {
  PlatformModule,
  SettingsService,
  type SettingsSection,
  type SettingsSectionDef,
} from '../src/modules/platform/platform.module';

const REGISTRATION = 'SETTINGS_TEST_REGISTRATION';

// A test module that registers the given sections. Its controller reads and writes `tools` over HTTP.
export function settingsTestModule(defs: SettingsSectionDef[]): Type<unknown> {
  @Controller('api/settings-test')
  class SettingsTestController {
    constructor(private readonly settings: SettingsService) {}

    @Get('section')
    read(): SettingsSection | null {
      return this.settings.read('tools') ?? null;
    }

    @Post('section')
    @HttpCode(204)
    write(@Body() body: SettingsSection): void {
      this.settings.write('tools', body);
    }
  }

  @Module({
    imports: [PlatformModule],
    controllers: [SettingsTestController],
    providers: [
      {
        provide: REGISTRATION,
        inject: [SettingsService],
        useFactory: (settings: SettingsService): true => {
          for (const def of defs) settings.register(def);
          return true;
        },
      },
    ],
  })
  class SettingsTestModule {}

  return SettingsTestModule;
}

// A fresh temp library, which the caller removes. settingsText, when given, is written as settings.yaml.
export function makeLibrary(settingsText?: string): string {
  const library = mkdtempSync(join(tmpdir(), 'scriba-settings-'));
  if (settingsText !== undefined) {
    mkdirSync(join(library, '.scriba'), { recursive: true });
    writeFileSync(settingsFilePath(library), settingsText);
  }
  return library;
}

export function settingsFilePath(library: string): string {
  return join(library, '.scriba', 'settings.yaml');
}

// The names of the settings.yaml backups in the app-state folder.
export function backupEntries(library: string): string[] {
  return readdirSync(join(library, '.scriba')).filter((name) =>
    name.startsWith('settings.yaml.bak-'),
  );
}
