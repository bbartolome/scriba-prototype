import { watch, type FSWatcher } from 'node:fs';
import {
  Inject,
  Injectable,
  type BeforeApplicationShutdown,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import {
  EventsPublisher,
  SCRIBA_ENV,
  type ScribaEnv,
} from '../platform/platform.module';
import { ProjectStoreService } from './project-store.service';
import { ProjectsService } from './projects.service';

// The trailing window of the debounce (PST-19 D6). Each fs event restarts it.
const DEBOUNCE_MS = 200;

// The watch of one project folder. paths collects the project-relative names of the open batch.
interface ProjectWatch {
  projectId: string;
  root: string;
  watcher?: FSWatcher;
  timer?: NodeJS.Timeout;
  paths: Set<string>;
}

// Watches the active project's folder and publishes files-changed for host edits (PST-19). It refreshes the UI
// and re-checks pending conflicts; correctness never depends on it.
@Injectable()
export class ProjectWatcherService
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  private current: ProjectWatch | undefined;

  constructor(
    @Inject(SCRIBA_ENV) private readonly env: ScribaEnv,
    private readonly store: ProjectStoreService,
    private readonly projects: ProjectsService,
    private readonly events: EventsPublisher,
  ) {
    if (!this.env.SCRIBA_WATCHER) return;
    // A handler must not throw, because a throw fails the switch (PST-16 D17, F11), so every error is ignored.
    this.store.onProjectSwitched((event) => {
      try {
        this.start(event.to);
      } catch {
        // Ignored on purpose: the switch succeeds without a watcher.
      }
    });
  }

  // Starts the watcher for the active project at boot (PST-19 R6). A failure leaves the app without a watcher.
  onApplicationBootstrap(): void {
    if (!this.env.SCRIBA_WATCHER) return;
    try {
      const activeId = this.store.activeId();
      if (activeId !== null) this.start(activeId);
    } catch {
      // Ignored on purpose: the app boots without a watcher.
    }
  }

  // Closes the watcher at shutdown (PST-19 D1).
  beforeApplicationShutdown(): void {
    this.stop();
  }

  // Stops the current watch, then watches the folder of an ok project. Nothing is watched for another status.
  private start(projectId: string): void {
    this.stop();
    const project = this.projects.find(projectId);
    if (project === undefined || project.yaml.status !== 'ok') return;
    const state: ProjectWatch = {
      projectId,
      root: project.root,
      paths: new Set<string>(),
    };
    let watcher: FSWatcher;
    try {
      watcher = watch(
        project.root,
        { recursive: true },
        (_eventType, filename) => this.onChange(state, filename),
      );
    } catch {
      return;
    }
    // An unhandled 'error' of an FSWatcher would end the process, so the error closes this watch.
    watcher.on('error', () => {
      if (this.current === state) this.stop();
    });
    state.watcher = watcher;
    this.current = state;
  }

  // Adds a changed path to the open batch and restarts the debounce window (PST-19 D5, D6).
  private onChange(state: ProjectWatch, filename: string | null): void {
    if (filename === null || this.current !== state) return;
    const segments = filename.split('/');
    if (segments.some((segment) => segment.startsWith('.'))) return;
    try {
      this.store.resolvePath(state.root, filename);
    } catch {
      return;
    }
    state.paths.add(filename);
    if (state.timer !== undefined) clearTimeout(state.timer);
    state.timer = setTimeout(() => this.flush(state), DEBOUNCE_MS);
  }

  // Publishes the batch once, sorted and unique, then notifies the in-process handlers (PST-19 D4).
  private flush(state: ProjectWatch): void {
    state.timer = undefined;
    if (state.paths.size === 0) return;
    const paths = [...state.paths].sort();
    state.paths.clear();
    this.events.publish({
      module: 'project-store',
      type: 'files-changed',
      data: { projectId: state.projectId, paths },
    });
    try {
      this.store.notifyFilesChanged({ projectId: state.projectId, paths });
    } catch {
      // Ignored on purpose: a later handler must not stop the watcher.
    }
  }

  // Closes the current watch and drops its batch.
  private stop(): void {
    const state = this.current;
    if (state === undefined) return;
    this.current = undefined;
    if (state.timer !== undefined) clearTimeout(state.timer);
    state.timer = undefined;
    state.paths.clear();
    try {
      state.watcher?.close();
    } catch {
      // Ignored on purpose: the watch is dropped either way.
    }
  }
}
