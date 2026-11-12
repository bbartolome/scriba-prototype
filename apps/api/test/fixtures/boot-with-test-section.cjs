'use strict';
// Test-only child for settings-refusal case (b). It calls the built bootstrap() with two test sections.
// It mirrors the BootError branch of src/main.ts: write the message to stderr and exit 1. Other errors are rethrown.
const { join, resolve } = require('node:path');
const { Module } = require('@nestjs/common');

const DIST = resolve(__dirname, '..', '..', 'dist');
const { bootstrap } = require(join(DIST, 'bootstrap.js'));
const { BootError } = require(
  join(DIST, 'modules/platform/boot/boot-error.js'),
);
const { PlatformModule, SettingsService } = require(
  join(DIST, 'modules/platform/platform.module.js'),
);

class SettingsTestModule {}

Module({
  imports: [PlatformModule],
  providers: [
    {
      provide: 'SETTINGS_TEST_REGISTRATION',
      inject: [SettingsService],
      useFactory: (settings) => {
        settings.register({
          key: 'projects',
          version: 2,
          defaultValue: null,
          migrations: {
            1: (section) => ({ ...section, migrated: true }),
          },
        });
        settings.register({
          key: 'tools',
          version: 1,
          defaultValue: null,
          migrations: {},
        });
        return true;
      },
    },
  ],
})(SettingsTestModule);

async function main() {
  let app;
  try {
    app = await bootstrap({ modules: [SettingsTestModule] });
  } catch (error) {
    if (error instanceof BootError) {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
  await app.close();
  process.exit(0);
}

void main();
