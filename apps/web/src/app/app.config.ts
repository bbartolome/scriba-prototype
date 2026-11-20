import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  SecurityContext,
} from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { provideRouter } from '@angular/router';
import { provideMarkdown, SANITIZE } from 'ngx-markdown';
import { APP_ROUTES } from './app.routes';
import { SseClient } from './shell/sse-client';
import { SSE_CLIENT } from './shell/tokens';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(APP_ROUTES),
    provideHttpClient(),
    provideMarkdown({
      sanitize: { provide: SANITIZE, useValue: SecurityContext.HTML },
    }),
    { provide: SSE_CLIENT, useClass: SseClient },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppInitializer(() => {
      inject(SSE_CLIENT).start();
    }),
  ],
};
