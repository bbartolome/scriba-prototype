import { Routes } from '@angular/router';
import { deviceClassGuard } from '../../shell';

// The graph-runner feature's entry file. Other code imports only from here (ESLint boundaries).
// `graphsRoutes` is the project-scoped `graphs` route. Its pages load lazily: this file has no static
// import of them, so the main bundle does not carry them.
export const graphsRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./graph-list-page').then((feature) => feature.GraphListPage),
  },
  {
    // The canvas needs a tablet or a larger screen; a phone gets the larger-screen page at this URL.
    path: ':graphId',
    canMatch: [deviceClassGuard('tablet')],
    loadComponent: () =>
      import('./canvas-placeholder-page').then(
        (feature) => feature.CanvasPlaceholderPage,
      ),
  },
];
