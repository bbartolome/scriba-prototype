'use strict';

// CJS consumer for test/tool-registry.exports.test.ts, run with process.execPath.
// It requires the tool-registry subpath by its package name, so Node resolves it through the exports map.

const fs = require('node:fs');
const path = require('node:path');

const mod = require('@bbartolome/scriba-contracts/tool-registry');

// The folders of the package's dist that this require loaded, read from require.cache right after it.
const distDir = fs.realpathSync(
  path.dirname(
    path.dirname(require.resolve('@bbartolome/scriba-contracts/tool-registry')),
  ),
);
const loaded = [
  ...new Set(
    Object.keys(require.cache)
      .filter((file) => file.startsWith(distDir + path.sep))
      .map((file) => file.slice(distDir.length + 1).split(path.sep)[0]),
  ),
].sort();

const types = {};
for (const name of Object.keys(mod).sort()) {
  types[name] = typeof mod[name];
}

const minimal = {
  schemaVersion: 1,
  name: 'cold_open',
  description: 'Drafts the cold open.',
  inputs: { type: 'object', properties: {} },
  output: 'draft',
  enabled: true,
  prompt: 'Write the cold open.',
};

const results = {
  validSpec: mod.toolSpecSchema.safeParse(minimal),
  badOutput: mod.toolSpecSchema.safeParse({ ...minimal, output: 'summary' }),
  badName: mod.toolSpecSchema.safeParse({ ...minimal, name: 'ColdOpen' }),
  missingPrompt: mod.toolSpecSchema.safeParse(
    Object.fromEntries(
      Object.entries(minimal).filter(([key]) => key !== 'prompt'),
    ),
  ),
};

process.stdout.write(
  JSON.stringify({
    names: Object.keys(types),
    types,
    loaded,
    results: Object.fromEntries(
      Object.entries(results).map(([key, result]) => [
        key,
        { success: result.success },
      ]),
    ),
  }),
);
