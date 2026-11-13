import { SetMetadata } from '@nestjs/common';

// Metadata key that marks a route as public. The global guard reads it.
export const PUBLIC_ROUTE_KEY = 'scriba:public-route';

// Marks a handler as reachable without a credential.
export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);
