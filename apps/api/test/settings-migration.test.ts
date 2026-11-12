import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { expect, it } from 'vitest';
import { createTestApp } from './create-test-app';
import {
  makeLibrary,
  settingsFilePath,
  settingsTestModule,
} from './settings.kit';

const ORIGINAL = 'schemaVersion: 1\ntools:\n  schemaVersion: 1\n  steps: []\n';
const BACKUP =
  /^settings\.yaml\.bak-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/;

it('a behind test section is backed up, migrated by its steps in order, and /healthz answers after that', async () => {
  const library = makeLibrary(ORIGINAL);
  try {
    const modules = [
      settingsTestModule([
        {
          key: 'tools',
          version: 3,
          defaultValue: null,
          migrations: {
            1: (section) => {
              (section.steps as string[]).push('one');
              return section;
            },
            2: (section) => {
              (section.steps as string[]).push('two');
              return section;
            },
          },
        },
      ]),
    ];
    const app = await createTestApp({ libraryDir: library, modules });
    try {
      const dir = join(library, '.scriba');
      const parsed = parse(readFileSync(settingsFilePath(library), 'utf8'));
      expect(parsed.tools).toEqual({ schemaVersion: 3, steps: ['one', 'two'] });

      const backups = readdirSync(dir).filter((name) => BACKUP.test(name));
      expect(backups).toHaveLength(1);
      expect(readFileSync(join(dir, backups[0]!))).toEqual(
        Buffer.from(ORIGINAL),
      );

      const response = await fetch(app.baseUrl + '/healthz');
      expect(response.status).toBe(200);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});
