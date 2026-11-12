// Build values baked into the image (PLT-14 overwrites this file from build args). Dev values below.
export const BUILD_INFO = {
  version: '0.0.0-dev',
  revision: 'dev',
  builtAt: 'dev',
} as const;
