import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { parse } from 'yaml';
import { expect, it } from 'vitest';
import { createTestApp, type TestApp } from './create-test-app';
import {
  captureStdout,
  getRoute,
  makeSecretsLibrary,
  modeOf,
  postRoute,
  scribaFolder,
  secretsFile,
  SecretsKitModule,
} from './secrets.kit';

const MODULES = [SecretsKitModule];
const KEY = 'stored-key-ABCD1234';
const SORTED_FOLDER = ['secrets.yaml', 'settings.yaml'];

async function matches(
  app: TestApp,
  keyRef: string,
  candidate: string,
): Promise<boolean> {
  const response = await postRoute(app, 'matches', { keyRef, candidate });
  return ((await response.json()) as { matches: boolean }).matches;
}

async function has(app: TestApp, keyRef: string): Promise<boolean> {
  const response = await getRoute(app, 'has', keyRef);
  return ((await response.json()) as { has: boolean }).has;
}

async function hint(app: TestApp, keyRef: string): Promise<string | null> {
  const response = await getRoute(app, 'hint', keyRef);
  return ((await response.json()) as { hint: string | null }).hint;
}

it('a put creates secrets.yaml at mode 0600 in a 0700 .scriba, holding the key under its keyRef', async () => {
  const library = makeSecretsLibrary();
  try {
    const app = await createTestApp({ libraryDir: library, modules: MODULES });
    try {
      const put = await postRoute(app, 'put', {
        keyRef: 'openrouter-1',
        key: KEY,
      });
      expect(put.status).toBe(204);
      expect(modeOf(secretsFile(library))).toBe(0o600);
      expect(modeOf(scribaFolder(library))).toBe(0o700);
      expect(parse(readFileSync(secretsFile(library), 'utf8'))).toEqual({
        schemaVersion: 1,
        keys: { 'openrouter-1': KEY },
      });
      expect(await matches(app, 'openrouter-1', KEY)).toBe(true);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('a loosened secrets file is tightened on restart with a stdout warning, and a loosened directory is tightened to 0700', async () => {
  const library = makeSecretsLibrary();
  try {
    const first = await createTestApp({
      libraryDir: library,
      modules: MODULES,
    });
    expect(
      (await postRoute(first, 'put', { keyRef: 'openrouter-1', key: KEY }))
        .status,
    ).toBe(204);
    await first.close();
    chmodSync(secretsFile(library), 0o644);
    chmodSync(scribaFolder(library), 0o755);

    const stdout = captureStdout();
    try {
      const restarted = await createTestApp({
        libraryDir: library,
        modules: MODULES,
      });
      await restarted.close();
      expect(modeOf(secretsFile(library))).toBe(0o600);
      expect(modeOf(scribaFolder(library))).toBe(0o700);
      const output = stdout.text();
      expect(output).toContain('secrets.yaml');
      expect(output).toContain('0644');
      expect(output).toContain('0600');
      expect(output).not.toContain(KEY);
    } finally {
      stdout.stop();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('a partial temp file left by a crash leaves secrets.yaml byte-identical, is removed on restart, and delete keeps the file whole', async () => {
  const library = makeSecretsLibrary();
  const temp = `${secretsFile(library)}.tmp`;
  try {
    const first = await createTestApp({
      libraryDir: library,
      modules: MODULES,
    });
    expect(
      (await postRoute(first, 'put', { keyRef: 'openrouter-1', key: KEY }))
        .status,
    ).toBe(204);
    await first.close();
    const before = readFileSync(secretsFile(library));

    // The state a crash between the temp write and the rename leaves: a truncated temp file beside the target.
    writeFileSync(temp, 'schemaVersion: 1\nkeys:\n  openrouter-1: stored-k');
    const restarted = await createTestApp({
      libraryDir: library,
      modules: MODULES,
    });
    try {
      expect(readFileSync(secretsFile(library))).toEqual(before);
      expect(await has(restarted, 'openrouter-1')).toBe(true);
      expect(await matches(restarted, 'openrouter-1', KEY)).toBe(true);
      expect(existsSync(temp)).toBe(false);
      expect(readdirSync(scribaFolder(library)).sort()).toEqual(SORTED_FOLDER);

      const deleted = await postRoute(restarted, 'delete', {
        keyRef: 'openrouter-1',
      });
      expect(deleted.status).toBe(204);
      expect(parse(readFileSync(secretsFile(library), 'utf8'))).toEqual({
        schemaVersion: 1,
        keys: {},
      });
      expect(await has(restarted, 'openrouter-1')).toBe(false);
      expect(readdirSync(scribaFolder(library)).sort()).toEqual(SORTED_FOLDER);
    } finally {
      await restarted.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('hint returns the last four characters of a key of five or more characters, and null for an unknown keyRef', async () => {
  const library = makeSecretsLibrary();
  try {
    const app = await createTestApp({ libraryDir: library, modules: MODULES });
    try {
      await postRoute(app, 'put', {
        keyRef: 'openrouter-1',
        key: 'sk-test-abcdefgh1234WXYZ',
      });
      await postRoute(app, 'put', { keyRef: 'five-1', key: 'ABCDE' });
      expect(await hint(app, 'openrouter-1')).toBe('WXYZ');
      expect(await hint(app, 'five-1')).toBe('BCDE');
      expect(await hint(app, 'unknown-ref')).toBeNull();
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('a key of four or fewer characters has no hint, but is still set', async () => {
  const library = makeSecretsLibrary();
  try {
    const app = await createTestApp({ libraryDir: library, modules: MODULES });
    try {
      await postRoute(app, 'put', { keyRef: 'short-4', key: 'ABCD' });
      await postRoute(app, 'put', { keyRef: 'short-1', key: 'Z' });
      for (const [keyRef, key] of [
        ['short-4', 'ABCD'],
        ['short-1', 'Z'],
      ] as const) {
        expect(await has(app, keyRef)).toBe(true);
        const response = await getRoute(app, 'hint', keyRef);
        const body = await response.text();
        expect(JSON.parse(body)).toEqual({ hint: null });
        expect(body).not.toContain(key);
      }
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('a secrets file that does not parse refuses boot with a message that holds no key, and the file is unchanged', async () => {
  const library = makeSecretsLibrary();
  try {
    mkdirSync(scribaFolder(library), { recursive: true });
    writeFileSync(
      secretsFile(library),
      'schemaVersion: 1\nkeys:\n  broken: [sk-MALFORMED-KEY-0001\n',
    );
    const before = readFileSync(secretsFile(library));

    const outcome = await createTestApp({
      libraryDir: library,
      modules: MODULES,
    }).then(
      (app) => {
        void app.close();
        return undefined;
      },
      (error: unknown) => error,
    );

    expect(outcome).toBeInstanceOf(Error);
    const message = (outcome as Error).message;
    expect(message).toMatch(/Cannot read .*secrets\.yaml/);
    expect(message).not.toContain('sk-MALFORMED');
    expect(readFileSync(secretsFile(library))).toEqual(before);
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});
