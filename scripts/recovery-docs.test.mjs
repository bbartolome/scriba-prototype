import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');

/** The text from a `## ` heading to the next `## ` heading, or to the end of the file. */
function sectionOf(text, heading) {
  const start = text.indexOf(`\n${heading}\n`);
  if (start === -1) return undefined;
  const next = text.indexOf('\n## ', start + 1);
  return text.slice(start, next === -1 ? undefined : next);
}

test('D1 the README has a Recovery section with the four steps, and the tailscaled statement stays in the security notes', () => {
  const recovery = sectionOf(readme, '## Recovery');
  assert.notEqual(recovery, undefined, 'the README has no ## Recovery section');

  for (const text of [
    'cat ~/Books/.scriba/setup-url',
    'docker compose logs scriba',
    '~/Books/.scriba/setup-token',
    'docker compose restart',
    'new token',
    'cookie',
    '~/Books/.scriba/',
    'settings',
    'secrets',
    'search',
    'Your projects are not touched.',
  ]) {
    assert.ok(recovery.includes(text), `Recovery does not contain: ${text}`);
  }

  const steps = recovery.split('\n').filter((line) => /^\d+\. /.test(line));
  assert.equal(steps.length, 4, 'Recovery does not have four numbered steps');

  const allowlistLine = recovery
    .split('\n')
    .find((line) => /allowlist/i.test(line));
  assert.ok(
    allowlistLine !== undefined && allowlistLine.includes('setup URL'),
    'Recovery has no allowlist step that names the setup URL',
  );

  const security = sectionOf(readme, '## Security notes');
  assert.notEqual(security, undefined, 'the README has no ## Security notes');
  assert.ok(
    security.includes('The app controls tailscaled through the shared socket.'),
    'the tailscaled statement is not in the security notes',
  );
  assert.ok(
    security.includes('accepted for a single owner.'),
    'the single-owner acceptance is not in the security notes',
  );
});
