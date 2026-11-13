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
  type RequestPolicy,
} from './request-policy';
import { cookieValue } from './setup-session.cookie';

// The parts of the request that the guard reads and the identity it attaches.
interface GuardRequest {
  method: string;
  originalUrl: string;
  headers: { host?: string; origin?: string; cookie?: string };
  identity?: Identity;
}

// Methods that never change state. Every other method is a mutation.
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// The global default-deny guard (APP_GUARD). A route is public only with @Public() or on /healthz.
// Every other route needs a valid setup cookie. Every mutation needs the Origin of its own Host, public or not.
@Injectable()
export class SetupAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly signer: SetupCookieSigner,
    @Inject(REQUEST_POLICY) private readonly policy: RequestPolicy,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<GuardRequest>();
    const isPublic =
      requestPath(req.originalUrl) === HEALTHZ_ROUTE ||
      this.reflector.getAllAndOverride<boolean | undefined>(PUBLIC_ROUTE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true;
    const verified =
      this.signer.verify(
        cookieValue(req.headers.cookie, this.signer.cookieName()),
      ) !== undefined;
    if (verified) req.identity = { via: 'loopback' };
    if (!isPublic && !verified) {
      throw new ModuleError(
        SETUP_AUTH_ERROR_CODES.REQUIRED,
        SETUP_AUTH_ERROR_STATUS.AUTH_REQUIRED,
        'Sign in to continue.',
      );
    }
    if (!SAFE_METHODS.includes(req.method)) {
      const expected = this.policy.originFor(req.headers.host);
      if (expected === undefined || req.headers.origin !== expected) {
        throw new ModuleError(
          SETUP_AUTH_ERROR_CODES.ORIGIN_REJECTED,
          SETUP_AUTH_ERROR_STATUS.AUTH_ORIGIN_REJECTED,
          'Origin is not allowed for this request.',
        );
      }
    }
    return true;
  }
}
