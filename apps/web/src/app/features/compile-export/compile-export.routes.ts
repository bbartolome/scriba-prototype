import { Routes } from '@angular/router';

// `manuscriptRoutes` is the project-scoped `manuscript` route. Its page loads lazily: this file has no
// static import of the page, so the main bundle does not carry it.
export const manuscriptRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./manuscript-page').then((feature) => feature.ManuscriptPage),
  },
];
