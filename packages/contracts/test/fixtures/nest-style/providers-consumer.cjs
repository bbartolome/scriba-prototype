'use strict';

// CJS consumer for test/providers.exports.test.ts, run with process.execPath.
// It requires the providers subpath by its package name, so Node resolves it through the exports map.

const mod = require('@bbartolome/scriba-contracts/providers');

const types = {};
for (const name of Object.keys(mod).sort()) {
  types[name] = typeof mod[name];
}

process.stdout.write(JSON.stringify({ names: Object.keys(types), types }));
