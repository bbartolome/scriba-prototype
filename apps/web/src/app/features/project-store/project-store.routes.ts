import { Routes } from '@angular/router';

// The project-store feature's entry file. Other code imports only from here (ESLint boundaries).
// `projectsRoutes` is the app-level `/projects` route; `ActiveProjectNav` fills the Shell's nav slot.
export const projectsRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./project-picker').then((feature) => feature.ProjectPicker),
  },
];

export { ActiveProjectNav } from './active-project-nav';
