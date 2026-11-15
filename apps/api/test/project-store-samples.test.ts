import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { parse } from 'yaml';
import type { StartFromSampleRequest } from '@bbartolome/scriba-contracts/project-store';
import { createTestApp } from './create-test-app';
import { changedPaths, errorOf, readJson } from './project-store-projects.kit';
import { snapshotLibrary } from './invariant-sweep';
import {
  buildSamplesFixture,
  getSamples,
  startFromSample,
  TEST_PROJECT_YAML,
  withSamplesApp,
} from './project-store-samples.kit';

it('C1: start from sample copies the test sample under the chosen name, changes only the title line of project.yaml, and copies no excluded folder', async () => {
  const fixture = buildSamplesFixture();
  try {
    await withSamplesApp(fixture, async (app, cookie) => {
      const samplesBefore = snapshotLibrary(fixture.samples);
      const reply = await startFromSample(app, cookie, {
        sampleId: 'test-sample',
        folderName: 'my-copy',
        title: 'My Copy',
      });
      expect(reply.status).toBe(201);
      expect(readJson(reply)).toEqual({
        id: 'my-copy',
        title: 'My Copy',
        genrePack: 'nonfiction',
        active: false,
        status: 'ok',
      });

      const sampleRoot = join(fixture.samples, 'test-sample');
      const root = join(fixture.library, 'my-copy');
      expect(readFileSync(join(root, 'project.yaml'), 'utf8')).toBe(
        TEST_PROJECT_YAML.replace('title: Test Sample', 'title: My Copy'),
      );
      for (const path of ['sources/outline.md', 'drafts/chapter-one.md', '.gitignore']) {
        expect(readFileSync(join(root, path))).toEqual(
          readFileSync(join(sampleRoot, path)),
        );
      }
      for (const absent of [
        '.scriba',
        'logs',
        'snapshots',
        'drafts/.versions',
        'samples.yaml',
      ]) {
        expect(existsSync(join(root, absent))).toBe(false);
      }
      expect(snapshotLibrary(fixture.samples)).toEqual(samplesBefore);
    });
  } finally {
    fixture.remove();
  }
});

it('C2: nothing is copied at startup: after boot the library changes only inside .scriba', async () => {
  const fixture = buildSamplesFixture();
  try {
    const libraryBefore = snapshotLibrary(fixture.library);
    const samplesBefore = snapshotLibrary(fixture.samples);
    const app = await createTestApp({
      libraryDir: fixture.library,
      env: { SCRIBA_EXAMPLES_DIR: fixture.samples },
    });
    try {
      const libraryAfter = snapshotLibrary(fixture.library);
      const outside = changedPaths(libraryBefore, libraryAfter).filter(
        (path) => path !== '.scriba' && !path.startsWith('.scriba/'),
      );
      expect(outside).toEqual([]);
    } finally {
      await app.close();
    }
    expect(snapshotLibrary(fixture.samples)).toEqual(samplesBefore);
  } finally {
    fixture.remove();
  }
});

it('C3: the sample list GET returns the samples.yaml entries and changes nothing', async () => {
  const fixture = buildSamplesFixture();
  try {
    await withSamplesApp(fixture, async (app, cookie) => {
      const libraryBefore = snapshotLibrary(fixture.library);
      const samplesBefore = snapshotLibrary(fixture.samples);
      const reply = await getSamples(app, cookie);
      expect(reply.status).toBe(200);
      expect(readJson(reply)).toEqual(
        parse(readFileSync(join(fixture.samples, 'samples.yaml'), 'utf8')),
      );
      expect(snapshotLibrary(fixture.library)).toEqual(libraryBefore);
      expect(snapshotLibrary(fixture.samples)).toEqual(samplesBefore);
    });
  } finally {
    fixture.remove();
  }
});

it('E1: a refused start writes nothing: an existing folder, an unknown, unlisted, broken or newer sample, a link inside a sample, and a bad folder name', async () => {
  const fixture = buildSamplesFixture();
  try {
    await withSamplesApp(fixture, async (app, cookie) => {
      const first = await startFromSample(app, cookie, {
        sampleId: 'test-sample',
        folderName: 'my-copy',
        title: 'My Copy',
      });
      expect(first.status).toBe(201);

      const refused: Array<{
        body: StartFromSampleRequest;
        status: number;
        code: string;
      }> = [
        {
          body: {
            sampleId: 'test-sample',
            folderName: 'my-copy',
            title: 'Again',
          },
          status: 409,
          code: 'PROJECT_EXISTS',
        },
        {
          body: {
            sampleId: 'missing',
            folderName: 'missing-copy',
            title: 'Missing',
          },
          status: 404,
          code: 'PROJECT_NOT_FOUND',
        },
        {
          body: { sampleId: 'ghost', folderName: 'ghost-copy', title: 'Ghost' },
          status: 404,
          code: 'PROJECT_NOT_FOUND',
        },
        {
          body: {
            sampleId: 'broken',
            folderName: 'broken-copy',
            title: 'Broken',
          },
          status: 422,
          code: 'PROJECT_INVALID',
        },
        {
          body: {
            sampleId: 'newer',
            folderName: 'newer-copy',
            title: 'Newer',
          },
          status: 409,
          code: 'PROJECT_SCHEMA_TOO_NEW',
        },
        {
          body: {
            sampleId: 'linked',
            folderName: 'linked-copy',
            title: 'Linked',
          },
          status: 400,
          code: 'PROJECT_PATH_OUTSIDE',
        },
        {
          body: {
            sampleId: 'test-sample',
            folderName: 'c'.repeat(300),
            title: 'Too long',
          },
          status: 400,
          code: 'PROJECT_PATH_INVALID',
        },
        {
          body: {
            sampleId: 'test-sample',
            folderName: 'Bad_Name',
            title: 'Bad name',
          },
          status: 400,
          code: 'PLATFORM_VALIDATION_FAILED',
        },
      ];
      for (const row of refused) {
        const before = snapshotLibrary(fixture.library);
        const reply = await startFromSample(app, cookie, row.body);
        expect(reply.status).toBe(row.status);
        expect(errorOf(reply).code).toBe(row.code);
        expect(snapshotLibrary(fixture.library)).toEqual(before);
      }
    });
  } finally {
    fixture.remove();
  }
});
