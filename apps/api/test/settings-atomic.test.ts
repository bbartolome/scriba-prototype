import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { expect, it } from 'vitest';
import { createTestApp } from './create-test-app';
import {
  makeLibrary,
  settingsFilePath,
  settingsTestModule,
} from './settings.kit';

it('a section write replaces the file by rename and round-trips through section read', async () => {
  const library = makeLibrary();
  const file = settingsFilePath(library);
  try {
    const modules = [
      settingsTestModule([
        { key: 'tools', version: 1, defaultValue: null, migrations: {} },
      ]),
    ];
    const app = await createTestApp({ libraryDir: library, modules });
    try {
      const inode = statSync(file).ino;
      const body = { schemaVersion: 1, enabled: { search: false } };

      const write = await fetch(app.baseUrl + '/api/settings-test/section', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(write.status).toBe(204);
      expect(statSync(file).ino).not.toBe(inode);
      expect(readdirSync(join(library, '.scriba'))).toEqual(['settings.yaml']);
      expect(parse(readFileSync(file, 'utf8')).tools).toEqual(body);

      const read = await fetch(app.baseUrl + '/api/settings-test/section');
      expect(await read.json()).toEqual(body);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});
