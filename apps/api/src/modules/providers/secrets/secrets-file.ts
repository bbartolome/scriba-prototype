import {
  chmodSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { BootError } from '../../platform/platform.module';

export const SECRETS_SCHEMA_VERSION = 1;
const DIR_MODE = 0o700;
const FILE_MODE = 0o600;

export function secretsFilePath(booksDir: string): string {
  return join(booksDir, '.scriba', 'secrets.yaml');
}

function errorReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function chmodOrBoot(path: string, mode: number): void {
  try {
    chmodSync(path, mode);
  } catch (error) {
    throw new BootError(`Cannot write ${path}: ${errorReason(error)}.`);
  }
}

function modeOf(path: string): number {
  try {
    return statSync(path).mode & 0o777;
  } catch (error) {
    throw new BootError(`Cannot read ${path}: ${errorReason(error)}.`);
  }
}

// Four octal digits with a leading zero, for example 0644.
function formatMode(mode: number): string {
  return `0${mode.toString(8).padStart(3, '0')}`;
}

// Creates the folder if missing and sets it to 0700. Silent: the folder is loose on every first start, so a warning would be noise.
export function ensureDirectory(dir: string): void {
  try {
    mkdirSync(dir, { recursive: true });
  } catch (error) {
    throw new BootError(`Cannot write ${dir}: ${errorReason(error)}.`);
  }
  chmodOrBoot(dir, DIR_MODE);
}

// A file whose mode is not exactly the expected mode is set to it, and the change is reported on stdout.
// The report names the path and both modes. It never includes a key.
export function enforceMode(path: string, expected: number): void {
  const before = modeOf(path);
  if (before === expected) return;
  chmodOrBoot(path, expected);
  process.stdout.write(
    `Warning: ${path} had mode ${formatMode(before)}; it is now ${formatMode(expected)}.\n`,
  );
}

// A temp file left by a crash may hold part of a key, so it is removed without a report.
export function removeLeftoverTemp(path: string): void {
  rmSync(`${path}.tmp`, { force: true });
}

// The last four characters of a key of five or more characters. A key of four or fewer has no hint.
export function hintOf(key: string): string | undefined {
  return key.length <= 4 ? undefined : key.slice(-4);
}

// Returns an empty map for a missing file. A file that cannot be read, does not parse, or has the wrong shape is a BootError.
// The parser's text is not included, and the file is left alone.
export function readSecrets(path: string): Map<string, string> {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    if (isMissing(error)) return new Map();
    throw new BootError(`Cannot read ${path}: ${errorReason(error)}.`);
  }
  const invalid = (): BootError =>
    new BootError(`Cannot read ${path}: not a valid secrets file.`);
  let parsed: unknown;
  try {
    parsed = parse(text);
  } catch {
    throw invalid();
  }
  const keys: unknown = isMapping(parsed) ? parsed.keys : undefined;
  if (
    !isMapping(parsed) ||
    parsed.schemaVersion !== SECRETS_SCHEMA_VERSION ||
    !isMapping(keys)
  ) {
    throw invalid();
  }
  const entries = new Map<string, string>();
  for (const [keyRef, key] of Object.entries(keys)) {
    if (typeof key !== 'string' || key === '') throw invalid();
    entries.set(keyRef, key);
  }
  return entries;
}

// Writes the whole file to a temp file at mode 0600, then renames it over the target, so the target is never partial.
// The mode is checked after the rename.
export function writeSecretsAtomic(
  path: string,
  entries: ReadonlyMap<string, string>,
): void {
  const temp = `${path}.tmp`;
  const text = stringify({
    schemaVersion: SECRETS_SCHEMA_VERSION,
    keys: Object.fromEntries(entries),
  });
  try {
    rmSync(temp, { force: true });
    writeFileSync(temp, text, { mode: FILE_MODE });
    chmodSync(temp, FILE_MODE);
    renameSync(temp, path);
  } catch (error) {
    rmSync(temp, { force: true });
    throw new BootError(`Cannot write ${path}: ${errorReason(error)}.`);
  }
  enforceMode(path, FILE_MODE);
}
