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

// `filesRoutes` is the project-scoped `files` route. Its page loads lazily: this file has no static
// import of the page, so the main bundle does not carry it.
export const filesRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./files-page').then((feature) => feature.FilesPage),
  },
];

export { ActiveProjectNav } from './active-project-nav';
