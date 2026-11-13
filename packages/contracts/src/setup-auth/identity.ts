import { z } from 'zod';

// Who the caller is. A loopback caller has no login. A tailnet caller has the login from the Tailscale identity header.
// The identity is for display and logs only. It never partitions data.
export const identitySchema = z.discriminatedUnion('via', [
  z.object({ via: z.literal('loopback') }),
  z.object({ via: z.literal('tailnet'), login: z.string().min(1) }),
]);

export type Identity = z.infer<typeof identitySchema>;
