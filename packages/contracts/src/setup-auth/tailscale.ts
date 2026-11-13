import { z } from 'zod';

// Backend states as tailscaled names them.
export const BACKEND_STATES = [
  'NoState',
  'NeedsLogin',
  'NeedsMachineAuth',
  'Stopped',
  'Starting',
  'Running',
] as const;

export const backendStateSchema = z.enum(BACKEND_STATES);

// A tailnet name with no trailing dot: non-empty labels separated by single dots, with no whitespace.
const DNS_NAME_PATTERN = /^[^\s.]+(\.[^\s.]+)*$/;

// Normalised Tailscale status. When Tailscale is not available, backendState is NoState.
export const tailscaleStatusSchema = z.object({
  available: z.boolean(),
  backendState: backendStateSchema,
  authURL: z.url().optional(),
  dnsName: z.string().regex(DNS_NAME_PATTERN).optional(),
  tailnetURL: z.url().optional(),
  magicDNSEnabled: z.boolean().optional(),
  httpsCertsEnabled: z.boolean().optional(),
  ownerLogin: z.string().optional(),
});

export type BackendState = z.infer<typeof backendStateSchema>;
export type TailscaleStatus = z.infer<typeof tailscaleStatusSchema>;
