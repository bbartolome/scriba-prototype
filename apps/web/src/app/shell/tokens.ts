import { inject, InjectionToken } from '@angular/core';
import { HttpApiClient, type ApiClient } from './api-client';

/** The typed API client. Root-provided by default; tests replace it with a fake. */
export const API_CLIENT = new InjectionToken<ApiClient>('API_CLIENT', {
  providedIn: 'root',
  factory: () => inject(HttpApiClient),
});

/** Placeholder for the SSE client. SHL-03 provides it. */
export const SSE_CLIENT = new InjectionToken<unknown>('SSE_CLIENT');
