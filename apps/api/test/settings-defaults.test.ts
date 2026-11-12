import { readFileSync, rmSync } from 'node:fs';
import { parse } from 'yaml';
import { expect, it } from 'vitest';
import { createTestApp } from './create-test-app';
import {
  backupEntries,
  makeLibrary,
  settingsFilePath,
  settingsTestModule,
} from './settings.kit';

it('a missing file is written with non-null defaults, and a null-default section stays absent', async () => {
  const library = makeLibrary();
  try {
    const modules = [
      settingsTestModule([
        {
          key: 'tools',
          version: 1,
          defaultValue: { schemaVersion: 1, enabled: {} },
          migrations: {},
        },
        { key: 'agent', version: 1, defaultValue: null, migrations: {} },
      ]),
    ];
    const app = await createTestApp({ libraryDir: library, modules });
    try {
      const parsed = parse(readFileSync(settingsFilePath(library), 'utf8'));
      expect(parsed).toEqual({
        schemaVersion: 1,
        tools: { schemaVersion: 1, enabled: {} },
      });
      expect(backupEntries(library)).toEqual([]);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});
