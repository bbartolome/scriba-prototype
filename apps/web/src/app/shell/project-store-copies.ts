// Red-run stubs: the names only. The behaviour comes in the implementation commit.
export const ACTIVE_PROJECT_PATH = '';
export const PROJECTS_PATH = '';

export const activeProjectCopy = {
  safeParse: (_data: unknown) => ({
    success: false as const,
    error: 'not implemented',
  }),
};

export const projectListCopy = {
  safeParse: (_data: unknown) => ({
    success: false as const,
    error: 'not implemented',
  }),
};
