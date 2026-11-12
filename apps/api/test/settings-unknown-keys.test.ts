import { readFileSync, rmSync } from 'node:fs';
import { parse } from 'yaml';
import { expect, it } from 'vitest';
import { createTestApp } from './create-test-app';
import {
  makeLibrary,
  settingsFilePath,
  settingsTestModule,
} from './settings.kit';

const ORIGINAL =
  'schemaVersion: 1\nnotes:\n  keep:\n    - 1\n    - 2\n  text: hi\ntools:\n  schemaVersion: 1\n  steps: []\n';

it('an unknown top-level key survives a migration unchanged', async () => {
  const library = makeLibrary(ORIGINAL);
  try {
    const modules = [
      settingsTestModule([
        {
          key: 'tools',
          version: 2,
          defaultValue: null,
          migrations: {
            1: (section) => {
              (section.steps as string[]).push('one');
              return section;
            },
          },
        },
      ]),
    ];
    const app = await createTestApp({ libraryDir: library, modules });
    try {
      const parsed = parse(readFileSync(settingsFilePath(library), 'utf8'));
      expect(parsed.notes).toEqual({ keep: [1, 2], text: 'hi' });
      expect(parsed.tools.schemaVersion).toBe(2);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});
