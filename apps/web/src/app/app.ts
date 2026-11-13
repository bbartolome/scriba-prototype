import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { NoticeBanners } from './shell/notice-banners';
import { ThemeService } from './shell/theme';
import { ThemeToggle } from './shell/theme-toggle';

@Component({
  imports: [MatToolbar, RouterOutlet, NoticeBanners, ThemeToggle],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  // Starts the theme service, so the stored choice applies before the first render.
  private readonly theme = inject(ThemeService);
}
