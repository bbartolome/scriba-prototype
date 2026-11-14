import { Component, input } from '@angular/core';
import type { ToolCallView } from './tool-call-view';

/** Stub for the red step. The real card replaces it in the green step. */
@Component({
  selector: 'app-tool-call-card',
  template: '',
})
export class ToolCallCard {
  /** The call to show. */
  readonly call = input.required<ToolCallView>();
}
