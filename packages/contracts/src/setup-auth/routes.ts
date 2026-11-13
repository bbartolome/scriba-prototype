import { z } from 'zod';

// Route constants of the setup-auth API. Every path is under /api/setup-auth/.
export const SETUP_STATUS_ROUTE = '/api/setup-auth/status' as const;
export const SETUP_CONTINUE_ROUTE = '/api/setup-auth/continue' as const;
// `:step` is one of SETUP_STEP_KEYS.
export const SETUP_STEP_ROUTE = '/api/setup-auth/steps/:step' as const;
export const HANDSHAKE_ROUTE = '/api/setup-auth/handshake' as const;
export const IDENTITY_ROUTE = '/api/setup-auth/identity' as const;
export const SIGN_OUT_ROUTE = '/api/setup-auth/sign-out' as const;
export const TAILSCALE_STATUS_ROUTE =
  '/api/setup-auth/tailscale/status' as const;
export const ALLOWLIST_ROUTE = '/api/setup-auth/allowlist' as const;
export const PREFERENCES_ROUTE = '/api/setup-auth/preferences' as const;

// Response of the handshake: a redirect with this status and this Referrer-Policy.
export const HANDSHAKE_REDIRECT_STATUS = 303 as const;
export const HANDSHAKE_REFERRER_POLICY = 'no-referrer' as const;

// Redirect targets. The handshake goes to SETUP_PAGE_PATH until setup is complete, then to LANDING_PATH.
export const SETUP_PAGE_PATH = '/setup' as const;
export const LANDING_PATH = '/' as const;

// Query of GET /api/setup-auth/handshake.
export const handshakeQuerySchema = z.object({
  token: z.string().min(1),
});

export type HandshakeQuery = z.infer<typeof handshakeQuerySchema>;
