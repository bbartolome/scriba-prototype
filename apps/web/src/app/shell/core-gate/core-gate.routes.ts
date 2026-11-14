import { Routes } from '@angular/router';
import { CoreGatePage } from './core-gate';

export const coreGateRoutes: Routes = [
  { path: '', pathMatch: 'full', component: CoreGatePage },
];
