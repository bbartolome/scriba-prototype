'use strict';

// CJS consumer for test/graph-runner.exports.test.ts, run with process.execPath.
// It requires the graph-runner subpath by its package name, so Node resolves it through the exports map.

const fs = require('node:fs');
const path = require('node:path');

const mod = require('@bbartolome/scriba-contracts/graph-runner');

// The folders of the package's dist that this require loaded, read from require.cache right after it.
const distDir = fs.realpathSync(
  path.dirname(
    path.dirname(require.resolve('@bbartolome/scriba-contracts/graph-runner')),
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

const examples = {
  story: mod.graphFileSchema.safeParse(mod.GRAPH_RUNNER_EXAMPLES.story).success,
  recipe: mod.graphFileSchema.safeParse(mod.GRAPH_RUNNER_EXAMPLES.recipe)
    .success,
};

process.stdout.write(
  JSON.stringify({
    names: Object.keys(types),
    types,
    loaded,
    examples,
  }),
);
