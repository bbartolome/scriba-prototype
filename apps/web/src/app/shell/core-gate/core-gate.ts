import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { EditorLayout } from '../editor-layout';

@Component({
  selector: 'app-core-gate',
  imports: [EditorLayout],
  template: `
    <h2>Core gate</h2>
    <p>
      A dummy lazy feature. It shows the registration pattern and its own chunk.
    </p>
    @if (reference(); as ref) {
      <app-editor-layout [reference]="ref" />
    }
  `,
})
export class CoreGatePage {
  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap);
  protected readonly reference = computed(() => {
    const params = this.query();
    const projectId = params?.get('projectId');
    const path = params?.get('path');
    return projectId && path ? { projectId, path } : null;
  });
}
