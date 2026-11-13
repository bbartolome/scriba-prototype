import { readFileSync, rmSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parse } from 'yaml';
import { PROVIDERS_EXAMPLES } from '@bbartolome/scriba-contracts/providers';
import { COMPOSED_MODULES } from '../src/app.module';
import { createTestApp } from './create-test-app';
import { sessionCookie } from './guard-request';
import { ProvidersKitModule, postCreate } from './providers.kit';
import { makeLibrary, settingsFilePath } from './settings.kit';

type ProvidersDoc = { providers: { list: { id: string }[] } };

it('two providers created from one preset get distinct ids that stay the same after a restart', async () => {
  const library = makeLibrary();
  try {
    const app = await createTestApp({
      libraryDir: library,
      modules: [...COMPOSED_MODULES, ProvidersKitModule],
    });
    try {
      const cookie = await sessionCookie(app, library);
      const first = await postCreate(
        app,
        cookie,
        PROVIDERS_EXAMPLES.createFromPreset,
      );
      const second = await postCreate(
        app,
        cookie,
        PROVIDERS_EXAMPLES.createFromPreset,
      );
      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(JSON.parse(first.body).id).toBe('openrouter');
      expect(JSON.parse(second.body).id).toBe('openrouter-2');
    } finally {
      await app.close();
    }

    const text = readFileSync(settingsFilePath(library), 'utf8');
    const doc = parse(text) as ProvidersDoc;
    expect(doc.providers.list.map((provider) => provider.id)).toEqual([
      'ollama',
      'openrouter',
      'openrouter-2',
    ]);

    const restarted = await createTestApp({ libraryDir: library });
    await restarted.close();
    expect(readFileSync(settingsFilePath(library), 'utf8')).toBe(text);
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});

it('a label gives its ASCII slug as the id, and a taken slug takes the next free suffix', async () => {
  const library = makeLibrary();
  // 'Café 2' is the precomposed e-acute (U+00E9), which fixes the input bytes.
  const labels = ['My Local Llama', 'My Local Llama', 'Café 2', '日本語 1'];
  try {
    const app = await createTestApp({
      libraryDir: library,
      modules: [...COMPOSED_MODULES, ProvidersKitModule],
    });
    try {
      const cookie = await sessionCookie(app, library);
      const ids: string[] = [];
      for (const label of labels) {
        const reply = await postCreate(app, cookie, {
          ...PROVIDERS_EXAMPLES.createFromLabel,
          label,
        });
        expect(reply.status).toBe(201);
        ids.push(JSON.parse(reply.body).id as string);
      }
      expect(ids).toEqual(['my-local-llama', 'my-local-llama-2', 'caf-2', '1']);
    } finally {
      await app.close();
    }
  } finally {
    rmSync(library, { recursive: true, force: true });
  }
});
