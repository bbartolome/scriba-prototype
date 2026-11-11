'use strict';

// NestJS-style CommonJS consumer, run by test/boot.test.ts with process.execPath.
// It requires the package by its own name, so Node resolves it through the exports map.

const PACKAGE = '@bbartolome/scriba-contracts';
const SLUGS = [
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

function tryRequire(specifier) {
  try {
    return { ok: true, keys: Object.keys(require(specifier)).sort() };
  } catch (error) {
    return { ok: false, code: error.code ?? error.message };
  }
}

const loaded = {};
const failed = {};
for (const slug of SLUGS) {
  const result = tryRequire(`${PACKAGE}/${slug}`);
  if (result.ok) {
    loaded[slug] = result.keys;
  } else {
    failed[slug] = result.code;
  }
}

const root = tryRequire(PACKAGE);
const deep = tryRequire(`${PACKAGE}/dist/platform/index.js`);

process.stdout.write(
  JSON.stringify({
    loaded,
    failed,
    rootCode: root.ok ? null : root.code,
    deepCode: deep.ok ? null : deep.code,
  }),
);
