import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  SecurityContext,
} from '@angular/core';
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
    provideAppInitializer(() => {
      inject(SSE_CLIENT).start();
    }),
  ],
};
