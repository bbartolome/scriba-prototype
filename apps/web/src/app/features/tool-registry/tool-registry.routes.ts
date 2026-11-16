import { Routes } from '@angular/router';
import { ToolsListPage } from './tools-list';

// The tool-registry feature's entry file. Other features import only from here (ESLint boundaries).
// `toolsRoutes` is the app-level `/tools` route: the Tools list (TRG-13), whose detail holds the TRG-05 preview.
export const toolsRoutes: Routes = [{ path: '', component: ToolsListPage }];

export {
  ToolForm,
  type ToolFormLayout,
  type ToolFormPortRow,
} from './tool-form';
