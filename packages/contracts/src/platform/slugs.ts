// Module slugs shared by subpaths, API route prefixes (/api/<slug>/...) and the SSE envelope's `module`.
// `shell` and `genre-packs` have no API routes and publish no events.

export const MODULE_SLUGS = [
  'platform',
  'setup-auth',
  'providers',
  'project-store',
  'tool-registry',
  'agent-loop',
  'graph-runner',
  'compile-export',
  'shell',
  'genre-packs',
] as const;

export type ModuleSlug = (typeof MODULE_SLUGS)[number];

// Slugs allowed as the SSE envelope's `module`: the modules that publish events.
export const PUBLISHING_MODULE_SLUGS = [
  'platform',
  'setup-auth',
  'providers',
  'project-store',
  'tool-registry',
  'agent-loop',
  'graph-runner',
  'compile-export',
] as const;

export type PublishingModuleSlug = (typeof PUBLISHING_MODULE_SLUGS)[number];
