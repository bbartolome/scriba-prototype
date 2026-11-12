import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { BootError } from '../boot/boot-error';

export function settingsFilePath(booksDir: string): string {
  return join(booksDir, '.scriba', 'settings.yaml');
}

export function errorReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// A backup name is UTC, with the colons and dot of the ISO timestamp replaced by dashes.
export function backupFileName(now: Date): string {
  return `settings.yaml.bak-${now.toISOString().replace(/[:.]/g, '-')}`;
}

// Returns undefined for a missing file. Any other problem is a BootError, and the file is left alone.
export function readSettingsFile(
  path: string,
): Record<string, unknown> | undefined {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }
    throw new BootError(`Cannot read ${path}: ${errorReason(error)}.`);
  }
  let parsed: unknown;
  try {
    parsed = parse(text);
  } catch (error) {
    throw new BootError(`Cannot read ${path}: ${errorReason(error)}.`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new BootError(
      `Cannot read ${path}: the top level must be a mapping.`,
    );
  }
  return parsed as Record<string, unknown>;
}

// Writes the whole document to a temp file in the same folder, then renames it over the target.
export function writeSettingsAtomic(
  path: string,
  doc: Record<string, unknown>,
): void {
  const temp = `${path}.tmp`;
  try {
    writeFileSync(temp, stringify(doc));
    renameSync(temp, path);
  } catch (error) {
    rmSync(temp, { force: true });
    throw new BootError(`Cannot write ${path}: ${errorReason(error)}.`);
  }
}
