import { existsSync, lstatSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The pack-lint CLI (TRG-07): lints the built-in packs of a packs root with the library entry of the API build.
// Usage: node scripts/lint-packs.mjs [--root <dir>]   (the default root is packages/packs)
// Exit 0: no error (warnings still print). Exit 1: at least one error. Exit 2: usage, a root that is not a folder,
// or a missing API build. One finding per stderr line: file:line:column severity rule: message.

const SCRIPT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API_ROOT = join(SCRIPT_ROOT, 'apps', 'api');
const LIBRARY = join(
  API_ROOT,
  'dist',
  'modules',
  'tool-registry',
  'pack-lint.js',
);
const DEFAULT_ROOT = join(SCRIPT_ROOT, 'packages', 'packs');
const USAGE = 'usage: node scripts/lint-packs.mjs [--root <dir>]';

function parseRoot(argv) {
  if (argv.length === 0) return DEFAULT_ROOT;
  if (argv.length === 2 && argv[0] === '--root') return resolve(argv[1]);
  return null;
}

function isRealDirectory(path) {
  try {
    return lstatSync(path).isDirectory();
  } catch {
    return false;
  }
}

// Lints the packs root and writes one line per finding to stderr. Returns the exit code.
export function main(argv = process.argv.slice(2)) {
  const root = parseRoot(argv);
  if (root === null) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  if (!isRealDirectory(root)) {
    process.stderr.write(`lint packs: not a folder: ${root}\n`);
    return 2;
  }
  if (!existsSync(LIBRARY)) {
    process.stderr.write(
      `lint packs: the API build is missing (${LIBRARY}); run npm run build -w @bbartolome/scriba-api\n`,
    );
    return 2;
  }

  let library;
  try {
    library = createRequire(join(API_ROOT, 'package.json'))(LIBRARY);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    process.stderr.write(`lint packs: cannot load ${LIBRARY}: ${reason}\n`);
    return 2;
  }

  const findings = library.lintPacks(root);
  for (const finding of findings) {
    process.stderr.write(`${library.formatFinding(finding)}\n`);
  }
  return findings.some((finding) => finding.severity === 'error') ? 1 : 0;
}

// Runs only as the entry point; importing the module runs no lint.
if (import.meta.main) {
  process.exitCode = main();
}
