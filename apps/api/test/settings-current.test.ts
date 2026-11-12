import { readFileSync, rmSync, statSync } from 'node:fs';
import { expect, it } from 'vitest';
import { createTestApp } from './create-test-app';
import {
  backupEntries,
  makeLibrary,
  settingsFilePath,
  settingsTestModule,
} from './settings.kit';

const HAND_WRITTEN =
  '# hand-written, keep me\nschemaVersion: 1\ntools:\n  schemaVersion: 1\n  enabled: {}\n';

it('a file already at the current versions is not rewritten and gets no backup', async () => {
  const library = makeLibrary(HAND_WRITTEN);
  const file = settingsFilePath(library);
  try {
    const inode = statSync(file).ino;
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
      expect(readFileSync(file, 'utf8')).toBe(HAND_WRITTEN);
      expect(statSync(file).ino).toBe(inode);
      expect(backupEntries(library)).toEqual([]);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});
