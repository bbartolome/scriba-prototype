import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { ActiveProjectNav } from './features/project-store/project-store.routes';
import { AppNav } from './shell/app-nav';
import { ConnectionStatus } from './shell/connection-status';
import { DeviceClassService } from './shell/device-class';
import { NoticeBanners } from './shell/notice-banners';
import { ProjectSwitchFollow } from './shell/project-switch-follow';
import { ThemeService } from './shell/theme';
import { ThemeToggle } from './shell/theme-toggle';

@Component({
  imports: [
    MatToolbar,
    RouterOutlet,
    ConnectionStatus,
    NoticeBanners,
    AppNav,
    ActiveProjectNav,
    ThemeToggle,
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  // Starts the theme service, so the stored choice applies before the first render.
  private readonly theme = inject(ThemeService);
  // Starts the device-class service at load, and drives the layout class.
  protected readonly devices = inject(DeviceClassService);
  // Starts the follower of project-switched events, so project tabs move with the server.
  private readonly projectSwitch = inject(ProjectSwitchFollow);
}
