import { Injectable } from '@nestjs/common';
import {
  backendStateSchema,
  tailscaleStatusSchema,
  type TailscaleStatus,
} from '@bbartolome/scriba-contracts/setup-auth';
import { z } from 'zod';
import { LocalApiClient } from './localapi-client';

// The status read is reused for this long. Calls inside the window share one socket read.
export const TAILSCALE_STATUS_CACHE_MS = 2000;
// refresh() reads the socket again only when the last read started at least this long ago.
export const TAILSCALE_REFRESH_MIN_INTERVAL_MS = 1000;

const UNAVAILABLE: TailscaleStatus = {
  available: false,
  backendState: 'NoState',
};

// The LocalAPI payload, read by its own names. Every key is optional or nullable; unknown keys are ignored.
const localApiStatusSchema = z.object({
  BackendState: z.unknown().optional(),
  AuthURL: z.string().nullish(),
  Self: z
    .object({
      DNSName: z.string().nullish(),
      UserID: z.number().nullish(),
    })
    .nullish(),
  CurrentTailnet: z
    .object({
      MagicDNSEnabled: z.boolean().nullish(),
    })
    .nullish(),
  CertDomains: z.array(z.unknown()).nullish(),
  User: z
    .record(z.string(), z.object({ LoginName: z.string().nullish() }).nullish())
    .nullish(),
});

// Maps a raw LocalAPI payload to the normalised status. Any payload the rules refuse gives UNAVAILABLE.
export function normaliseLocalApiStatus(payload: unknown): TailscaleStatus {
  const parsed = localApiStatusSchema.safeParse(payload);
  if (!parsed.success) return UNAVAILABLE;
  const raw = parsed.data;

  const state = backendStateSchema.safeParse(raw.BackendState);
  if (!state.success) return UNAVAILABLE;

  const status: Record<string, unknown> = {
    available: true,
    backendState: state.data,
  };

  if (raw.AuthURL) status.authURL = raw.AuthURL;

  const dnsRaw = raw.Self?.DNSName;
  if (dnsRaw) {
    const dnsName = dnsRaw.endsWith('.') ? dnsRaw.slice(0, -1) : dnsRaw;
    status.dnsName = dnsName;
    status.tailnetURL = `https://${dnsName}`;
  }

  status.magicDNSEnabled = raw.CurrentTailnet?.MagicDNSEnabled === true;
  status.httpsCertsEnabled =
    Array.isArray(raw.CertDomains) && raw.CertDomains.length > 0;

  if (raw.Self && typeof raw.Self.UserID === 'number') {
    const login = raw.User?.[String(raw.Self.UserID)]?.LoginName;
    if (login) status.ownerLogin = login;
  }

  const checked = tailscaleStatusSchema.safeParse(status);
  return checked.success ? checked.data : UNAVAILABLE;
}

// Serves the normalised status. Reads are cached, and concurrent callers share one read.
@Injectable()
export class TailscaleStatusService {
  private current: Promise<TailscaleStatus> | undefined;
  private startedAt = Number.NEGATIVE_INFINITY;

  constructor(private readonly client: LocalApiClient) {}

  status(): Promise<TailscaleStatus> {
    if (this.fresh(TAILSCALE_STATUS_CACHE_MS))
      return this.current as Promise<TailscaleStatus>;
    return this.read();
  }

  // For the setup-auth guard (SAU-18): at most one socket read per TAILSCALE_REFRESH_MIN_INTERVAL_MS.
  refresh(): Promise<TailscaleStatus> {
    if (this.fresh(TAILSCALE_REFRESH_MIN_INTERVAL_MS))
      return this.current as Promise<TailscaleStatus>;
    return this.read();
  }

  private fresh(windowMs: number): boolean {
    return this.current !== undefined && Date.now() - this.startedAt < windowMs;
  }

  private read(): Promise<TailscaleStatus> {
    this.startedAt = Date.now();
    this.current = this.client
      .status()
      .then(normaliseLocalApiStatus, () => UNAVAILABLE);
    return this.current;
  }
}
