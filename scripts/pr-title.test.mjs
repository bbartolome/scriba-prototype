import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = join(
  dirname(fileURLToPath(import.meta.url)),
  'check-pr-title.mjs',
);

function checkTitle(title) {
  return spawnSync(process.execPath, [script], {
    env: { ...process.env, PR_TITLE: title },
    encoding: 'utf8',
  });
}

test('criterion 3: a PR titled "update stuff" fails the title check', () => {
  const result = checkTitle('update stuff');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /update stuff/);
});

test('criterion 3: a PR titled "feat(platform): scaffold" passes the title check', () => {
  const result = checkTitle('feat(platform): scaffold');
  assert.equal(result.status, 0);
});

test('extra: an empty PR title fails the title check', () => {
  assert.equal(checkTitle('').status, 1);
});
