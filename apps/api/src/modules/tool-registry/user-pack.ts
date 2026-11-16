import { randomUUID } from 'node:crypto';
import {
  mkdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';

// Writes one user tool file atomically: the text goes to a temporary file in the same folder, which is then renamed
// over `<name>.yaml`. The leading dot and the `.tmp` suffix keep the temporary file out of the user pack scan.
export function writeUserTool(dir: string, name: string, source: string): void {
  mkdirSync(dir, { recursive: true });
  const target = join(dir, `${name}.yaml`);
  const temporary = join(dir, `.${name}.${randomUUID()}.tmp`);
  try {
    writeFileSync(temporary, source, { flag: 'wx' });
    renameSync(temporary, target);
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }
}

// Removes one user tool file. The caller names only a file the catalog's scan holds.
export function removeUserTool(dir: string, name: string): void {
  unlinkSync(join(dir, `${name}.yaml`));
}
