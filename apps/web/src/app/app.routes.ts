import { Routes } from '@angular/router';
import { activeProjectGuard } from './shell/active-project-guard';
import { withDeviceGate } from './shell/device-class';
import { NotFoundPage } from './shell/not-found';
import type { ShellRouteData } from './shell/route-data';

/**
 * Project-scoped routes. Features append their entries here, under
 * `projects/:projectId/`. Each entry loads only its own export.
 */
export const PROJECT_ROUTES: Routes = [
  {
    path: 'chat',
    pathMatch: 'full',
    data: {
      scope: 'project',
      minDeviceClass: 'phone',
      nav: { label: 'Chat', icon: 'chat', order: 10 },
    } satisfies ShellRouteData,
    loadChildren: () =>
      import('./features/agent-loop/agent-loop.routes').then(
        (feature) => feature.chatRoutes,
      ),
  },
  {
    path: 'files',
    pathMatch: 'full',
    data: {
      scope: 'project',
      minDeviceClass: 'phone',
      nav: { label: 'Files', icon: 'folder', order: 30 },
    } satisfies ShellRouteData,
    loadChildren: () =>
      import('./features/project-store/project-store.routes').then(
        (feature) => feature.filesRoutes,
      ),
  },
];

/**
 * The root route table. App-level feature entries go above the `**` entry;
 * each owned path uses `pathMatch: 'full'` unless it has a child route.
 */
export const APP_ROUTES: Routes = withDeviceGate([
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./shell/landing').then((feature) => feature.LandingPage),
  },
  {
    path: 'projects/:projectId/switch',
    pathMatch: 'full',
    loadComponent: () =>
      import('./shell/switch-project').then(
        (feature) => feature.SwitchProjectPage,
      ),
  },
  {
    path: 'projects/:projectId',
    canActivate: [activeProjectGuard],
    children: [...PROJECT_ROUTES, { path: '**', component: NotFoundPage }],
  },
  {
    path: 'core-gate',
    pathMatch: 'full',
    data: {
      scope: 'app',
      minDeviceClass: 'phone',
      nav: { label: 'Core gate', icon: 'science', order: 100 },
    } satisfies ShellRouteData,
    loadChildren: () =>
      import('./shell/core-gate/core-gate.routes').then(
        (feature) => feature.coreGateRoutes,
      ),
  },
  {
    path: 'setup',
    pathMatch: 'full',
    data: {
      scope: 'app',
      minDeviceClass: 'phone',
    } satisfies ShellRouteData,
    loadChildren: () =>
      import('./features/setup-auth/setup-auth.routes').then(
        (feature) => feature.setupRoutes,
      ),
  },
  {
    path: 'settings',
    pathMatch: 'full',
    data: {
      scope: 'app',
      minDeviceClass: 'phone',
      nav: { label: 'Settings', icon: 'settings', order: 90 },
    } satisfies ShellRouteData,
    loadChildren: () =>
      import('./features/setup-auth/setup-auth.routes').then(
        (feature) => feature.settingsRoutes,
      ),
  },
  {
    path: 'projects',
    pathMatch: 'full',
    data: {
      scope: 'app',
      minDeviceClass: 'phone',
      nav: { label: 'Projects', icon: 'library_books', order: 20 },
    } satisfies ShellRouteData,
    loadChildren: () =>
      import('./features/project-store/project-store.routes').then(
        (feature) => feature.projectsRoutes,
      ),
  },
  { path: '**', component: NotFoundPage },
]);
