import { Component, inject } from '@angular/core';
import {
  MatButtonToggle,
  MatButtonToggleGroup,
} from '@angular/material/button-toggle';
import { ThemeService } from './theme';

/**
 * The theme toggle: System, Light or Dark, stored on this device. It sets no
 * position of its own; the page that embeds it places it.
 */
@Component({
  imports: [MatButtonToggleGroup, MatButtonToggle],
  selector: 'app-theme-toggle',
  template: `
    <mat-button-toggle-group
      aria-label="Theme"
      [value]="theme.choice()"
      (change)="theme.set($event.value)"
    >
      <mat-button-toggle value="system">System</mat-button-toggle>
      <mat-button-toggle value="light">Light</mat-button-toggle>
      <mat-button-toggle value="dark">Dark</mat-button-toggle>
    </mat-button-toggle-group>
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
}
