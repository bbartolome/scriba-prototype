// Red-run stubs: the names only. The behaviour comes in the implementation commit.
export const VERSION_PATH = '';

export const versionInfoCopy = {
  safeParse: (_data: unknown) => ({
    success: false as const,
    error: 'not implemented',
  }),
};

export const healthzCopy = {
  safeParse: (_data: unknown) => ({
    success: false as const,
    error: 'not implemented',
  }),
};
