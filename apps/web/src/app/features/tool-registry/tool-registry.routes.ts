import { Routes } from '@angular/router';
import { unsavedTextGuard } from '../../shell';
import { ToolsListPage } from './tools-list';

// The tool-registry feature's entry file. Other features import only from here (ESLint boundaries).
// `toolsRoutes` is the app-level `/tools` route: the Tools list (TRG-13), whose detail holds the TRG-05 preview,
// the YAML editor and the actions Customize, Revert, New, Duplicate and Delete (TRG-14). Leaving it asks
// when the editor holds unsaved text.
export const toolsRoutes: Routes = [
  {
    path: '',
    component: ToolsListPage,
    canDeactivate: [unsavedTextGuard],
  },
];

export {
  ToolForm,
  type ToolFormLayout,
  type ToolFormPortRow,
} from './tool-form';
export { EntityPicker } from './entity-picker';
