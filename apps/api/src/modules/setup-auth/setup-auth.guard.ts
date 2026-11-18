import {
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HEALTHZ_ROUTE } from '@bbartolome/scriba-contracts/platform';
import {
  SETUP_AUTH_ERROR_CODES,
  SETUP_AUTH_ERROR_STATUS,
  type Identity,
} from '@bbartolome/scriba-contracts/setup-auth';
import { ModuleError } from '../platform/platform.module';
import { PUBLIC_ROUTE_KEY } from './public-route.decorator';
import { SetupCookieSigner } from './setup-cookie.signer';
import {
  REQUEST_POLICY,
  requestPath,
  type HostEntry,
  type RequestPolicy,
} from './request-policy';
import { SetupStatusService } from './setup-status.service';
import { cookieValue } from './setup-session.cookie';

// The parts of the request that the guard reads and the identity it attaches.
interface GuardRequest {
  method: string;
  originalUrl: string;
  headers: {
    host?: string;
    origin?: string;
    cookie?: string;
    'tailscale-user-login'?: string;
  };
  socket: { remoteAddress?: string };
  identity?: Identity;
}

// Methods that never change state. Every other method is a mutation.
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// The peers that Tailscale Serve proxies from. Only these may supply the login header.
const SERVE_PEERS = ['127.0.0.1', '::1'];

// Shown to a tailnet caller with no trusted identity. A tagged device has no user identity from Serve.
const TAILNET_IDENTITY_MESSAGE =
  'Sign this device in to Tailscale as a user (a tagged device has no user identity).';

// Shown to a tailnet login that is not on the owner's allowlist.
const NOT_ALLOWED_MESSAGE =
  "This Tailscale login is not on the owner's allowlist.";

// The global default-deny guard (APP_GUARD). A route is public only with @Public() or on /healthz.
// On the tailnet Host the identity is the login header from a Serve peer, and a cookie is not read.
// On the tailnet Host, when the owner allowlist is on, a login not in it is refused. Loopback never reads the list.
// On every other admitted Host a valid setup cookie is the credential. Every mutation needs the Origin of its own Host.
// With SCRIBA_DEV_AUTH=1 (SAU-22, local runs only) an admitted non-tailnet Host skips the cookie and the Origin check.
@Injectable()
export class SetupAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly signer: SetupCookieSigner,
    @Inject(REQUEST_POLICY) private readonly policy: RequestPolicy,
    private readonly status: SetupStatusService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<GuardRequest>();
    const path = requestPath(req.originalUrl);
    // /healthz answers GET without any read of the Host policy, as before.
    if (path === HEALTHZ_ROUTE && SAFE_METHODS.includes(req.method)) {
      return true;
    }
    const isPublic =
      path === HEALTHZ_ROUTE ||
      this.reflector.getAllAndOverride<boolean | undefined>(PUBLIC_ROUTE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true;
    const entry = await this.policy.admit(req.headers.host);
    const tailnet = entry?.tailnet === true;
    // Dev mode (SAU-22): only on an admitted Host that is not the tailnet Host (SAU-18 D17).
    const devMode = this.policy.devAuth && entry?.tailnet === false;
    const identity: Identity | undefined = tailnet
      ? this.tailnetIdentity(req)
      : devMode
        ? { via: 'loopback' } // the cookie is not read
        : this.cookieIdentity(req);
    if (identity !== undefined) req.identity = identity;
    if (identity === undefined) {
      if (tailnet) {
        throw new ModuleError(
          SETUP_AUTH_ERROR_CODES.TAILNET_IDENTITY_MISSING,
          SETUP_AUTH_ERROR_STATUS.AUTH_TAILNET_IDENTITY_MISSING,
          TAILNET_IDENTITY_MESSAGE,
        );
      }
      if (!isPublic) {
        throw new ModuleError(
          SETUP_AUTH_ERROR_CODES.REQUIRED,
          SETUP_AUTH_ERROR_STATUS.AUTH_REQUIRED,
          'Sign in to continue.',
        );
      }
    }
    if (tailnet && identity !== undefined) this.checkAllowlist(identity);
    if (!devMode && !SAFE_METHODS.includes(req.method)) {
      this.checkOrigin(req, entry);
    }
    return true;
  }

  // When the allowlist is on, a tailnet login that is not in it is refused. Loopback has no login, so it is never listed.
  private checkAllowlist(identity: Identity): void {
    const list = this.status.allowlist();
    if (!list.enabled) return;
    const login = identity.via === 'tailnet' ? identity.login : undefined;
    if (login === undefined || !list.logins.includes(login)) {
      throw new ModuleError(
        SETUP_AUTH_ERROR_CODES.TAILNET_NOT_ALLOWED,
        SETUP_AUTH_ERROR_STATUS.AUTH_TAILNET_NOT_ALLOWED,
        NOT_ALLOWED_MESSAGE,
      );
    }
  }

  // The login header is trusted only on the tailnet Host, from a Serve peer. A cookie is not a credential there.
  private tailnetIdentity(req: GuardRequest): Identity | undefined {
    const login = req.headers['tailscale-user-login'];
    const peer = req.socket.remoteAddress;
    if (typeof login !== 'string' || login === '') return undefined;
    if (peer === undefined || !SERVE_PEERS.includes(peer)) return undefined;
    return { via: 'tailnet', login };
  }

  // A valid setup cookie on any other admitted Host gives the loopback identity.
  private cookieIdentity(req: GuardRequest): Identity | undefined {
    const verified =
      this.signer.verify(
        cookieValue(req.headers.cookie, this.signer.cookieName()),
      ) !== undefined;
    return verified ? { via: 'loopback' } : undefined;
  }

  // The Origin must equal the origin of the admitted Host. An unknown Host has no origin, so it is refused.
  private checkOrigin(req: GuardRequest, entry: HostEntry | undefined): void {
    const expected = entry?.origin;
    if (expected === undefined || req.headers.origin !== expected) {
      throw new ModuleError(
        SETUP_AUTH_ERROR_CODES.ORIGIN_REJECTED,
        SETUP_AUTH_ERROR_STATUS.AUTH_ORIGIN_REJECTED,
        'Origin is not allowed for this request.',
      );
    }
  }
}
