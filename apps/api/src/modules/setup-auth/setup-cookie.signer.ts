import { createHmac, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { SCRIBA_ENV, type ScribaEnv } from '../platform/platform.module';
import { SetupTokenStore } from './setup-token.store';

// Label for the key derived from the setup token. A new token gives a new key, so old cookies fail.
const KEY_LABEL = 'scriba-setup-cookie';
const TIMESTAMP_PATTERN = /^\d+$/;

// The stateless setup cookie value is `<issuedAtMs>.<signature>`. The signature is an HMAC of the issue time.
@Injectable()
export class SetupCookieSigner {
  constructor(
    @Inject(SCRIBA_ENV) private readonly env: ScribaEnv,
    private readonly tokens: SetupTokenStore,
  ) {}

  cookieName(): string {
    return `scriba_setup_${this.env.SCRIBA_PORT}`;
  }

  sign(issuedAtMs: number): string {
    const issued = String(issuedAtMs);
    return `${issued}.${this.signature(issued)}`;
  }

  // Returns the issue time when the value is well formed and its signature matches. No age limit is applied here.
  verify(value: string | undefined): { issuedAt: number } | undefined {
    if (value === undefined) return undefined;
    const parts = value.split('.');
    if (parts.length !== 2) return undefined;
    const [issued, given] = parts;
    if (!TIMESTAMP_PATTERN.test(issued)) return undefined;
    const expected = Buffer.from(this.signature(issued));
    const actual = Buffer.from(given);
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      return undefined;
    }
    return { issuedAt: Number(issued) };
  }

  private signature(message: string): string {
    const key = createHmac('sha256', this.tokens.secret())
      .update(KEY_LABEL)
      .digest();
    return createHmac('sha256', key).update(message).digest('base64url');
  }
}
