import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { ACTIVE_PROJECT_ROUTE } from '@bbartolome/scriba-contracts/project-store';
import { getManuscript, manuscriptOf } from '../compile-export-manuscript.kit';
import { postJson } from '../project-store-projects.kit';
import {
  startFromSample,
  withSamplesApp,
  type SamplesFixture,
} from '../project-store-samples.kit';

// The fiction sample under test: a checked-in byte copy of the shipped fiction sample (plan D2, G2).
const FIXTURE = resolve(__dirname, '..', 'fixtures', 'fiction-sample');

// A temp library with book/project.yaml, and a temp samples folder holding the copy of the fixture.
function buildFictionSamples(): SamplesFixture {
  const library = mkdtempSync(join(tmpdir(), 'scriba-fiction-library-'));
  const samples = mkdtempSync(join(tmpdir(), 'scriba-fiction-samples-'));
  const remove = (): void => {
    rmSync(library, { recursive: true, force: true });
    rmSync(samples, { recursive: true, force: true });
  };
  try {
    mkdirSync(join(library, 'book'), { recursive: true });
    writeFileSync(
      join(library, 'book', 'project.yaml'),
      'schemaVersion: 1\ntitle: Book\ngenrePack: nonfiction\n',
    );
    cpSync(FIXTURE, samples, { recursive: true });
  } catch (error) {
    remove();
    throw error;
  }
  return { library, samples, remove };
}

it('start from sample orders the fiction sample by its order edges: arrival, the-storm, ledger', async () => {
  const fixture = buildFictionSamples();
  try {
    await withSamplesApp(fixture, async (app, cookie) => {
      const started = await startFromSample(app, cookie, {
        sampleId: 'fiction',
        folderName: 'lamp-keepers',
        title: 'The Lamp Keepers',
      });
      expect(started.status).toBe(201);

      const activated = await postJson(app, cookie, ACTIVE_PROJECT_ROUTE, {
        projectId: 'lamp-keepers',
      });
      expect(activated.status).toBe(200);

      const view = manuscriptOf(await getManuscript(app, cookie));
      expect(view.entries.map((entry) => entry.path)).toEqual([
        'drafts/arrival.md',
        'drafts/the-storm.md',
        'drafts/ledger.md',
      ]);
      for (const entry of view.entries) {
        expect(entry.graphOrdered).toBe(true);
      }
      expect(view.warnings).toEqual([]);
    });
  } finally {
    fixture.remove();
  }
}, 60000);
