import { Routes } from '@angular/router';
import { ChatPage } from './chat-page';

// The agent-loop feature's entry file. Other features import only from here (ESLint boundaries).
export const chatRoutes: Routes = [
  { path: '', pathMatch: 'full', component: ChatPage },
];
