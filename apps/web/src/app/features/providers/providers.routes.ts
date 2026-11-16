import { Routes } from '@angular/router';

// The providers feature's entry file. Other features import only from here (ESLint boundaries).
// `providersRoutes` is the app-level `/providers` route. Its page loads lazily: this file has no
// static import of the page, so the main bundle does not carry it.
export const providersRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./providers-page').then((feature) => feature.ProvidersPage),
  },
];

export { ProvidersPanel } from './providers-panel';
