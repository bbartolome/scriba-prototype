import { InjectionToken } from '@angular/core';

/** Placeholder for the typed API client. SHL-02 provides it. */
export const API_CLIENT = new InjectionToken<unknown>('API_CLIENT');

/** Placeholder for the SSE client. SHL-03 provides it. */
export const SSE_CLIENT = new InjectionToken<unknown>('SSE_CLIENT');
