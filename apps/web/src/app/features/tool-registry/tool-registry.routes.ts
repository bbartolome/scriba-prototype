// The tool-registry feature's entry file. Other features import only from here (ESLint boundaries).
// It holds no routes yet: TRG-05 adds the dev route, and TRG-13 adds `toolsRoutes` for /tools.
export {
  ToolForm,
  type ToolFormLayout,
  type ToolFormPortRow,
} from './tool-form';
