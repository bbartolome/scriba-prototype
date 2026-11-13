import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { HANDSHAKE_ROUTE } from '@bbartolome/scriba-contracts/setup-auth';
import {
  BootError,
  SCRIBA_ENV,
  type ScribaEnv,
} from '../platform/platform.module';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const DIR_MODE = 0o700;
const FILE_MODE = 0o600;

function errorReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

function chmodOrBoot(path: string, mode: number): void {
  try {
    chmodSync(path, mode);
  } catch (error) {
    throw new BootError(`Cannot write ${path}: ${errorReason(error)}.`);
  }
}

// Returns the persisted token, creating it only when the file does not exist.
function loadOrCreateToken(path: string): string {
  if (!existsSync(path)) {
    const token = randomBytes(32).toString('base64url');
    try {
      writeFileSync(path, `${token}\n`, { mode: FILE_MODE });
    } catch (error) {
      throw new BootError(`Cannot write ${path}: ${errorReason(error)}.`);
    }
    return token;
  }
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    throw new BootError(`Cannot read ${path}: ${errorReason(error)}.`);
  }
  const token = text.trim();
  if (!TOKEN_PATTERN.test(token)) {
    throw new BootError(
      `Cannot read ${path}: not a 256-bit base64url setup token; delete the file and restart to create a new one.`,
    );
  }
  return token;
}

// The handshake URL. Only the origin of the base is used, so a base path is dropped.
function setupUrl(base: string, token: string): string {
  const url = new URL(HANDSHAKE_ROUTE, base);
  url.searchParams.set('token', token);
  return url.toString();
}

// Writes the URL to a temp file with mode 0600, then renames it over the target, so the target is never partial.
function writeSetupUrl(path: string, url: string): void {
  const temp = `${path}.tmp`;
  try {
    rmSync(temp, { force: true });
    writeFileSync(temp, `${url}\n`, { mode: FILE_MODE });
    chmodSync(temp, FILE_MODE);
    renameSync(temp, path);
  } catch (error) {
    rmSync(temp, { force: true });
    throw new BootError(`Cannot write ${path}: ${errorReason(error)}.`);
  }
}

// Owns the setup token and setup-url in ${SCRIBA_BOOKS_DIR}/.scriba. Loads or creates the token at boot,
// rewrites setup-url on every start, and prints the setup URL once per start.
@Injectable()
export class SetupTokenStore implements OnApplicationBootstrap {
  private readonly logger = new Logger('SetupAuth');
  private token: string | undefined;

  constructor(@Inject(SCRIBA_ENV) private readonly env: ScribaEnv) {}

  onApplicationBootstrap(): void {
    const dir = join(this.env.SCRIBA_BOOKS_DIR, '.scriba');
    const tokenPath = join(dir, 'setup-token');
    chmodOrBoot(dir, DIR_MODE);
    const token = loadOrCreateToken(tokenPath);
    chmodOrBoot(tokenPath, FILE_MODE);
    this.token = token;
    const url = setupUrl(this.env.SCRIBA_SETUP_URL_BASE, token);
    writeSetupUrl(join(dir, 'setup-url'), url);
    process.stdout.write(`Setup URL: ${url}\n`);
  }

  // Compares SHA-256 digests in constant time, so the comparison does not leak the token's length.
  // A rejection is logged without the candidate and without the token.
  matches(candidate: string): boolean {
    const stored = this.token;
    const ok =
      stored !== undefined &&
      timingSafeEqual(digest(candidate), digest(stored));
    if (!ok) this.logger.warn('Setup token rejected.');
    return ok;
  }

  // The token as the key material for SetupCookieSigner. Only available after boot.
  secret(): string {
    if (this.token === undefined) {
      throw new Error('The setup token is not loaded yet.');
    }
    return this.token;
  }
}
