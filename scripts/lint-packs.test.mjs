import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// TRG-07 C2: `npm run lint:packs` fails on a deliberately broken fixture pack, and the library entry returns the same
// diagnostics as the CLI. The CLI is run through node; the npm script is checked as text, because running it would
// rebuild two workspaces.
const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const CLI = join(here, 'lint-packs.mjs');
const API = join(repo, 'apps', 'api');
const LIBRARY = join(API, 'dist', 'modules', 'tool-registry', 'pack-lint.js');
const LINT_FIXTURES = join(API, 'test', 'fixtures', 'lint');
const BROKEN = join(LINT_FIXTURES, 'broken-pack');
const CLEAN = join(LINT_FIXTURES, 'clean-pack');

// The library is built by the API build. A test run on a fresh checkout builds it first.
before(() => {
  if (!existsSync(LIBRARY)) {
    execFileSync('npm', ['run', 'build', '-w', '@bbartolome/scriba-api'], {
      cwd: repo,
      stdio: 'inherit',
    });
  }
});

function runCli(root) {
  return spawnSync(process.execPath, [CLI, '--root', root], {
    encoding: 'utf8',
  });
}

function library() {
  return createRequire(join(API, 'package.json'))(LIBRARY);
}

test('C2: the CLI exits 1 on the broken pack, one stderr line per finding, the same as the library entry', () => {
  const result = runCli(BROKEN);
  assert.equal(result.status, 1);
  const lines = result.stderr.split('\n').filter((line) => line !== '');
  const { lintPacks, formatFinding } = library();
  assert.deepEqual(lines, lintPacks(BROKEN).map(formatFinding));
  assert.ok(
    lines.some((line) => / error duplicate-name: /.test(line)),
    'the broken pack gives a duplicate-name error',
  );
  assert.ok(
    lines.some((line) => / error entity-field: /.test(line)),
    'the broken pack gives an entity-field error',
  );
});

test('C2: the CLI exits 0 with empty stderr on the clean pack', () => {
  const result = runCli(CLEAN);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
});

test('C2: the npm script runs this CLI, and lint runs the npm script', () => {
  const pkg = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
  assert.ok(
    pkg.scripts['lint:packs'].endsWith('node scripts/lint-packs.mjs'),
    'lint:packs runs the CLI',
  );
  assert.ok(
    pkg.scripts.lint.includes('npm run lint:packs'),
    'lint runs lint:packs',
  );
});
