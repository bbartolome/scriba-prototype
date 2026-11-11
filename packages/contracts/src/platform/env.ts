// SCRIBA_* environment names and their defaults. Parse rules belong to the API composition root (PLT-04).
// A `null` value means the installer stamps the value. TS_* (Tailscale) variables are compose-only and are not listed here.
export const SCRIBA_ENV_DEFAULTS = {
  // compose / .env -> app
  SCRIBA_PORT: '8080', // host loopback publish port; the app always listens on 8080 inside the container
  SCRIBA_UID: '1000', // host UID for `user:`
  SCRIBA_GID: '1000', // host GID for `user:`
  SCRIBA_LIBRARY: '~/Books', // host library path (absolute), bind-mounted to /books
  SCRIBA_IMAGE_TAG: 'latest', // image tag; pinning means a semver here
  SCRIBA_COMPOSE_VERSION: null, // .env -> app; stamped by the installer (integer)
  // app
  SCRIBA_BOOKS_DIR: '/books',
  SCRIBA_PACKS_DIR: '/opt/scriba/packs',
  SCRIBA_EXAMPLES_DIR: '/opt/scriba/examples',
  SCRIBA_TS_SOCKET: '/var/run/tailscale/tailscaled.sock',
  SCRIBA_WATCHER: 'true',
  SCRIBA_DEV_ORIGINS: '', // app (dev only); never set in the image
  SCRIBA_SETUP_URL_BASE: 'http://127.0.0.1:${SCRIBA_PORT}', // template kept as text
  SCRIBA_LOG_LEVEL: 'info',
} as const;

export type ScribaEnvName = keyof typeof SCRIBA_ENV_DEFAULTS;
