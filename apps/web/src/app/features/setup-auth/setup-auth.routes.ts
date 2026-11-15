import { Routes } from '@angular/router';
import { SettingsPage } from './settings-page';
import { SetupPage } from './setup-page';

export const setupRoutes: Routes = [
  { path: '', pathMatch: 'full', component: SetupPage },
];

export const settingsRoutes: Routes = [
  { path: '', pathMatch: 'full', component: SettingsPage },
];
