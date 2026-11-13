import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import {
  SCRIBA_ENV,
  type ScribaEnv,
  setKnownSecrets,
} from '../../platform/platform.module';
import {
  enforceMode,
  ensureDirectory,
  hintOf,
  readSecrets,
  removeLeftoverTemp,
  secretsFilePath,
  writeSecretsAtomic,
} from './secrets-file';

const FILE_MODE = 0o600;

// The reusable secrets helper. Keys live only in ${SCRIBA_BOOKS_DIR}/.scriba/secrets.yaml, keyed by an opaque keyRef.
// Every call reads the file; there is no cache. get returns the key to in-process callers only.
@Injectable()
export class SecretsStore implements OnApplicationBootstrap {
  private readonly path: string;

  constructor(@Inject(SCRIBA_ENV) env: ScribaEnv) {
    this.path = secretsFilePath(env.SCRIBA_BOOKS_DIR);
  }

  // Creates the folder and file if missing, tightens their modes, and loads the key values into the redaction registry.
  // A damaged file refuses boot and is left alone.
  onApplicationBootstrap(): void {
    ensureDirectory(dirname(this.path));
    removeLeftoverTemp(this.path);
    if (existsSync(this.path)) {
      enforceMode(this.path, FILE_MODE);
    } else {
      writeSecretsAtomic(this.path, new Map());
    }
    setKnownSecrets([...readSecrets(this.path).values()]);
  }

  // Stores the key under keyRef, overwriting an existing entry. Both must be non-empty. The error never echoes a value.
  put(keyRef: string, key: string): void {
    if (keyRef === '') throw new Error('A keyRef must not be empty.');
    if (key === '') throw new Error('A key must not be empty.');
    const entries = readSecrets(this.path);
    entries.set(keyRef, key);
    this.save(entries);
  }

  // The key under keyRef, or undefined when there is no entry. For in-process use only.
  get(keyRef: string): string | undefined {
    return readSecrets(this.path).get(keyRef);
  }

  // Removes the entry under keyRef. An absent keyRef changes nothing and writes nothing.
  delete(keyRef: string): void {
    const entries = readSecrets(this.path);
    if (entries.delete(keyRef)) this.save(entries);
  }

  has(keyRef: string): boolean {
    return readSecrets(this.path).has(keyRef);
  }

  // The last four characters of the stored key. Undefined when there is no entry, or the key has four or fewer characters.
  hint(keyRef: string): string | undefined {
    const key = readSecrets(this.path).get(keyRef);
    return key === undefined ? undefined : hintOf(key);
  }

  // Writes the file first. The redaction registry changes only after a successful write.
  private save(entries: Map<string, string>): void {
    writeSecretsAtomic(this.path, entries);
    setKnownSecrets([...entries.values()]);
  }
}
