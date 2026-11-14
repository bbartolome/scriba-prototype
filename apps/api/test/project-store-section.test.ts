import { readFileSync, rmSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parse } from 'yaml';
import { projectsSectionSchema } from '@bbartolome/scriba-contracts/project-store';
import { createTestApp } from './create-test-app';
import { backupEntries, makeLibrary, settingsFilePath } from './settings.kit';

// Copied from settings-refusal.test.ts (lines 10 and 11), as providers-seeding.test.ts copies it.
const ROLLBACK =
  'To roll back, restore a settings.yaml.bak-* backup made before the upgrade, or run the app version that wrote this file.';

it('C3: the default composed app boots with the module and writes the projects default, and a second start changes nothing', async () => {
  const library = makeLibrary();
  try {
    const first = await createTestApp({ libraryDir: library });
    try {
      const health = await fetch(first.baseUrl + '/healthz');
      expect(health.status).toBe(200);
    } finally {
      await first.close();
    }
    const firstText = readFileSync(settingsFilePath(library), 'utf8');
    const doc = parse(firstText) as Record<string, unknown>;
    expect(doc.projects).toEqual({ schemaVersion: 1, active: null });
    expect(projectsSectionSchema.safeParse(doc.projects).success).toBe(true);

    const second = await createTestApp({ libraryDir: library });
    await second.close();
    expect(readFileSync(settingsFilePath(library), 'utf8')).toBe(firstText);
    expect(backupEntries(library)).toEqual([]);
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('E2: a projects section at a newer schemaVersion is refused at startup, and one at version 1 is kept', async () => {
  const newer = makeLibrary(
    'schemaVersion: 1\nprojects:\n  schemaVersion: 2\n  active: book\n',
  );
  try {
    const before = readFileSync(settingsFilePath(newer), 'utf8');
    const outcome = await createTestApp({ libraryDir: newer }).then(
      async (app) => {
        await app.close();
        return undefined;
      },
      (error: unknown) => error,
    );

    expect(outcome).toBeInstanceOf(Error);
    expect((outcome as Error).message).toBe(
      `Cannot start: ${settingsFilePath(newer)} has section "projects" at schemaVersion 2, but this app supports schemaVersion 1. ${ROLLBACK}`,
    );
    expect(readFileSync(settingsFilePath(newer), 'utf8')).toBe(before);
    expect(backupEntries(newer)).toEqual([]);
  } finally {
    rmSync(newer, { recursive: true, force: true });
  }

  const current = makeLibrary(
    'schemaVersion: 1\nprojects:\n  schemaVersion: 1\n  active: book\n',
  );
  try {
    const app = await createTestApp({ libraryDir: current });
    await app.close();
    const doc = parse(
      readFileSync(settingsFilePath(current), 'utf8'),
    ) as Record<string, unknown>;
    expect(doc.projects).toEqual({ schemaVersion: 1, active: 'book' });
  } finally {
    rmSync(current, { recursive: true, force: true });
  }
});
