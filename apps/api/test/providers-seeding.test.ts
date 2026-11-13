import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import { PROVIDERS_EXAMPLES } from '@bbartolome/scriba-contracts/providers';
import { createTestApp } from './create-test-app';
import { backupEntries, makeLibrary, settingsFilePath } from './settings.kit';

// Copied from settings-refusal.test.ts (lines 10 and 11).
const ROLLBACK =
  'To roll back, restore a settings.yaml.bak-* backup made before the upgrade, or run the app version that wrote this file.';

type ProvidersDoc = {
  providers: { list: Record<string, unknown>[]; appDefault: unknown };
} & Record<string, unknown>;

it('a fresh library gets the ollama provider and its app default, and a second start changes nothing', async () => {
  const library = makeLibrary();
  try {
    const first = await createTestApp({ libraryDir: library });
    await first.close();
    const text = readFileSync(settingsFilePath(library), 'utf8');
    const doc = parse(text) as ProvidersDoc;
    expect(doc.providers).toEqual(PROVIDERS_EXAMPLES.seededSection);
    const [ollama] = doc.providers.list;
    expect(ollama).toMatchObject({
      id: 'ollama',
      baseURL: 'http://host.docker.internal:11434/v1',
      model: '',
    });
    expect(ollama).not.toHaveProperty('keyRef');
    expect(doc.providers.appDefault).toEqual({
      providerId: 'ollama',
      model: '',
    });
    expect(backupEntries(library)).toEqual([]);

    const second = await createTestApp({ libraryDir: library });
    await second.close();
    expect(readFileSync(settingsFilePath(library), 'utf8')).toBe(text);
    expect(backupEntries(library)).toEqual([]);
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('an existing providers section with an empty list is left as it is at startup', async () => {
  const library = makeLibrary();
  try {
    const first = await createTestApp({ libraryDir: library });
    await first.close();
    const doc = parse(
      readFileSync(settingsFilePath(library), 'utf8'),
    ) as Record<string, unknown>;
    writeFileSync(
      settingsFilePath(library),
      stringify({
        ...doc,
        providers: { schemaVersion: 1, list: [], appDefault: null },
      }),
    );
    const text = readFileSync(settingsFilePath(library), 'utf8');

    const second = await createTestApp({ libraryDir: library });
    await second.close();
    expect(readFileSync(settingsFilePath(library), 'utf8')).toBe(text);
    expect((parse(text) as ProvidersDoc).providers).toEqual({
      schemaVersion: 1,
      list: [],
      appDefault: null,
    });
    expect(backupEntries(library)).toEqual([]);
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('a providers section at a newer schemaVersion is refused at startup and the file is left as it is', async () => {
  const text =
    'schemaVersion: 1\nproviders:\n  schemaVersion: 2\n  list: []\n  appDefault: null\n';
  const library = makeLibrary(text);
  try {
    await expect(createTestApp({ libraryDir: library })).rejects.toThrow(
      `Cannot start: ${settingsFilePath(library)} has section "providers" at schemaVersion 2, but this app supports schemaVersion 1. ${ROLLBACK}`,
    );
    expect(readFileSync(settingsFilePath(library), 'utf8')).toBe(text);
    expect(backupEntries(library)).toEqual([]);
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('a malformed providers section refuses startup, and the file is left as it is', async () => {
  const library = makeLibrary();
  try {
    const first = await createTestApp({ libraryDir: library });
    await first.close();
    const doc = parse(
      readFileSync(settingsFilePath(library), 'utf8'),
    ) as Record<string, unknown>;
    writeFileSync(
      settingsFilePath(library),
      stringify({
        ...doc,
        providers: {
          schemaVersion: 1,
          list: [{ id: 'BAD ID' }],
          appDefault: null,
        },
      }),
    );
    const text = readFileSync(settingsFilePath(library), 'utf8');

    await expect(createTestApp({ libraryDir: library })).rejects.toThrow(
      'section "providers" does not match its schema',
    );
    expect(readFileSync(settingsFilePath(library), 'utf8')).toBe(text);
    expect(backupEntries(library)).toEqual([]);
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});
