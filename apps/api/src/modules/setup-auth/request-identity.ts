import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Identity } from '@bbartolome/scriba-contracts/setup-auth';

// The identity the guard attached to this request, or undefined on a public route with no valid cookie.
export const RequestIdentity = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Identity | undefined =>
    context.switchToHttp().getRequest<{ identity?: Identity }>().identity,
);
