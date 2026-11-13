import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  SecurityContext,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideMarkdown, SANITIZE } from 'ngx-markdown';
import { APP_ROUTES } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(APP_ROUTES),
    provideHttpClient(),
    provideMarkdown({
      sanitize: { provide: SANITIZE, useValue: SecurityContext.HTML },
    }),
  ],
};
