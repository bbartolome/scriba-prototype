import { z } from 'zod';

// HTTP method convention for the whole API.
// Reads are GET and never mutate. Every command is POST.
// PUT, PATCH and DELETE are not used.
export const HTTP_METHOD_CONVENTION = { read: 'GET', command: 'POST' } as const;

export const HEALTHZ_ROUTE = '/healthz' as const;
export const VERSION_ROUTE = '/api/platform/version' as const;

// Response of GET /healthz.
export const healthzSchema = z.object({
  status: z.literal('ok'),
  version: z.string().min(1),
});

// Response of GET /api/platform/version.
// `version` is a baked semver or `0.0.0-dev`. `revision` is the git SHA.
// `composeVersion` is the compose version this image expects.
export const versionInfoSchema = z.object({
  version: z.string().min(1),
  revision: z.string().min(1),
  builtAt: z.string().min(1),
  composeVersion: z.number().int(),
});

export type Healthz = z.infer<typeof healthzSchema>;
export type VersionInfo = z.infer<typeof versionInfoSchema>;
