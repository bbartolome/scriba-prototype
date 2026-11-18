import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');

/** A copy of sectionOf in recovery-docs.test.mjs: the text from a `## ` heading to the next `## ` heading. */
function sectionOf(text, heading) {
  const start = text.indexOf(`\n${heading}\n`);
  if (start === -1) return undefined;
  const next = text.indexOf('\n## ', start + 1);
  return text.slice(start, next === -1 ? undefined : next);
}

/** Every file under a folder, as paths relative to the repository root. */
function filesUnder(folder) {
  return readdirSync(join(ROOT, folder)).flatMap((name) => {
    const path = join(folder, name);
    return statSync(join(ROOT, path)).isDirectory() ? filesUnder(path) : [path];
  });
}

test('criterion 6: the README paragraph that names SCRIBA_DEV_AUTH says it is local only and names NODE_ENV=production', () => {
  const gettingStarted = sectionOf(readme, '## Getting started');
  assert.notEqual(
    gettingStarted,
    undefined,
    'the README has no ## Getting started section',
  );
  const paragraphs = gettingStarted
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.includes('SCRIBA_DEV_AUTH'));
  assert.equal(
    paragraphs.length >= 1,
    true,
    'no paragraph of Getting started names SCRIBA_DEV_AUTH',
  );
  assert.ok(
    paragraphs.some(
      (paragraph) =>
        /local[- ]only/i.test(paragraph) &&
        paragraph.includes('NODE_ENV=production'),
    ),
    'the SCRIBA_DEV_AUTH paragraph does not say it is local only and name NODE_ENV=production',
  );
});

test('E4: no file that makes the image or the stack names SCRIBA_DEV_AUTH', () => {
  const files = [
    'Dockerfile',
    ...filesUnder('deploy'),
    'scripts/entrypoint.sh',
    'scripts/build-image.sh',
  ];
  for (const file of files) {
    const text = readFileSync(join(ROOT, file), 'utf8');
    assert.equal(
      text.includes('SCRIBA_DEV_AUTH'),
      false,
      `${file} names SCRIBA_DEV_AUTH`,
    );
  }
});
