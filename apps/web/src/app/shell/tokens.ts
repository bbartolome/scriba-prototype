import { inject, InjectionToken } from '@angular/core';
import { HttpApiClient, type ApiClient } from './api-client';
import type { SseClient } from './sse-client';

/** The typed API client. Root-provided by default; tests replace it with a fake. */
export const API_CLIENT = new InjectionToken<ApiClient>('API_CLIENT', {
  providedIn: 'root',
  factory: () => inject(HttpApiClient),
});

/** The SSE client. SHL-03 provides it in app.config.ts. */
export const SSE_CLIENT = new InjectionToken<SseClient>('SSE_CLIENT');
