import { Routes } from '@angular/router';
import { ToolsPreviewPage } from './tools-preview';

// The tool-registry feature's entry file. Other features import only from here (ESLint boundaries).
// `toolsRoutes` is the app-level `/tools` route: TRG-05 mounts the dev preview there, and TRG-13 extends it.
export const toolsRoutes: Routes = [{ path: '', component: ToolsPreviewPage }];

export {
  ToolForm,
  type ToolFormLayout,
  type ToolFormPortRow,
} from './tool-form';
