import { Routes } from '@angular/router';
import { withDeviceGate } from './shell/device-class';
import { LandingPage } from './shell/landing';
import { NotFoundPage } from './shell/not-found';

/**
 * Project-scoped routes. Features append their entries here, under
 * `projects/:projectId/`. Each entry loads only its own export.
 */
export const PROJECT_ROUTES: Routes = [];

/**
 * The root route table. App-level feature entries go above the `**` entry;
 * each owned path uses `pathMatch: 'full'` unless it has a child route.
 */
export const APP_ROUTES: Routes = withDeviceGate([
  { path: '', pathMatch: 'full', component: LandingPage },
  {
    path: 'projects/:projectId',
    children: [...PROJECT_ROUTES, { path: '**', component: NotFoundPage }],
  },
  { path: '**', component: NotFoundPage },
]);
