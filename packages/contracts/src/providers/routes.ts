// Route constants of the providers API. Every path is under /api/providers/.
// Commands are POST. `:id` is a provider id.
export const PROVIDERS_ROUTE = '/api/providers' as const;
export const PRESETS_ROUTE = '/api/providers/presets' as const;
export const APP_DEFAULT_ROUTE = '/api/providers/app-default' as const;
export const PROVIDER_UPDATE_ROUTE = '/api/providers/:id/update' as const;
export const PROVIDER_DELETE_ROUTE = '/api/providers/:id/delete' as const;
export const MODELS_ROUTE = '/api/providers/:id/models' as const;
export const KEY_SET_ROUTE = '/api/providers/key/set' as const;
export const KEY_CLEAR_ROUTE = '/api/providers/key/clear' as const;
export const CONNECTION_TEST_ROUTE = '/api/providers/test' as const;
export const EFFECTIVE_MODEL_ROUTE = '/api/providers/effective-model' as const;
export const PROJECT_MODEL_ROUTE = '/api/providers/project-model' as const;
export const PROJECT_MODEL_CLEAR_ROUTE =
  '/api/providers/project-model/clear' as const;
