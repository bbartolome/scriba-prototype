import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  HANDSHAKE_REDIRECT_STATUS,
  HANDSHAKE_REFERRER_POLICY,
  HANDSHAKE_ROUTE,
  IDENTITY_ROUTE,
  LANDING_PATH,
  SETUP_AUTH_ERROR_CODES,
  SETUP_AUTH_ERROR_STATUS,
  SETUP_PAGE_PATH,
  SIGN_OUT_ROUTE,
  handshakeQuerySchema,
  setupAuthSectionSchema,
  type Identity,
} from '@bbartolome/scriba-contracts/setup-auth';
import { ModuleError, SettingsService } from '../platform/platform.module';
import {
  cookieValue,
  expiredSessionCookieHeader,
  isLoopbackHost,
  sessionCookieHeader,
} from './setup-session.cookie';
import { Public } from './public-route.decorator';
import { SetupCookieSigner } from './setup-cookie.signer';
import { SetupTokenStore } from './setup-token.store';

// The invalid-link page. It never echoes the candidate token.
const INVALID_LINK_PAGE = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Scriba</title></head>
<body>
<p>This link is not valid.</p>
<p>To get the current link, run <code>cat ~/Books/.scriba/setup-url</code> on the host.</p>
</body>
</html>
`;

// The parts of the response that the handshake writes. apps/api has no @types/express, so the type is structural.
interface HandshakeResponse {
  status(code: number): unknown;
  setHeader(name: string, value: string): unknown;
  end(body?: string): unknown;
}

// The part of the response that sign-out writes.
interface HeaderResponse {
  setHeader(name: string, value: string): unknown;
}

// The setup session: the handshake that issues the cookie, the identity check and sign-out.
@Controller()
export class SetupSessionController {
  constructor(
    private readonly tokens: SetupTokenStore,
    private readonly signer: SetupCookieSigner,
    private readonly settings: SettingsService,
  ) {}

  // A valid token gets a 303 and, on a loopback Host only, the cookie. Any other token gets the invalid-link page.
  // The handler writes its own response, because @Redirect always redirects and cannot write the 401 page.
  @Get(HANDSHAKE_ROUTE)
  @Public()
  handshake(
    @Query() query: unknown,
    @Headers('host') host: string | undefined,
    @Res() res: HandshakeResponse,
  ): void {
    const parsed = handshakeQuerySchema.safeParse(query);
    const candidate = parsed.success ? parsed.data.token : '';
    if (!this.tokens.matches(candidate)) {
      res.status(SETUP_AUTH_ERROR_STATUS.SETUP_TOKEN_INVALID);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Referrer-Policy', HANDSHAKE_REFERRER_POLICY);
      res.end(INVALID_LINK_PAGE);
      return;
    }
    res.status(HANDSHAKE_REDIRECT_STATUS);
    res.setHeader(
      'Location',
      this.setupComplete() ? LANDING_PATH : SETUP_PAGE_PATH,
    );
    res.setHeader('Referrer-Policy', HANDSHAKE_REFERRER_POLICY);
    if (isLoopbackHost(host)) {
      const value = this.signer.sign(Date.now());
      res.setHeader(
        'Set-Cookie',
        sessionCookieHeader(this.signer.cookieName(), value),
      );
    }
    res.end();
  }

  // Loopback with a cookie that verifies gets {via: 'loopback'}. Anything else gets 401 AUTH_REQUIRED.
  // The check is made here, so this route does not depend on the global guard.
  @Get(IDENTITY_ROUTE)
  @Public()
  identity(
    @Headers('host') host: string | undefined,
    @Headers('cookie') cookie: string | undefined,
  ): Identity {
    const value = cookieValue(cookie, this.signer.cookieName());
    if (!isLoopbackHost(host) || this.signer.verify(value) === undefined) {
      throw new ModuleError(
        SETUP_AUTH_ERROR_CODES.REQUIRED,
        SETUP_AUTH_ERROR_STATUS.AUTH_REQUIRED,
        'Not signed in.',
      );
    }
    return { via: 'loopback' };
  }

  // Expires the cookie in this browser only. The cookie is stateless, so a copy elsewhere stays valid until the token changes.
  @Post(SIGN_OUT_ROUTE)
  @HttpCode(204)
  signOut(@Res({ passthrough: true }) res: HeaderResponse): void {
    res.setHeader(
      'Set-Cookie',
      expiredSessionCookieHeader(this.signer.cookieName()),
    );
  }

  // Setup is complete when the setupAuth section parses and has complete: true. A missing or invalid section is not complete.
  private setupComplete(): boolean {
    const parsed = setupAuthSectionSchema.safeParse(
      this.settings.read('setupAuth'),
    );
    return parsed.success && parsed.data.complete;
  }
}
