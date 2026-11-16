import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

// Writes text to a temp file in the target's folder, then renames it over the target. The folders above the
// target are created when they are missing. A failed write leaves no temp file behind.
export function writeFileAtomic(target: string, text: string | Buffer): void {
  mkdirSync(dirname(target), { recursive: true });
  const temp = `${target}.tmp`;
  try {
    writeFileSync(temp, text);
    renameSync(temp, target);
  } catch (error) {
    rmSync(temp, { force: true });
    throw error;
  }
}
