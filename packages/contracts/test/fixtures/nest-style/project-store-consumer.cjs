'use strict';

// CJS consumer for test/project-store.exports.test.ts, run with process.execPath.
// It requires the project-store subpath by its package name, so Node resolves it through the exports map.

const mod = require('@bbartolome/scriba-contracts/project-store');

const types = {};
for (const name of Object.keys(mod).sort()) {
  types[name] = typeof mod[name];
}

const results = {
  validProjectYaml: mod.projectYamlSchema.safeParse({
    schemaVersion: 1,
    title: 'Sample',
    genrePack: 'nonfiction',
  }),
  validEntityBase: mod.entityBaseSchema.safeParse({
    type: 'character',
    links: ['ann'],
  }),
  invalidProjectYaml: mod.projectYamlSchema.safeParse({ title: 'Sample' }),
};

process.stdout.write(
  JSON.stringify({
    names: Object.keys(types),
    types,
    results: Object.fromEntries(
      Object.entries(results).map(([key, result]) => [
        key,
        { success: result.success },
      ]),
    ),
  }),
);
