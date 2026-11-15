import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  PROJECT_START_FROM_SAMPLE_ROUTE,
  SAMPLES_ROUTE,
  type StartFromSampleRequest,
} from '@bbartolome/scriba-contracts/project-store';
import { createTestApp, type TestApp } from './create-test-app';
import { send, sessionCookie, type Reply } from './guard-request';
import { LOOPBACK_HOST } from './invariant-sweep';
import { postJson } from './project-store-projects.kit';

// The temp library L, which holds book/project.yaml, and the temp samples folder S, which holds samples.yaml and
// the samples of the fixture (plan section 2).
export interface SamplesFixture {
  library: string;
  samples: string;
  remove: () => void; // removes L and S
}

// The text of the test sample's project.yaml: a comment line, then the three keys. The copy changes only the title.
export const TEST_PROJECT_YAML =
  '# A tiny sample for the tests.\nschemaVersion: 1\ntitle: Test Sample\ngenrePack: nonfiction\n';

const SAMPLES_YAML = [
  '- id: test-sample',
  '  title: Test Sample',
  '  description: A tiny sample with planted excluded folders.',
  '- id: ghost',
  '  title: Ghost',
  '  description: Listed, with no folder.',
  '- id: broken',
  '  title: Broken',
  '  description: Its project.yaml is not YAML.',
  '- id: newer',
  '  title: Newer',
  '  description: Its project.yaml is from a newer schema.',
  '- id: linked',
  '  title: Linked',
  '  description: Holds a symbolic link.',
  '',
].join('\n');

// Builds the library and the samples folder. Each sample is listed in samples.yaml, except where noted.
export function buildSamplesFixture(): SamplesFixture {
  const library = mkdtempSync(join(tmpdir(), 'scriba-samples-library-'));
  const samples = mkdtempSync(join(tmpdir(), 'scriba-samples-folder-'));
  const remove = (): void => {
    rmSync(library, { recursive: true, force: true });
    rmSync(samples, { recursive: true, force: true });
  };
  try {
    const file = (path: string, text: string): void => {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text);
    };
    file(
      join(library, 'book', 'project.yaml'),
      'schemaVersion: 1\ntitle: Book\ngenrePack: nonfiction\n',
    );
    file(join(samples, 'samples.yaml'), SAMPLES_YAML);

    const test = join(samples, 'test-sample');
    file(join(test, 'project.yaml'), TEST_PROJECT_YAML);
    file(join(test, '.gitignore'), '.scriba/\n');
    file(join(test, 'sources', 'outline.md'), '# Outline\n');
    file(join(test, 'drafts', 'chapter-one.md'), '# Chapter one\n');
    file(join(test, '.scriba', 'settings.yaml'), 'schemaVersion: 1\n');
    file(join(test, 'logs', 'run.log'), 'A run.\n');
    file(join(test, 'snapshots', 'snap.md'), 'A snapshot.\n');
    file(
      join(test, 'drafts', '.versions', 'chapter-one.md', '2026-01-01T00-00-00Z.md'),
      'A version.\n',
    );

    // The listed sample with no folder is `ghost`, so it has no file here.
    file(join(samples, 'broken', 'project.yaml'), 'schemaVersion: [1\n');
    file(
      join(samples, 'newer', 'project.yaml'),
      'schemaVersion: 2\ntitle: Newer\ngenrePack: nonfiction\n',
    );

    file(join(samples, 'linked', 'project.yaml'), TEST_PROJECT_YAML);
    symlinkSync(
      join(test, 'sources', 'outline.md'),
      join(samples, 'linked', 'link.md'),
    );
  } catch (error) {
    remove();
    throw error;
  }
  return { library, samples, remove };
}

// Boots the composed app against the fixture library and the fixture samples folder, takes the session cookie,
// and closes the app in every case. The folders are not removed here: the caller calls fixture.remove().
export async function withSamplesApp<T>(
  fixture: SamplesFixture,
  run: (app: TestApp, cookie: string) => Promise<T>,
): Promise<T> {
  const app = await createTestApp({
    libraryDir: fixture.library,
    env: { SCRIBA_EXAMPLES_DIR: fixture.samples },
  });
  try {
    const cookie = await sessionCookie(app, fixture.library);
    return await run(app, cookie);
  } finally {
    await app.close();
  }
}

export function getSamples(app: TestApp, cookie: string): Promise<Reply> {
  return send(app.baseUrl, {
    host: LOOPBACK_HOST,
    path: SAMPLES_ROUTE,
    cookie,
  });
}

// One command: a POST of the start-from-sample request, with the loopback Origin the guard expects.
export function startFromSample(
  app: TestApp,
  cookie: string,
  body: StartFromSampleRequest,
): Promise<Reply> {
  return postJson(app, cookie, PROJECT_START_FROM_SAMPLE_ROUTE, body);
}
