import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import {
  compareText,
  discoverSamples,
  isRealDirectory,
  requireContracts,
} from './lib.mjs';
import * as m1 from './m1.mjs';

// The examples check (PLT-20, M1 layer). PLT-21 and PLT-22 append their layer modules to LAYERS.
// Usage: node scripts/examples-check/index.mjs [--root <dir>]
// Exit 0: passed. Exit 1: issues, one stderr line each. Exit 2: usage, or the contracts cannot load.
export const LAYERS = [m1];

const SCRIPT_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const USAGE = 'usage: node scripts/examples-check/index.mjs [--root <dir>]';

export function main(argv = process.argv.slice(2)) {
  const root = parseRoot(argv);
  if (root === null) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  if (!isRealDirectory(root)) {
    process.stderr.write(`examples check: not a folder: ${root}\n`);
    return 2;
  }

  let contracts;
  try {
    contracts = requireContracts(SCRIPT_ROOT);
  } catch {
    process.stderr.write(
      'examples check: cannot load @bbartolome/scriba-contracts/project-store; run npm run build -w @bbartolome/scriba-contracts\n',
    );
    return 2;
  }

  const examplesDir = join(root, 'examples');
  const ctx = {
    root,
    examplesDir,
    samples: discoverSamples(examplesDir),
    contracts,
    yaml: { parse },
    stats: { projectYaml: 0, entityFiles: 0, testFiles: 0 },
  };
  const issues = LAYERS.flatMap((layer) => layer.check(ctx)).sort(
    (a, b) => compareText(a.file, b.file) || compareText(a.message, b.message),
  );

  if (issues.length === 0) {
    const { samples, stats } = ctx;
    process.stdout.write(
      `examples check passed: ${samples.length} sample(s), ${stats.projectYaml} project.yaml, ${stats.entityFiles} entity file(s), ${stats.testFiles} test file(s) scanned\n`,
    );
    return 0;
  }
  for (const issue of issues) {
    process.stderr.write(`${issue.file}: ${issue.message}\n`);
  }
  process.stderr.write(`examples check failed: ${issues.length} issue(s)\n`);
  return 1;
}

function parseRoot(argv) {
  if (argv.length === 0) return SCRIPT_ROOT;
  if (argv.length === 2 && argv[0] === '--root') return resolve(argv[1]);
  return null;
}

// Runs only as the entry point; importing the module (PLT-21, PLT-22) runs no check.
if (import.meta.main) {
  process.exitCode = main();
}
