import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// API-runtime leg of PLT-11 criterion 3: every contract subpath resolves from
// apps/api, the API's own resolution context, and the package has no root barrel.
// Needs packages/contracts/dist, which the root build creates first.
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const CONTRACTS = '@bbartolome/scriba-contracts';
const EXPECTED_SUBPATHS = [
  'platform',
  'setup-auth',
  'providers',
  'project-store',
  'tool-registry',
  'agent-loop',
  'graph-runner',
  'compile-export',
  'shell',
  'genre-packs',
];

const contractsPackage = JSON.parse(
  readFileSync(join(root, 'packages', 'contracts', 'package.json'), 'utf8'),
);
const apiRequire = createRequire(join(root, 'apps', 'api', 'package.json'));

test('the exports map has exactly the ten subpaths and no root entry', () => {
  const keys = Object.keys(contractsPackage.exports);
  assert.equal(keys.includes('.'), false, 'there is no root "." export');
  assert.deepEqual(
    keys.slice().sort(),
    EXPECTED_SUBPATHS.map((slug) => `./${slug}`).sort(),
    'the exports map lists the ten contract subpaths',
  );
});

test('each contract subpath requires from apps/api, and the root import is refused', () => {
  for (const slug of EXPECTED_SUBPATHS) {
    assert.doesNotThrow(
      () => apiRequire(`${CONTRACTS}/${slug}`),
      `${CONTRACTS}/${slug} resolves from apps/api`,
    );
  }
  assert.throws(() => apiRequire(CONTRACTS), {
    code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
  });
});
