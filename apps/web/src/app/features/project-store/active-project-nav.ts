import {
  Component,
  DestroyRef,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { ActiveProjectSignal } from '../../shell/project-scope';
import { ProjectsState } from './projects-state';

/**
 * The active project in the Shell's nav slot, as read-only text: its title, or its id when it has no
 * title. It renders nothing when no project is active, when the list has not been read, or when the
 * last read failed. On a project URL it reads the list, unless a read has been made in this tab already.
 */
@Component({
  selector: 'app-active-project-nav',
  styles: `
    :host {
      display: flex;
      align-items: center;
      min-width: 0;
    }

    span {
      min-width: 0;
      max-width: 9rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
    }
  `,
  template: `
    @if (label(); as text) {
      <span>{{ text }}</span>
    }
  `,
})
export class ActiveProjectNav {
  private readonly state = inject(ProjectsState);
  private readonly route = inject(ActiveProjectSignal);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly label = this.state.activeLabel;

  constructor() {
    effect(() => {
      const projectId = this.route.projectId();
      if (projectId !== undefined && !this.state.requested()) {
        untracked(() => this.state.read(this.destroyRef));
      }
    });
  }
}
